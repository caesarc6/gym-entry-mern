import { useCallback, useEffect, useRef } from "react";
import { useProductStore } from "../store/product";

/**
 * Keep a page's local post array aligned with likes, edits, and deletes
 * that land in the shared Zustand copy.
 *
 * `countUnloadedOwner` also adjusts totals when one of this profile's posts
 * is removed somewhere else and is not in the posts currently on screen.
 */
export function useMirrorPostList({
  entries,
  setEntries,
  onRemove,
  ownerUid,
  countUnloadedOwner = false,
}) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const setEntriesRef = useRef(setEntries);
  setEntriesRef.current = setEntries;
  const ownerUidRef = useRef(ownerUid);
  ownerUidRef.current = ownerUid;
  const countUnloadedRef = useRef(countUnloadedOwner);
  countUnloadedRef.current = countUnloadedOwner;
  const handledRemovalsRef = useRef(new Set());

  const syncFromList = useCallback((list) => {
    entriesRef.current = list || [];
  }, []);

  const dropIfPresent = useCallback((id, snapOwner) => {
    const key = String(id);
    if (handledRemovalsRef.current.has(key)) return false;

    const current = entriesRef.current || [];
    const inList = current.some((entry) => String(entry._id) === key);
    const ownerMatches =
      Boolean(countUnloadedRef.current) &&
      ownerUidRef.current &&
      snapOwner &&
      String(ownerUidRef.current) === String(snapOwner);
    if (!inList && !ownerMatches) return false;

    handledRemovalsRef.current.add(key);
    if (inList) {
      const next = current.filter((entry) => String(entry._id) !== key);
      entriesRef.current = next;
      setEntriesRef.current(next);
    }
    if (inList || ownerMatches) onRemoveRef.current?.(key);
    return true;
  }, []);

  useEffect(() => {
    return useProductStore.subscribe((state, prev) => {
      if (state.postSnapshots === prev.postSnapshots) return;
      const previous = prev.postSnapshots || {};
      const snaps = state.postSnapshots || {};
      for (const id of Object.keys(snaps)) {
        const snap = snaps[id];
        if (!snap || snap === previous[id]) continue;
        if (snap.removed) {
          dropIfPresent(id, snap.ownerUid);
          continue;
        }
        if (!snap.fields) continue;
        const current = entriesRef.current || [];
        let changed = false;
        const next = current.map((entry) => {
          if (String(entry._id) !== id) return entry;
          changed = true;
          return { ...entry, ...snap.fields };
        });
        if (!changed) continue;
        entriesRef.current = next;
        setEntriesRef.current(next);
      }
    });
  }, [dropIfPresent]);

  return { syncFromList, dropIfPresent, entriesRef };
}
