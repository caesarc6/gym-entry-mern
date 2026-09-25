import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Container,
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Center,
  Collapse,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import { LoadingIndicator } from "../components/loading";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import {
  exerciseMatchesQuery,
  parseCardioLine,
  parseExerciseLine,
  parseWorkoutDescription,
  stripGymOrLocationTagsFromLine,
} from "../utils/workoutParser.js";

const ExerciseProgressChart = lazy(
  () => import("../components/ExerciseProgressChart")
);
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import { useThemeColors } from "../hooks/useThemeColors";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";

const TIMEFRAMES = [
  { value: "7d", label: "Week", phrase: "this week" },
  { value: "30d", label: "Month", phrase: "this month" },
  { value: "90d", label: "3 months", phrase: "in the last 3 months" },
  { value: "1y", label: "Year", phrase: "this year" },
];

const BEST_LIFTS_PREVIEW = 3;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const collectSessions = (exercises) => {
  const byId = new Map();
  Object.values(exercises || {}).forEach((stats) => {
    (stats.history || []).forEach((point) => {
      const date = new Date(point.date);
      if (Number.isNaN(date.getTime())) return;
      const id = String(point.workoutId || date.toISOString());
      if (!byId.has(id)) byId.set(id, date);
    });
  });
  return [...byId.values()];
};

const buildSessionBuckets = (timeframe, sessions, now = new Date()) => {
  const today = startOfDay(now);
  let buckets = [];

  if (timeframe === "7d") {
    buckets = Array.from({ length: 7 }, (_, index) => {
      const start = addDays(today, index - 6);
      return {
        label: start.toLocaleDateString("en-US", { weekday: "narrow" }),
        start,
        end: addDays(start, 1),
      };
    });
  } else if (timeframe === "30d") {
    buckets = Array.from({ length: 4 }, (_, index) => {
      const start = addDays(today, (index - 3) * 7 - 6);
      return {
        label: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        start,
        end: addDays(start, 7),
      };
    });
  } else if (timeframe === "90d") {
    buckets = Array.from({ length: 3 }, (_, index) => {
      const start = new Date(today.getFullYear(), today.getMonth() - (2 - index), 1);
      return {
        label: start.toLocaleDateString("en-US", { month: "short" }),
        start,
        end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
      };
    });
  } else {
    buckets = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(
        today.getFullYear(),
        today.getMonth() - (11 - index),
        1,
      );
      return {
        label: start.toLocaleDateString("en-US", { month: "narrow" }),
        start,
        end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
      };
    });
  }

  return buckets.map((bucket) => ({
    ...bucket,
    count: sessions.filter(
      (date) => date >= bucket.start && date < bucket.end,
    ).length,
  }));
};

const emptyLift = (name) => ({
  name,
  strongest: 0,
  latest: 0,
  latestDate: 0,
  latestRepsText: "",
  bestSetReps: 0,
  latestMinutes: null,
  bestMinutes: 0,
  latestIncline: null,
  latestLevel: null,
});

const rememberLift = (byName, rawName) => {
  const name = stripGymOrLocationTagsFromLine(rawName) || rawName;
  if (!byName.has(name)) byName.set(name, emptyLift(name));
  return byName.get(name);
};

const noteLatestSession = (row, time) => {
  if (time < row.latestDate) return false;
  row.latestDate = time;
  row.latest = 0;
  row.latestRepsText = "";
  row.latestMinutes = null;
  row.latestIncline = null;
  row.latestLevel = null;
  return true;
};

const applyLoggedEntries = (byName, entries) => {
  (entries || []).forEach((entry) => {
    const time = new Date(entry.createdAt || entry.date).getTime();
    if (Number.isNaN(time) || !entry.description) return;

    entry.description.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const exercise = parseExerciseLine(trimmed);
      if (exercise?.maxWeight > 0) return;
      if (exercise) {
        const reps = exercise.sets
          .map((set) => set.reps)
          .filter((reps) => reps > 0);
        if (reps.length === 0) return;
        const row = rememberLift(byName, exercise.name);
        row.bestSetReps = Math.max(row.bestSetReps, ...reps);
        if (noteLatestSession(row, time)) {
          row.latestRepsText = `${reps.join(", ")} reps`;
        }
        return;
      }

      const cardio = parseCardioLine(trimmed);
      if (!cardio) return;
      const row = rememberLift(byName, cardio.name);
      if (cardio.minutes) {
        row.bestMinutes = Math.max(row.bestMinutes, cardio.minutes);
      }
      if (noteLatestSession(row, time)) {
        row.latestMinutes = cardio.minutes;
        row.latestIncline = cardio.incline;
        row.latestLevel = cardio.level;
      }
    });
  });
};

