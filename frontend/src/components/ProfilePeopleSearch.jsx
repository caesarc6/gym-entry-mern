import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import debounce from "lodash/debounce";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeColors } from "../hooks/useThemeColors";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useProductStore } from "../store/product";
import ProfileAvatar from "./ProfileAvatar";
import { LoadingIndicator } from "./loading";
import {
  graphemeLength,
  MIN_PEOPLE_SEARCH_CHARS,
} from "../utils/graphemeLength";

/**
 * Quiet people search for the native Profile tab header (leading / top-left).
 * Icon opens a restrained sheet — no discovery feed chrome.
 */
export default function ProfilePeopleSearch({ iconBtnClass }) {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const colors = useThemeColors();
  const currentUser = useProductStore((s) => s.currentUser);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const sheetRef = useRef(null);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setIsSearching(false);
    setHasSearched(false);
  }, []);

  const runSearch = useRef(
    debounce(async (value) => {
      const normalized = String(value || "").normalize("NFC").trim();
      if (graphemeLength(normalized) < MIN_PEOPLE_SEARCH_CHARS) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await apiClient.get(
          API_ENDPOINTS.SEARCH_USERS(normalized),
        );
        setResults(response.data?.data || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 280),
  );

  useEffect(() => {
    const debounced = runSearch.current;
    return () => {
      debounced.cancel?.();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event) => {
      if (event.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeSearch]);

  const onQueryChange = (value) => {
    setQuery(value);
    const normalized = String(value || "").normalize("NFC").trim();
    if (graphemeLength(normalized) < MIN_PEOPLE_SEARCH_CHARS) {
      runSearch.current.cancel?.();
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }
    setHasSearched(false);
    setIsSearching(true);
    runSearch.current(value);
  };

  const openProfile = (user) => {
    const path =
      currentUser && user.uid === currentUser.uid
        ? "/profile"
        : `/user/${user.uid}`;
    closeSearch();
    navigate(path);
  };

  const sheetSurface =
    currentTheme === "light"
      ? "border-zinc-200/90 bg-zinc-50 text-zinc-900"
      : currentTheme === "dark-blue"
        ? "border-blue-300/10 bg-zinc-950 text-blue-50"
        : "border-white/10 bg-neutral-950 text-zinc-100";

  const inputSurface =
    currentTheme === "light"
      ? "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
      : "border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500";

  const sheet = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Search people"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Dismiss search"
            onClick={closeSearch}
          />
          <div
            ref={sheetRef}
            className={cn(
              "relative z-[1] mx-auto w-full max-w-lg border-b px-4 pb-3 pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] shadow-lg",
              sheetSurface,
            )}
          >
            <div className="flex items-center gap-2 py-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2",
                  inputSurface,
                )}
              >
                <FiSearch
                  className="h-4 w-4 shrink-0 opacity-60"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Name or username"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                  aria-label="Search by name or username"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => onQueryChange("")}
                    className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100"
                    aria-label="Clear"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className={cn(
                  "shrink-0 px-2 text-[15px] font-medium",
                  currentTheme === "light"
                    ? "text-zinc-600"
                    : "text-zinc-300",
                )}
              >
                Cancel
              </button>
            </div>

            <div className="max-h-[min(52vh,420px)] overflow-y-auto">
              {graphemeLength(query) < MIN_PEOPLE_SEARCH_CHARS ? (
                <p
                  className="px-1 py-3 text-center text-[13px]"
                  style={{ color: colors.textMuted }}
                >
                  Type at least 2 characters
                </p>
              ) : isSearching && !hasSearched ? (
                <div className="flex justify-center py-6">
                  <LoadingIndicator variant="micro" />
                </div>
              ) : results.length > 0 ? (
                <ul className="py-1">
                  {results.map((user) => (
                    <li key={user.uid}>
                      <button
                        type="button"
                        onClick={() => openProfile(user)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
                          currentTheme === "light"
                            ? "hover:bg-zinc-200/70"
                            : "hover:bg-white/8",
                        )}
                      >
                        <ProfileAvatar
                          src={user.picture}
                          name={user.name || user.username}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[15px] font-medium"
                            style={{ color: colors.textPrimary }}
                          >
                            {user.name || "User"}
                          </span>
                          {user.username ? (
                            <span
                              className="block truncate text-[13px]"
                              style={{ color: colors.textMuted }}
                            >
                              @{user.username}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : hasSearched ? (
                <p
                  className="px-1 py-3 text-center text-[13px]"
                  style={{ color: colors.textMuted }}
                >
                  No people found
                </p>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search people"
        className={iconBtnClass}
      >
        <FiSearch className="h-5 w-5" />
      </button>
      {sheet}
    </>
  );
}
