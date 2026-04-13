import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  HStack,
  IconButton,
  Image,
  Input,
  PortalManager,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { Hero } from "../components/Hero";
import { HomeLandingSections } from "../components/HomeLandingSections";
import ProductCard from "../components/ProductCard";
import PaginationComponent from "../components/Pagination";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import {
  hexToHslTriplet,
  hslTripletToHex,
  tokensToStyleObject,
} from "../lib/hslCssTokens";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { useThemeColors } from "../hooks/useThemeColors";

const STORAGE_KEY = "gym-theme-playground-v1";

const DEMO_UID_A = "theme-playground-user-a";
const DEMO_UID_B = "theme-playground-user-b";
const DEMO_UID_C = "theme-playground-user-c";

/** Sample post images (Unsplash) — same pattern as real feed photo URLs */
const MOCK_POST_IMAGE_GYM =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1600&auto=format&fit=crop";
const MOCK_POST_IMAGE_BARBELL =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop";
const MOCK_POST_IMAGE_ROW =
  "https://images.unsplash.com/photo-1593079831268-3381b0ddb4d2?q=80&w=1600&auto=format&fit=crop";

const MOCK_WORKOUT_ENTRIES = [
  {
    _id: "theme-playground-entry-1",
    name: "Upper · Push",
    description:
      "Bench press 4×8 @ RPE 8\nIncline DB press 3×10\nCable fly 3×12",
    image: MOCK_POST_IMAGE_GYM,
    likes: [],
    comments: [
      { text: "Solid session!", createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
    ownerId: DEMO_UID_A,
    uid: DEMO_UID_A,
  },
  {
    _id: "theme-playground-entry-2",
    name: "Leg day",
    description: "Back squat 5×5\nRomanian deadlift 3×8\nLeg curl 3×12",
    image: MOCK_POST_IMAGE_BARBELL,
    likes: [DEMO_UID_B],
    comments: [],
    createdAt: new Date().toISOString(),
    ownerId: DEMO_UID_B,
    uid: DEMO_UID_B,
  },
  {
    _id: "theme-playground-entry-3",
    name: "Pull · Rows & arms",
    description:
      "Pendlay row 4×6\nCable row 3×12\nHammer curl 3×12",
    image: MOCK_POST_IMAGE_ROW,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
    ownerId: DEMO_UID_C,
    uid: DEMO_UID_C,
  },
];

function buildDemoProfileCache() {
  const m = new Map();
  m.set(DEMO_UID_A, {
    uid: DEMO_UID_A,
    profileImage: "",
    displayName: "Alex",
    isUsername: true,
  });
  m.set(DEMO_UID_B, {
    uid: DEMO_UID_B,
    profileImage: "",
    displayName: "Jordan",
    isUsername: false,
  });
  m.set(DEMO_UID_C, {
    uid: DEMO_UID_C,
    profileImage: "",
    displayName: "sam_k",
    isUsername: true,
  });
  return m;
}

/** @type {Record<string, string>} */
const DEFAULT_LIGHT_TOKENS = {
  background: "0 0% 100%",
  foreground: "210 17.9% 54.1%",
  card: "0 0% 100%",
  "card-foreground": "222.2 84% 4.9%",
  primary: "222.2 47.4% 11.2%",
  "primary-foreground": "210 40% 98%",
  secondary: "210 40% 96%",
  "secondary-foreground": "222.2 84% 4.9%",
  muted: "210 40% 96%",
  "muted-foreground": "235 7.1% 67.1%",
  accent: "210 40% 96%",
  "accent-foreground": "222.2 84% 4.9%",
  border: "214.3 31.8% 91.4%",
  input: "214.3 31.8% 91.4%",
  ring: "222.2 84% 4.9%",
  "workout-text-primary": "210 17.9% 54.1%",
  "workout-text-muted": "235 7.1% 67.1%",
  "workout-text-subtle": "220 9% 78%",
  "workout-card": "0 0% 100%",
  "workout-muted": "210 40% 96%",
  "workout-hover": "220 14% 96%",
  "workout-border-light": "214 32% 96%",
  "workout-border": "214.3 31.8% 91.4%",
  "workout-border-input": "214 24% 84%",
  "workout-modal-overlay": "0 0% 0%",
  "workout-scrollbar-thumb": "215 16% 75%",
  "workout-scrollbar-thumb-hover": "215 14% 65%",
  "workout-modal-header": "0 0% 100%",
  "workout-modal-footer": "0 0% 100%",
  "workout-modal-divider": "214 32% 96%",
  "workout-modal-button-bg": "220 14% 96%",
  "workout-modal-button-text": "210 17.9% 54.1%",
  "workout-modal-button-border": "214.3 31.8% 91.4%",
};

/** @type {Record<string, string>} */
const DEFAULT_DARK_TOKENS = {
  background: "0 0% 5%",
  foreground: "210 40% 98%",
  card: "222.2 84% 4.9%",
  "card-foreground": "210 40% 98%",
  primary: "210 40% 98%",
  "primary-foreground": "222.2 47.4% 11.2%",
  secondary: "217.2 32.6% 17.5%",
  "secondary-foreground": "210 40% 98%",
  muted: "217.2 32.6% 17.5%",
  "muted-foreground": "215 20.2% 65.1%",
  accent: "217.2 32.6% 17.5%",
  "accent-foreground": "210 40% 98%",
  border: "217.2 32.6% 17.5%",
  input: "217.2 32.6% 17.5%",
  ring: "212.7 26.8% 83.9%",
  "workout-text-primary": "0 0% 100%",
  "workout-text-muted": "0 0% 56.9%",
  "workout-text-subtle": "212 6% 48.8%",
  "workout-card": "220 4.9% 12%",
  "workout-muted": "220 4.9% 12%",
  "workout-hover": "217 28% 22%",
  "workout-border-light": "220 3.1% 19%",
  "workout-border": "220 3.1% 19%",
  "workout-border-input": "220 3.1% 19%",
  "workout-modal-overlay": "0 0% 0%",
  "workout-scrollbar-thumb": "212 6% 48.8%",
  "workout-scrollbar-thumb-hover": "212 6% 60%",
  "workout-modal-header": "220 4.9% 12%",
  "workout-modal-footer": "220 4.9% 12%",
  "workout-modal-divider": "220 4.9% 12%",
  "workout-modal-button-bg": "220 4.9% 12%",
  "workout-modal-button-text": "0 0% 100%",
  "workout-modal-button-border": "220 3.1% 19%",
};

const TOKEN_LABELS = [
  ["background", "Background"],
  ["foreground", "Foreground"],
  ["muted-foreground", "Muted text"],
  ["card", "Card"],
  ["card-foreground", "Card text"],
  ["primary", "Primary"],
  ["primary-foreground", "On primary"],
  ["secondary", "Secondary"],
  ["secondary-foreground", "On secondary"],
  ["muted", "Muted surface"],
  ["accent", "Accent"],
  ["accent-foreground", "On accent"],
  ["border", "Border"],
  ["input", "Input / outline"],
  ["ring", "Focus ring"],
];

const WORKOUT_TOKEN_LABELS = [
  ["workout-text-primary", "Body & titles"],
  ["workout-text-muted", "Secondary / muted text"],
  ["workout-text-subtle", "Dividers / subtle"],
  ["workout-card", "Card background"],
  ["workout-muted", "Muted surface"],
  ["workout-hover", "Hover surface"],
  ["workout-border-light", "Light border"],
  ["workout-border", "Border"],
  ["workout-border-input", "Input border"],
  ["workout-modal-overlay", "Modal overlay"],
  ["workout-scrollbar-thumb", "Scrollbar thumb"],
  ["workout-scrollbar-thumb-hover", "Scrollbar thumb hover"],
  ["workout-modal-header", "Modal header bg"],
  ["workout-modal-footer", "Modal footer bg"],
  ["workout-modal-divider", "Modal divider/border"],
  ["workout-modal-button-bg", "Modal button bg"],
  ["workout-modal-button-text", "Modal button text"],
  ["workout-modal-button-border", "Modal button border"],
];

function cloneTokens(t) {
  return { ...t };
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

function TokenRow({ label, value, onChange }) {
  const hex = hslTripletToHex(value);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border py-2.5 last:border-b-0">
      <span className="w-[10.5rem] shrink-0 text-xs font-medium text-foreground">
        {label}
      </span>
      <input
        type="color"
        aria-label={`${label} color`}
        className="h-9 w-12 shrink-0 cursor-pointer overflow-hidden rounded border border-input bg-background p-0"
        value={hex}
        onChange={(e) => onChange(hexToHslTriplet(e.target.value))}
      />
      <input
        type="text"
        spellCheck={false}
        className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-[11px] text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ModalPreviewShell({ title, children }) {
  const colors = useThemeColors();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <IconButton
          aria-label="Close (preview only)"
          icon={<CloseIcon />}
          size="xs"
          variant="ghost"
          color={colors.textMuted}
          onClick={(e) => e.preventDefault()}
        />
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function WorkoutDetailModalPanel({ entry }) {
  const colors = useThemeColors();

  return (
    <ModalPreviewShell title="Detail modal (embedded preview)">
      <div className="rounded-lg border border-border overflow-hidden">
        <div
          className="px-3 py-2"
          style={{ background: colors.modalHeaderBg, color: colors.textPrimary }}
        >
          <HStack spacing={3}>
            <Box boxSize="34px" borderRadius="full" bg={colors.bgMuted} />
            <VStack align="start" spacing={0} minW={0}>
              <Text fontWeight="700" noOfLines={1} fontSize="sm">
                @demo_user
              </Text>
              <Text fontSize="xs" color={colors.textMuted} noOfLines={1}>
                Post detail
              </Text>
            </VStack>
          </HStack>
        </div>

        <div className="p-3" style={{ background: colors.bgCard }}>
          <VStack spacing={3} align="stretch">
            <Box
              w="full"
              aspectRatio="4/5"
              overflow="hidden"
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.borderColor}
            >
              <Image
                src={entry.image}
                alt={entry.name}
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <Text fontWeight="700" color={colors.textTitle} noOfLines={1}>
              {entry.name}
            </Text>
            <Box
              maxH="120px"
              overflowY="auto"
              border="1px solid"
              borderColor={colors.borderColorLight}
              borderRadius="10px"
              px={3}
              py={2}
              css={{
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  background: colors.scrollbarThumb,
                  borderRadius: "999px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: colors.scrollbarThumbHover,
                },
              }}
            >
              <Text
                whiteSpace="pre-wrap"
                fontSize="sm"
                color={colors.textDesc}
                lineHeight="1.4"
              >
                {entry.description}
              </Text>
            </Box>
          </VStack>
        </div>

        <div
          className="px-3 py-2 border-t"
          style={{
            background: colors.modalFooterBg,
            borderColor: colors.modalDivider,
          }}
        >
          <HStack w="full" justify="flex-end">
            <Box className="text-xs text-muted-foreground" style={{ marginRight: "auto" }}>
              Overlay token preview below
            </Box>
            <Box
              px={3}
              py={1.5}
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.modalButtonBorder}
              color={colors.modalButtonText}
              bg={colors.modalButtonBg}
              _hover={{ bg: colors.bgHover }}
              as="button"
              type="button"
              onClick={(e) => e.preventDefault()}
            >
              Close
            </Box>
          </HStack>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-border p-2 text-xs"
        style={{ background: "hsl(var(--workout-modal-overlay) / 0.72)" }}
      >
        Overlay color swatch (
        <span className="font-mono">workout-modal-overlay</span>)
      </div>
    </ModalPreviewShell>
  );
}

function WorkoutEditModalPanel({ entry }) {
  const colors = useThemeColors();
  const [name, setName] = useState(entry.name);
  const [desc, setDesc] = useState(entry.description);

  useEffect(() => {
    setName(entry.name);
    setDesc(entry.description);
  }, [entry._id, entry.name, entry.description]);

  return (
    <ModalPreviewShell title="Edit workout modal (embedded preview)">
      <div className="rounded-lg border border-border overflow-hidden">
        <div
          className="px-3 py-2 border-b"
          style={{
            background: colors.modalHeaderBg,
            borderColor: colors.modalDivider,
            color: colors.textPrimary,
          }}
        >
          <Text fontWeight="700" fontSize="sm">
            Edit workout
          </Text>
        </div>

        <div className="p-3" style={{ background: colors.bgCard }}>
          <VStack spacing={3} align="stretch">
            <Box
              w="full"
              aspectRatio="4/5"
              overflow="hidden"
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.borderColor}
            >
              <Image
                src={entry.image}
                alt={entry.name}
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" color={colors.textMuted} fontWeight="600">
                Title
              </Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg={colors.bgMuted}
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
                _focus={{ borderColor: colors.borderColor, bg: colors.bgMuted }}
              />
            </VStack>
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" color={colors.textMuted} fontWeight="600">
                Description
              </Text>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={6}
                resize="vertical"
                bg={colors.bgMuted}
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
                _focus={{ borderColor: colors.borderColor, bg: colors.bgMuted }}
              />
            </VStack>
          </VStack>
        </div>

        <div
          className="px-3 py-2 border-t"
          style={{
            background: colors.modalFooterBg,
            borderColor: colors.modalDivider,
          }}
        >
          <HStack w="full" justify="flex-end" gap={2}>
            <Box
              px={3}
              py={1.5}
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.modalButtonBorder}
              color={colors.modalButtonText}
              bg={colors.modalButtonBg}
              _hover={{ bg: colors.bgHover }}
              as="button"
              type="button"
              onClick={(e) => e.preventDefault()}
            >
              Cancel
            </Box>
            <Box
              px={3}
              py={1.5}
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.modalButtonBorder}
              bg={colors.modalButtonBg}
              color={colors.modalButtonText}
              as="button"
              type="button"
              onClick={(e) => e.preventDefault()}
            >
              Save
            </Box>
          </HStack>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-border p-2 text-xs"
        style={{ background: "hsl(var(--workout-modal-overlay) / 0.72)" }}
      >
        Overlay color swatch (
        <span className="font-mono">workout-modal-overlay</span>)
      </div>
    </ModalPreviewShell>
  );
}