const buildLiftLookup = (personalRecords, exercises, loggedEntries) => {
  const byName = new Map();

  Object.entries(exercises || {}).forEach(([rawName, stats]) => {
    const row = rememberLift(byName, rawName);
    row.strongest = Math.max(row.strongest, Number(stats?.maxWeight) || 0);
    (stats?.history || []).forEach((point) => {
      const time = new Date(point.date).getTime();
      const weight = Number(point.weight) || 0;
      const reps = Number(point.reps) || 0;
      if (Number.isNaN(time)) return;
      if (time < row.latestDate || (weight <= 0 && reps <= 0)) return;
      row.latestDate = time;
      if (weight > 0) {
        row.latest = weight;
        row.latestRepsText = "";
        row.latestMinutes = null;
        row.latestIncline = null;
        row.latestLevel = null;
      } else {
        row.latest = 0;
        row.latestRepsText = `${reps} reps`;
      }
    });
  });

  Object.entries(personalRecords || {}).forEach(([rawName, prs]) => {
    const row = rememberLift(byName, rawName);
    row.strongest = Math.max(
      row.strongest,
      Number(prs?.maxWeight?.value) || 0,
    );
    const latestDate = prs?.latest?.date
      ? new Date(prs.latest.date).getTime()
      : 0;
    const latestWeight = Number(prs?.latest?.value) || 0;
    if (latestDate && latestWeight > 0 && latestDate >= row.latestDate) {
      row.latestDate = latestDate;
      row.latest = latestWeight;
    }
  });

  applyLoggedEntries(byName, loggedEntries);

  return [...byName.values()]
    .filter(
      (row) =>
        row.strongest > 0 ||
        row.latest > 0 ||
        row.latestRepsText ||
        row.latestMinutes ||
        row.latestIncline != null ||
        row.latestLevel != null,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};

const formatMinutes = (minutes) => {
  if (!minutes) return "";
  const whole = Math.round(minutes);
  if (whole >= 60 && whole % 60 === 0) return `${whole / 60} hr`;
  if (whole > 60) {
    const hours = Math.floor(whole / 60);
    const mins = whole % 60;
    return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  return `${Number.isInteger(minutes) ? minutes : Math.round(minutes * 10) / 10} min`;
};

const formatRecentDate = (time) => {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatLiftSummary = (lift) => {
  const recent = formatRecentDate(lift.latestDate);
  const hasBodyweightDetail =
    lift.latestRepsText ||
    lift.latestMinutes ||
    lift.latestIncline != null ||
    lift.latestLevel != null;
  if (lift.latest > 0 || (lift.strongest > 0 && !hasBodyweightDetail)) {
    return [
      `Latest ${lift.latest} lbs`,
      recent,
      `Strongest ${lift.strongest > 0 ? `${lift.strongest} lbs` : "—"}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const detail = [
    lift.latestRepsText,
    formatMinutes(lift.latestMinutes),
    lift.latestIncline != null ? `${lift.latestIncline} incline` : "",
    lift.latestLevel != null ? `lvl ${lift.latestLevel}` : "",
  ].filter(Boolean);

  const latestNumbers = (lift.latestRepsText.match(/\d+/g) || []).map(Number);
  const latestBest = latestNumbers.length ? Math.max(...latestNumbers) : 0;
  const best = [];
  if (lift.bestSetReps > latestBest) best.push(`Best ${lift.bestSetReps} reps`);
  if (lift.bestMinutes > (lift.latestMinutes || 0)) {
    best.push(`Best ${formatMinutes(lift.bestMinutes)}`);
  }

  return [`Latest ${detail.join(" · ") || "—"}`, recent, ...best]
    .filter(Boolean)
    .join(" · ");
};

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [personalRecords, setPersonalRecords] = useState(null);
  const [searchExercises, setSearchExercises] = useState(null);
  const [loggedEntries, setLoggedEntries] = useState([]);
  const [liftQuery, setLiftQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("30d");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [exerciseProgress, setExerciseProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [showAllBests, setShowAllBests] = useState(false);
  const activeUidRef = useRef(null);
  const attemptedByUidRef = useRef(new Map());
  const autoProcessRunsRef = useRef(0);
  const skipInitialVisitRef = useRef(true);
  const searchRegionRef = useRef(null);
  const location = useLocation();

  const { showToast } = useCustomToast();
  const colors = useThemeColors();
  const { currentTheme } = useTheme();
  const pageBg = colors.background;
  const cardText = colors.textPrimary;
  const mutedText = colors.textMuted;
  const primarySolidButtonProps = {
    bg: colors.primary,
    color: colors.primaryForeground,
    _hover: {
      bg: colors.primary,
      filter: "brightness(1.08)",
    },
    _active: {
      bg: colors.primary,
      filter: "brightness(0.96)",
    },
  };
  const { setAnalyticsTabCache, clearAnalyticsTabCache } = useProductStore();

  const setMergedAnalyticsCache = (patch) => {
    const prev = useProductStore.getState().analyticsTabCache;
    const base = prev && prev.uid === patch.uid ? prev : {};
    setAnalyticsTabCache({ ...base, ...patch, cachedAt: Date.now() });
  };

  const clearProgressView = () => {
    setTimeframe("30d");
    setAnalytics(null);
    setPersonalRecords(null);
    setSearchExercises(null);
    setLoggedEntries([]);
    setLiftQuery("");
    setExerciseProgress(null);
    setSelectedExercise("");
    setShowAllBests(false);
    setAutoProcessing(false);
  };

  const hydrateProgressCache = (cache) => {
    setTimeframe(cache.timeframe || "30d");
    setSelectedExercise(cache.selectedExercise || "");
    setAnalytics(cache.analytics || null);
    setPersonalRecords(cache.personalRecords || null);
    setExerciseProgress(cache.exerciseProgress || null);
  };

  useEffect(() => {
    if (!liftQuery) return undefined;
    const clearOnOutsideTap = (event) => {
      if (searchRegionRef.current?.contains(event.target)) return;
      setLiftQuery("");
    };
    document.addEventListener("pointerdown", clearOnOutsideTap);
    return () => document.removeEventListener("pointerdown", clearOnOutsideTap);
  }, [liftQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async (user) => {
      if (!user) {
        activeUidRef.current = null;
        setIsAuthenticated(false);
        clearAnalyticsTabCache();
        clearProgressView();
        setLoading(false);
        return;
      }

      const switchedAccount =
        activeUidRef.current && activeUidRef.current !== user.uid;
      activeUidRef.current = user.uid;
      setIsAuthenticated(true);

      if (switchedAccount) {
        clearProgressView();
        clearAnalyticsTabCache();
      }

      const cache = useProductStore.getState().analyticsTabCache;
      const cacheFresh =
        !switchedAccount &&
        cache &&
        cache.uid === user.uid &&
        Date.now() - cache.cachedAt < 60_000;

      if (cacheFresh) {
        hydrateProgressCache(cache);
        setLoading(false);
        fetchUserEntries(user);
        fetchSearchHistory(user);
        return;
      }

      setLoading(true);
      await Promise.allSettled([
        fetchAnalytics(user),
        fetchPersonalRecords(user),
        fetchUserEntries(user),
        fetchSearchHistory(user),
      ]);
      if (!cancelled && activeUidRef.current === user.uid) {
        setLoading(false);
      }
    };

    getCurrentAuthUser().then((user) => {
      if (!cancelled) loadProgress(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        return;
      }

      if (!session?.user) {
        if (!cancelled) loadProgress(null);
        return;
      }

      getCurrentAuthUser().then((user) => {
        if (cancelled || !user || user.uid === activeUidRef.current) return;
        loadProgress(user);
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/analytics") return;
    if (skipInitialVisitRef.current) {
      skipInitialVisitRef.current = false;
      return;
    }
    if (!activeUidRef.current) return;
    fetchUserEntries();
  }, [location.pathname]);

  const fetchAnalytics = async (authedUser = null, timeframeOverride) => {
    try {
      // Check if user is authenticated
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) {
        return;
      }

      const tf = timeframeOverride ?? timeframe;
      const response = await apiClient.get(API_ENDPOINTS.WORKOUT_ANALYTICS(tf));
      if (activeUidRef.current && activeUidRef.current !== user.uid) return;
      setAnalytics(response.data.data);
      setMergedAnalyticsCache({
        uid: user.uid,
        timeframe: tf,
        selectedExercise,
        analytics: response.data.data,
      });
    } catch (error) {
      if (error.response?.status === 403) {
        showToast({
          title: "Please sign in",
          description: "Sign in to see how your training is going.",
          status: "warning",
        });
      } else {
        showToast({
          title: "Couldn't load progress",
          description: "Please try again in a moment.",
          status: "error",
        });
      }
    }
  };

  const fetchPersonalRecords = async (authedUser = null) => {
    try {
      // Check if user is authenticated
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) {
        return;
      }

      const response = await apiClient.get(API_ENDPOINTS.PERSONAL_RECORDS);
      if (activeUidRef.current && activeUidRef.current !== user.uid) return;
      setPersonalRecords(response.data.data);
      setMergedAnalyticsCache({
        uid: user.uid,
        personalRecords: response.data.data,
      });
    } catch {
      // Personal records are supplemental; keep analytics usable if unavailable.
    }
  };

  const fetchSearchHistory = async (authedUser = null) => {
    try {
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) return;
      const response = await apiClient.get(API_ENDPOINTS.WORKOUT_ANALYTICS("1y"));
      if (activeUidRef.current && activeUidRef.current !== user.uid) return;
      setSearchExercises(response.data.data?.exercises || {});
    } catch {
      // Search can still use the lifts already on screen.
    }
  };

  const fetchExerciseProgress = async (exercise, timeframeOverride) => {
    if (!exercise) return;

    try {
      setProgressLoading(true);
      const tf = timeframeOverride ?? timeframe;
      const response = await apiClient.get(
        API_ENDPOINTS.EXERCISE_PROGRESS(exercise, tf)
      );
      setExerciseProgress(response.data.data);
      const user = await getCurrentAuthUser();
      if (user) {
        setMergedAnalyticsCache({
          uid: user.uid,
          timeframe: tf,
          selectedExercise: exercise,
          exerciseProgress: response.data.data,
        });
      }
    } catch {
      showToast({
        title: "Couldn't load that exercise",
        description: "Please try again in a moment.",
        status: "error",
      });
    } finally {
      setProgressLoading(false);
    }
  };

  const handleExerciseSelect = (exercise) => {
    if (selectedExercise === exercise) {
      setSelectedExercise("");
      setExerciseProgress(null);
      return;
    }
    setSelectedExercise(exercise);
    fetchExerciseProgress(exercise);
  };

  const changeTimeframe = (next) => {
    setTimeframe(next);
    fetchAnalytics(null, next);
    if (selectedExercise) {
      fetchExerciseProgress(selectedExercise, next);
    }
  };

  const fetchUserEntries = async (authedUser = null) => {
    try {
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) {
        return;
      }

      const entries = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= 20) {
        const response = await apiClient.get(
          API_ENDPOINTS.POSTS(user.uid, page, 100)
        );
        if (activeUidRef.current && activeUidRef.current !== user.uid) return;
        const batch = response.data.data || [];
        entries.push(...batch);
        totalPages = response.data.pagination?.totalPages || 1;
        if (batch.length === 0) break;
        page += 1;
      }

      const workoutEntries = entries.filter(
        (entry) => parseWorkoutDescription(entry.description).length > 0
      );

      if (activeUidRef.current !== user.uid) return;

      setLoggedEntries(
        entries.map((entry) => ({
          createdAt: entry.createdAt,
          description: entry.description || "",
        })),
      );
      setMergedAnalyticsCache({
        uid: user.uid,
        userEntries: entries.slice(0, 100),
      });

      // Check which entries are already processed
      const processedIds = await checkProcessedEntries(entries, user.uid);
      if (activeUidRef.current !== user.uid) return;

      const attempted =
        attemptedByUidRef.current.get(user.uid) ?? new Set();
      attemptedByUidRef.current.set(user.uid, attempted);

      const trulyUnprocessed = workoutEntries.filter(
        (entry) =>
          !processedIds.has(String(entry._id)) && !attempted.has(entry._id)
      );

      if (trulyUnprocessed.length > 0) {
        autoProcessNewEntries(trulyUnprocessed, user.uid, attempted);
      }
    } catch {
      // Entries are supplemental; analytics can still render without them.
    }
  };

  const checkProcessedEntries = async (entries, uid) => {
    if (entries.length === 0) return new Set();

    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_WORKOUTS);
      if (uid && activeUidRef.current !== uid) return new Set();
      const workouts = Array.isArray(response.data) ? response.data : [];
      const processedIds = new Set();

      workouts.forEach((workout) => {
        const entryId = workout.entryId?._id || workout.entryId;
        if (entryId) processedIds.add(String(entryId));
      });

      setMergedAnalyticsCache({
        uid,
        processedEntryIds: Array.from(processedIds),
      });

      return processedIds;
    } catch {
      return new Set();
    }
  };

  const stillViewingAccount = (uid) => activeUidRef.current === uid;

  const autoProcessNewEntries = async (entries, uid, attempted) => {
    if (entries.length === 0) return;

    autoProcessRunsRef.current += 1;
    setAutoProcessing(true);
    let processedCount = 0;
    let stoppedEarly = false;

    for (const entry of entries) {
      if (!stillViewingAccount(uid)) {
        stoppedEarly = true;
        break;
      }
      attempted.add(entry._id);
      try {
        await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entry._id));
        if (!stillViewingAccount(uid)) {
          stoppedEarly = true;
          attempted.delete(entry._id);
          break;
        }
        processedCount++;
      } catch {
        if (!stillViewingAccount(uid)) {
          stoppedEarly = true;
          attempted.delete(entry._id);
          break;
        }
      }
    }

    autoProcessRunsRef.current = Math.max(0, autoProcessRunsRef.current - 1);
    if (stoppedEarly || !stillViewingAccount(uid)) return;
    if (autoProcessRunsRef.current === 0) setAutoProcessing(false);

    if (processedCount > 0) {
      fetchAnalytics();
      fetchPersonalRecords();
    }
  };

  const periodPhrase =
    TIMEFRAMES.find((item) => item.value === timeframe)?.phrase ?? "lately";
  const exercisesByName = analytics
    ? Object.entries(analytics.exercises).reduce((acc, [name, stats]) => {
        const cleanName = stripGymOrLocationTagsFromLine(name) || name;
        const current = acc[cleanName];
        if (!current) {
          acc[cleanName] = { ...stats };
          return acc;
        }
        current.totalWorkouts += stats.totalWorkouts || 0;
        current.totalVolume += stats.totalVolume || 0;
        current.maxWeight = Math.max(current.maxWeight || 0, stats.maxWeight || 0);
        current.maxReps = Math.max(current.maxReps || 0, stats.maxReps || 0);
        current.maxVolume = Math.max(current.maxVolume || 0, stats.maxVolume || 0);
        return acc;
      }, {})
    : {};
  const bestLifts = Object.entries(exercisesByName)
    .filter(([, stats]) => Number(stats?.maxWeight) > 0)
    .sort((a, b) => (b[1].maxWeight || 0) - (a[1].maxWeight || 0));
  const visibleBests = showAllBests
    ? bestLifts
    : bestLifts.slice(0, BEST_LIFTS_PREVIEW);
  const workoutCount = analytics?.totalWorkouts ?? 0;
  const cardShadow =
    colors.currentTheme === "light"
      ? "0 10px 28px rgba(15, 23, 42, 0.06)"
      : "0 10px 28px rgba(0, 0, 0, 0.35)";
  const cardProps = {
    bg: colors.bgCard,
    borderRadius: "2xl",
    boxShadow: cardShadow,
  };
  const pageShellProps = {
    maxW: "lg",
    pt: 4,
    pb: 28,
    px: 4,
    minH: "100dvh",
    bg: pageBg,
    color: cardText,
  };
  const liftLookup = buildLiftLookup(
    personalRecords,
    searchExercises || analytics?.exercises,
    loggedEntries,
  );
  const liftSearch = liftQuery.trim().toLowerCase();
  const liftResults = liftSearch
    ? liftLookup
        .filter((lift) => exerciseMatchesQuery(lift.name, liftSearch))
        .sort(
          (a, b) =>
            b.latestDate - a.latestDate || a.name.localeCompare(b.name),
        )
    : [];
  const sessions = collectSessions(analytics?.exercises);
  const sessionBuckets = buildSessionBuckets(timeframe, sessions);
  const busiest = Math.max(
    1,
    ...sessionBuckets.map((bucket) => bucket.count),
  );

  const timeframeChips = (
    <HStack
      spacing={1}
      mt={5}
      p="1"
      bg={colors.bgMuted}
      borderRadius="full"
    >
      {TIMEFRAMES.map((item) => {
        const selected = timeframe === item.value;
        return (
          <Button
            key={item.value}
            flex="1"
            variant="ghost"
            h="36px"
            px={1}
            fontSize="xs"
            fontWeight={selected ? "semibold" : "medium"}
            color={selected ? cardText : mutedText}
            bg={selected ? colors.bgCard : "transparent"}
            borderRadius="full"
            boxShadow={selected ? cardShadow : "none"}
            _hover={{ bg: selected ? colors.bgCard : "transparent" }}
            _active={{ bg: selected ? colors.bgCard : "transparent" }}
            onClick={() => changeTimeframe(item.value)}
          >
            {item.label}
          </Button>
        );
      })}
    </HStack>
  );

  const exerciseDetail =
    selectedExercise && (
      <Box pt={2} pb={2}>
        {progressLoading ? (
          <Box color={cardText} py={4}>
            <LoadingIndicator variant="inline" />
          </Box>
        ) : exerciseProgress?.dataPoints?.length > 0 ? (
          <Suspense
            fallback={
              <Box color={cardText} py={4}>
                <LoadingIndicator variant="inline" />
              </Box>
            }
          >
            <ExerciseProgressChart
              exerciseProgress={exerciseProgress}
              exerciseName={exerciseProgress.exercise}
            />
          </Suspense>
        ) : (
          <Text py={3} fontSize="sm" color={mutedText}>
            Nothing for this one yet.
          </Text>
        )}
      </Box>
    );

  const progressNav = (
    <nav className="sticky top-0 z-20 w-full">
      <div
        className={cn(
          "w-full border-b px-4 py-[1px] pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] backdrop-blur-xl",
          currentTheme === "light"
            ? "border-zinc-200/80 bg-zinc-50/90 shadow-sm"
            : currentTheme === "dark-black"
              ? "border-neutral-800/55 bg-neutral-950/88"
              : currentTheme === "dark-blue"
                ? "border-[rgb(39_39_42_/_6%)] bg-zinc-950/85"
                : "border-[rgb(39_39_42_/_6%)] bg-zinc-950/88",
        )}
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="relative flex items-center justify-between py-2">
            <div className="h-10 w-10" aria-hidden />
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
              <span className="nav-wordmark text-foreground">Progress</span>
            </div>
            <div className="h-10 w-10" aria-hidden />
          </div>
        </div>
      </div>
    </nav>
  );

  if (loading) {
    return (
      <>
        {progressNav}
        <Container {...pageShellProps}>
          <Center minH="50vh">
            <Box color={cardText}>
              <LoadingIndicator variant="page" />
            </Box>
          </Center>
        </Container>
      </>
    );
  }

  if (isAuthenticated === false) {
    return <SignedOutTabPrompt variant="analytics" />;
  }

  const chartCount = sessionBuckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  const shownCount = sessions.length > 0 ? chartCount : workoutCount;
  const sessionTitle =
    shownCount === 0
      ? `No workouts ${periodPhrase}`
      : shownCount === 1
        ? `1 workout ${periodPhrase}`
        : `${shownCount} workouts ${periodPhrase}`;

  return (
    <>
    {progressNav}
    <Container {...pageShellProps}>
      <Box ref={searchRegionRef}>
        <InputGroup>
          <Input
            value={liftQuery}
            onChange={(event) => setLiftQuery(event.target.value)}
            placeholder="Search a lift"
            aria-label="Search a lift"
            variant="unstyled"
            h="44px"
            pl={4}
            pr={liftQuery ? "44px" : 4}
            bg={colors.bgMuted}
            color={cardText}
            borderRadius="full"
            _placeholder={{ color: mutedText }}
          />
          {liftQuery ? (
            <InputRightElement h="44px" w="44px">
              <Box
                as="button"
                type="button"
                aria-label="Clear search"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="28px"
                h="28px"
                borderRadius="full"
                color={mutedText}
                onClick={() => setLiftQuery("")}
              >
                <FiX size={16} />
              </Box>
            </InputRightElement>
          ) : null}
        </InputGroup>
      {autoProcessing && (
        <Text mt={3} fontSize="sm" color={mutedText} textAlign="center">
          Adding workouts
        </Text>
      )}
      {liftSearch ? (
        <Box {...cardProps} mt={4} px={4} py={2}>
          {liftResults.length === 0 ? (
            <Text py={4} fontSize="sm" color={mutedText}>
              No lifts named that.
            </Text>
          ) : (
            liftResults.map((lift) => (
              <Box key={lift.name} py={3}>
                <Text fontWeight="semibold" noOfLines={1}>
                  {lift.name}
                </Text>
                <Text mt={1} fontSize="sm" color={mutedText}>
                  {formatLiftSummary(lift)}
                </Text>
              </Box>
            ))
          )}
        </Box>
      ) : (
        <>
      {timeframeChips}

      <Box {...cardProps} mt={5} px={5} pt={5} pb={4}>
        <Text fontSize="lg" fontWeight="semibold" letterSpacing="-0.02em">
          {analytics ? sessionTitle : "Nothing here yet"}
        </Text>
        <HStack align="flex-end" spacing={1} mt={6}>
          {sessionBuckets.map((bucket) => {
            const barHeight =
              bucket.count === 0
                ? 6
                : Math.max(18, Math.round((bucket.count / busiest) * 104));
            return (
              <VStack
                key={bucket.start.toISOString()}
                flex="1"
                spacing={2}
                minW={0}
              >
                <Box
                  w="full"
                  maxW="22px"
                  h={`${barHeight}px`}
                  borderRadius="full"
                  bg={bucket.count > 0 ? colors.primary : colors.bgMuted}
                  title={
                    bucket.count === 1 ? "1 workout" : `${bucket.count} workouts`
                  }
                />
                <Text
                  fontSize="10px"
                  color={mutedText}
                  lineHeight="1"
                  noOfLines={1}
                >
                  {bucket.label}
                </Text>
              </VStack>
            );
          })}
        </HStack>
      </Box>

      {shownCount === 0 && !autoProcessing && (
        <Button
          as={RouterLink}
          to="/create"
          {...primarySolidButtonProps}
          mt={4}
          w="full"
          h="52px"
          borderRadius="full"
        >
          Log a workout
        </Button>
      )}

      {bestLifts.length > 0 && (
        <Box {...cardProps} mt={3} px={4} py={2}>
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color={mutedText}
            pt={3}
            pb={1}
          >
            Strongest
          </Text>
          {visibleBests.map(([exerciseName, stats]) => {
            const selected = selectedExercise === exerciseName;
            return (
              <Box key={exerciseName}>
                <HStack
                  as="button"
                  type="button"
                  w="full"
                  justify="space-between"
                  align="center"
                  cursor="pointer"
                  textAlign="left"
                  bg="transparent"
                  border="none"
                  py={3}
                  px={0}
                  aria-pressed={selected}
                  onClick={() => handleExerciseSelect(exerciseName)}
                >
                  <Text fontWeight="semibold" noOfLines={1} pr={3}>
                    {exerciseName}
                  </Text>
                  <Text
                    color={mutedText}
                    whiteSpace="nowrap"
                  >
                    {stats.maxWeight} lbs
                  </Text>
                </HStack>
                <Collapse in={selected} animateOpacity>
                  {selected ? exerciseDetail : null}
                </Collapse>
              </Box>
            );
          })}
          {bestLifts.length > BEST_LIFTS_PREVIEW && (
            <Button
              variant="ghost"
              w="full"
              h="44px"
              mb={1}
              borderRadius="full"
              color={mutedText}
              fontWeight="medium"
              _hover={{ bg: colors.bgMuted }}
              onClick={() => {
                if (showAllBests) {
                  const previewNames = bestLifts
                    .slice(0, BEST_LIFTS_PREVIEW)
                    .map(([name]) => name);
                  if (
                    selectedExercise &&
                    !previewNames.includes(selectedExercise)
                  ) {
                    setSelectedExercise("");
                    setExerciseProgress(null);
                  }
                }
                setShowAllBests((open) => !open);
              }}
            >
              {showAllBests ? "Show less" : "See all"}
            </Button>
          )}
        </Box>
      )}
        </>
      )}
      </Box>
    </Container>
    </>
  );
};

export default AnalyticsPage;