export default function ThemePlaygroundPage() {
  const { currentTheme } = useTheme();
  const [lightTokens, setLightTokens] = useState(() =>
    cloneTokens(DEFAULT_LIGHT_TOKENS)
  );
  const [darkTokens, setDarkTokens] = useState(() =>
    cloneTokens(DEFAULT_DARK_TOKENS)
  );
  const [heroSurfaceLight, setHeroSurfaceLight] = useState("#2c3d4c");
  const [heroSurfaceDark, setHeroSurfaceDark] = useState("#141c27");
  const [editor, setEditor] = useState(/** @type {"light" | "dark"} */ ("light"));
  const [preview, setPreview] = useState(/** @type {"light" | "dark"} */ ("light"));
  const [demoFeedPage, setDemoFeedPage] = useState(1);
  const demoProfileCache = useMemo(() => buildDemoProfileCache(), []);
  const noopUpdate = useCallback(() => {}, []);
  const previewPortalRef = useRef(null);

  useEffect(() => {
    const saved = loadPersisted();
    if (!saved) return;
    if (saved.lightTokens) {
      setLightTokens({ ...DEFAULT_LIGHT_TOKENS, ...saved.lightTokens });
    }
    if (saved.darkTokens) {
      setDarkTokens({ ...DEFAULT_DARK_TOKENS, ...saved.darkTokens });
    }
    if (typeof saved.heroSurfaceLight === "string")
      setHeroSurfaceLight(saved.heroSurfaceLight);
    if (typeof saved.heroSurfaceDark === "string")
      setHeroSurfaceDark(saved.heroSurfaceDark);
  }, []);

  useEffect(() => {
    const payload = {
      lightTokens,
      darkTokens,
      heroSurfaceLight,
      heroSurfaceDark,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [lightTokens, darkTokens, heroSurfaceLight, heroSurfaceDark]);

  const activeTokens = editor === "light" ? lightTokens : darkTokens;
  const setActiveTokens = editor === "light" ? setLightTokens : setDarkTokens;

  const updateToken = useCallback(
    (key, next) => {
      setActiveTokens((prev) => ({ ...prev, [key]: next }));
    },
    [setActiveTokens]
  );

  const previewTokens = preview === "light" ? lightTokens : darkTokens;

  const previewStyle = useMemo(() => {
    return {
      ...tokensToStyleObject(previewTokens),
      "--hero-surface-light": heroSurfaceLight,
      "--hero-surface-dark": heroSurfaceDark,
    };
  }, [previewTokens, heroSurfaceLight, heroSurfaceDark]);

  const copyCss = useCallback(() => {
    const lines = (tokens) =>
      Object.entries(tokens)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join("\n");

    const text = `/* Light — merge into :root in index.css */\n:root {\n${lines(
      lightTokens
    )}\n  --hero-surface-light: ${heroSurfaceLight};\n  --hero-surface-dark: ${heroSurfaceDark};\n}\n\n/* Dark — merge into .dark in index.css */\n.dark {\n${lines(
      darkTokens
    )}\n}\n`;

    void navigator.clipboard.writeText(text);
  }, [lightTokens, darkTokens, heroSurfaceLight, heroSurfaceDark]);

  return (
    <div className="min-h-screen bg-background pb-16 pt-[calc(112px+1rem)] text-foreground">
      <div className="mx-auto max-w-[1800px] px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Theme lab
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Color & contrast
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Adjust landing tokens, workout feed tokens (ProductCard /
              pagination), and hero surfaces. Preview updates live. Values
              autosave in this browser.{" "}
              <strong className="font-medium text-foreground">
                App theme is {currentTheme}
              </strong>
              — Tailwind <code className="rounded bg-muted px-1 py-0.5 text-xs">dark:</code>{" "}
              follows the header theme, so switch to Light there when tuning
              light tokens, and Dark when tuning dark tokens.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Back home</Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={copyCss}>
              Copy CSS blocks
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:w-[380px] lg:overflow-y-auto">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Preview as
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={preview === "light" ? "default" : "outline"}
                  onClick={() => setPreview("light")}
                >
                  Light canvas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={preview === "dark" ? "default" : "outline"}
                  onClick={() => setPreview("dark")}
                >
                  Dark canvas
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Edit tokens for
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={editor === "light" ? "default" : "outline"}
                  onClick={() => setEditor("light")}
                >
                  :root (light)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editor === "dark" ? "default" : "outline"}
                  onClick={() => setEditor("dark")}
                >
                  .dark
                </Button>
              </div>
              <div className="mt-4 max-h-[min(64vh,620px)] overflow-y-auto pr-1 space-y-6">
                <div>
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    Landing &amp; shadcn
                  </p>
                  {TOKEN_LABELS.map(([key, label]) => (
                    <TokenRow
                      key={key}
                      label={label}
                      value={activeTokens[key] ?? ""}
                      onChange={(v) => updateToken(key, v)}
                    />
                  ))}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    Workout feed (cards, pagination)
                  </p>
                  {WORKOUT_TOKEN_LABELS.map(([key, label]) => (
                    <TokenRow
                      key={key}
                      label={label}
                      value={activeTokens[key] ?? ""}
                      onChange={(v) => updateToken(key, v)}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (editor === "light") {
                      setLightTokens(cloneTokens(DEFAULT_LIGHT_TOKENS));
                    } else {
                      setDarkTokens(cloneTokens(DEFAULT_DARK_TOKENS));
                    }
                  }}
                >
                  Reset {editor} defaults
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLightTokens(cloneTokens(DEFAULT_LIGHT_TOKENS));
                    setDarkTokens(cloneTokens(DEFAULT_DARK_TOKENS));
                    setHeroSurfaceLight("#2c3d4c");
                    setHeroSurfaceDark("#141c27");
                  }}
                >
                  Reset all
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Hero section surfaces
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Used via CSS variables on the preview (see Hero.jsx).
              </p>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0">Light</span>
                  <input
                    type="color"
                    className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0"
                    value={heroSurfaceLight}
                    onChange={(e) => setHeroSurfaceLight(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs"
                    value={heroSurfaceLight}
                    onChange={(e) => setHeroSurfaceLight(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0">Dark</span>
                  <input
                    type="color"
                    className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0"
                    value={heroSurfaceDark}
                    onChange={(e) => setHeroSurfaceDark(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs"
                    value={heroSurfaceDark}
                    onChange={(e) => setHeroSurfaceDark(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30">
            <div className="border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              Scoped preview: shadcn tokens,{" "}
              <code className="rounded bg-muted px-1">workout-*</code> vars (feed
              UI), and hero surfaces. Posts below use sample Unsplash images.
              Landing cards still use slate gradients in{" "}
              <code className="rounded bg-muted px-1">card.tsx</code>.
            </div>
            <div
              className={cn(
                "max-h-[calc(100vh-10rem)] overflow-y-auto",
                preview === "dark" && "dark"
              )}
              style={previewStyle}
              ref={previewPortalRef}
            >
              <PortalManager containerRef={previewPortalRef}>
                <Hero />

                <div
                  id="theme-playground-feed"
                  className="border-t border-border bg-background px-2 pb-12 pt-10"
                >
                  <Container
                    maxW="container.xl"
                    className="relative z-0 text-center"
                  >
                    <Text
                      fontSize="22"
                      fontWeight="bold"
                      bgGradient="linear(to-r, blue.200, gray.500)"
                      bgClip="text"
                      textAlign="center"
                    >
                      Workout posts
                    </Text>
                    <Text
                      mt={2}
                      fontSize="sm"
                      className="text-muted-foreground"
                    >
                      Sample posts with photos — same card layout as the
                      signed-in feed
                    </Text>
                    <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        Embedded modal UI previews below
                      </span>
                    </div>
                    <SimpleGrid
                      mt={8}
                      columns={{ base: 1, md: 2, lg: 3 }}
                      spacing={10}
                      w="full"
                      alignItems="stretch"
                      justifyItems="center"
                    >
                      {MOCK_WORKOUT_ENTRIES.map((entry) => (
                        <ProductCard
                          key={entry._id}
                          entry={entry}
                          isOwner={false}
                          onUpdate={noopUpdate}
                          profileCache={demoProfileCache}
                        />
                      ))}
                    </SimpleGrid>
                    <PaginationComponent
                      currentPage={demoFeedPage}
                      totalPages={4}
                      onPageChange={setDemoFeedPage}
                      maxVisiblePages={5}
                    />
                  </Container>
                </div>

                <Container maxW="container.xl" className="relative z-0 py-10">
                  <div className="mb-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Modal UI preview (embedded)
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is the same styling as the popup modals, but rendered
                      as normal page UI so it updates live while you edit
                      tokens.
                    </p>
                  </div>
                  <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
                    <WorkoutDetailModalPanel entry={MOCK_WORKOUT_ENTRIES[0]} />
                    <WorkoutEditModalPanel entry={MOCK_WORKOUT_ENTRIES[0]} />
                  </div>
                </Container>

                <div
                  className={cn(
                    "w-full min-w-0 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80",
                    preview === "dark" && landingDarkMainCanvas
                  )}
                >
                  <Container
                    maxW="container.xl"
                    className="relative z-0 text-center"
                  >
                    <HomeLandingSections />
                  </Container>
                </div>
              </PortalManager>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
