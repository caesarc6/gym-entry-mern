import { useState, useEffect, lazy, Suspense } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Select,
  Button,
  Center,
  Collapse,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "../components/loading";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import GymNameHelper from "../components/GymNameHelper";
import ProgressInsights from "../components/ProgressInsights";
import { stripGymOrLocationTagsFromLine } from "../utils/workoutParser.js";

const ExerciseProgressChart = lazy(
  () => import("../components/ExerciseProgressChart")
);
const MultiMetricProgressChart = lazy(
  () => import("../components/MultiMetricProgressChart")
);
import WorkoutDetailsModal from "../components/modals/WorkoutDetailsModal";
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import { useThemeColors } from "../hooks/useThemeColors";

const TIMEFRAMES = [
  { value: "7d", label: "This week", phrase: "this week" },
  { value: "30d", label: "This month", phrase: "this month" },
  { value: "90d", label: "3 months", phrase: "in the last 3 months" },
  { value: "1y", label: "This year", phrase: "this year" },
];

const BEST_LIFTS_PREVIEW = 5;

const isSameSession = (a, b) =>
  Boolean(
    a &&
      b &&
      a.date === b.date &&
      a.weight === b.weight &&
      a.reps === b.reps &&
      a.sets === b.sets,
  );

const SectionEyebrow = ({ children, color }) => (
  <Text
    fontSize="xs"
    letterSpacing="0.16em"
    textTransform="uppercase"
    color={color}
    fontWeight="medium"
    mb={6}
  >
    {children}
  </Text>
);

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [personalRecords, setPersonalRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("30d");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [exerciseProgress, setExerciseProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [userEntries, setUserEntries] = useState([]);
  const [processingEntry, setProcessingEntry] = useState(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [processedEntryIds, setProcessedEntryIds] = useState(new Set());
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(false); // Changed to false by default
  const [skippedEntries, setSkippedEntries] = useState([]);
  const [hasAutoProcessed, setHasAutoProcessed] = useState(false); // New flag to prevent multiple auto-processing
  const [chartType, setChartType] = useState("simple"); // 'simple' or 'multi'
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [showAllBests, setShowAllBests] = useState(false);

  const { showToast } = useCustomToast();
  const colors = useThemeColors();
  const pageBg = colors.background;
  const cardText = colors.textPrimary;
  const mutedText = colors.textMuted;
  const softBorderColor = colors.borderColorLight;
  const inputBg = colors.background;
  const inputBorderColor = colors.borderColorInput;
  const controlProps = {
    bg: inputBg,
    color: cardText,
    borderColor: inputBorderColor,
    _hover: { borderColor: colors.ring },
    _focus: {
      borderColor: colors.ring,
      boxShadow: `0 0 0 1px ${colors.ring}`,
    },
  };
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
  const { analyticsTabCache, setAnalyticsTabCache, clearAnalyticsTabCache } =
    useProductStore();

  const setMergedAnalyticsCache = (patch) => {
    const prev = useProductStore.getState().analyticsTabCache;
    const base = prev && prev.uid === patch.uid ? prev : {};
    setAnalyticsTabCache({ ...base, ...patch, cachedAt: Date.now() });
  };

  useEffect(() => {
    const syncAuth = async () => {
      const user = await getCurrentAuthUser();
      if (user) {
        if (
          analyticsTabCache &&
          analyticsTabCache.uid === user.uid &&
          Date.now() - analyticsTabCache.cachedAt < 60_000
        ) {
          setIsAuthenticated(true);
          setTimeframe(analyticsTabCache.timeframe || "30d");
          setSelectedExercise(analyticsTabCache.selectedExercise || "");
          setAnalytics(analyticsTabCache.analytics || null);
          setPersonalRecords(analyticsTabCache.personalRecords || null);
          setUserEntries(analyticsTabCache.userEntries || []);
          setProcessedEntryIds(
            analyticsTabCache.processedEntryIds
              ? new Set(analyticsTabCache.processedEntryIds)
              : new Set()
          );
          setExerciseProgress(analyticsTabCache.exerciseProgress || null);
          setChartType(analyticsTabCache.chartType || "simple");
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setLoading(true);
        await Promise.allSettled([
          fetchAnalytics(user),
          fetchPersonalRecords(user),
          fetchUserEntries(user),
        ]);
        setLoading(false);
      } else {
        setIsAuthenticated(false);
        clearAnalyticsTabCache();
        setLoading(false);
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          if (
            analyticsTabCache &&
            Date.now() - analyticsTabCache.cachedAt < 60_000
          ) {
            setTimeframe(analyticsTabCache.timeframe || "30d");
            setSelectedExercise(analyticsTabCache.selectedExercise || "");
            setAnalytics(analyticsTabCache.analytics || null);
            setPersonalRecords(analyticsTabCache.personalRecords || null);
            setUserEntries(analyticsTabCache.userEntries || []);
            setProcessedEntryIds(
              analyticsTabCache.processedEntryIds
                ? new Set(analyticsTabCache.processedEntryIds)
                : new Set()
            );
            setExerciseProgress(analyticsTabCache.exerciseProgress || null);
            setChartType(analyticsTabCache.chartType || "simple");
            setLoading(false);
          } else {
            // Ensure we fetch on cold start (especially after reload on native).
            setLoading(true);
            getCurrentAuthUser().then((user) => {
              if (!user) {
                setLoading(false);
                return;
              }
              Promise.allSettled([
                fetchAnalytics(user),
                fetchPersonalRecords(user),
                fetchUserEntries(user),
              ]).finally(() => setLoading(false));
            });
          }
        } else {
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchAnalytics = async (authedUser = null, timeframeOverride) => {
    try {
      // Check if user is authenticated
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) {
        return;
      }

      const tf = timeframeOverride ?? timeframe;
      const response = await apiClient.get(API_ENDPOINTS.WORKOUT_ANALYTICS(tf));
      setAnalytics(response.data.data);
      if (user) {
        setMergedAnalyticsCache({
          uid: user.uid,
          timeframe: tf,
          selectedExercise,
          analytics: response.data.data,
        });
      }
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
      setPersonalRecords(response.data.data);
      if (user) {
        setMergedAnalyticsCache({
          uid: user.uid,
          personalRecords: response.data.data,
        });
      }
    } catch {
      // Personal records are supplemental; keep analytics usable if unavailable.
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
    setSelectedExercise(exercise);
    setSelectedWorkout(null);
    fetchExerciseProgress(exercise);
  };

  const changeTimeframe = (next) => {
    setTimeframe(next);
    setSelectedWorkout(null);
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

      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(user.uid, 1, 100)
      );
      const entries = response.data.data || [];

      // More selective filtering for workout data
      const workoutEntries = entries.filter((entry) => {
        if (!entry.description) return false;

        const desc = entry.description.toLowerCase();

        // Look for specific workout patterns - more strict criteria
        const hasWeight =
          desc.includes("lbs") || desc.includes("kg") || desc.includes("lb");
        const hasReps = /\d+\s+\d+/.test(entry.description); // Numbers followed by numbers
        const hasExerciseKeywords =
          /(bench|squat|deadlift|curl|press|row|pull|push|leg|arm|chest|back|shoulder|lat|dip|chin|overhead|military|incline|decline|bb|db|barbell|dumbbell|curls|pulldown|fly|extension|tricep|bicep|pec|delt|machine|mch|mchn|iso|lateral|bent|over|assisted|wg|wide|grip|seated|seat|cable|unilateral|rev|reverse|preacher|preach|farmers|carry|raises|hammer|pullover|smith|calf|calves|bp|elevated|elated|sublime|supline|cheat|dec|alt|angle|handle|pushdown|pushdown|extn|ext|tri|bi|cls|grp|hg|hi|single|arm|seated|seatd|cble|chst|prss|wide|chest)/i.test(
            entry.description
          );
        const hasWorkoutFormat = /^\s*[a-z\s]+\s+\d+/.test(entry.description); // Exercise name followed by numbers
        const hasMultipleSets = /(\d+\s*x\s*\d+|\d+\s+\d+\s+\d+)/.test(
          entry.description
        ); // Multiple sets pattern

        // Must have at least 3 of these indicators to be considered a workout (more strict)
        const indicators = [
          hasWeight,
          hasReps,
          hasExerciseKeywords,
          hasWorkoutFormat,
          hasMultipleSets,
        ];
        const validIndicators = indicators.filter(Boolean).length;

        return validIndicators >= 3; // More strict requirement
      });

      setUserEntries(entries); // Store all entries, not just filtered ones

      setMergedAnalyticsCache({
        uid: user.uid,
        userEntries: entries,
      });

      // Check which entries are already processed
      const processedIds = await checkProcessedEntries(entries);

      // Auto-process new entries if enabled and hasn't been done yet
      if (
        autoProcessEnabled &&
        !hasAutoProcessed &&
        workoutEntries.length > 0
      ) {
        // Use the processedIds we just got instead of relying on state
        const trulyUnprocessed = workoutEntries.filter(
          (entry) => !processedIds.has(entry._id)
        );

        if (trulyUnprocessed.length > 0) {
          setHasAutoProcessed(true); // Prevent future auto-processing
          autoProcessNewEntries(trulyUnprocessed); // Pass only workout entries
        }
      }
    } catch {
      // Entries are supplemental; analytics can still render without them.
    }
  };

  const checkProcessedEntries = async (entries) => {
    if (entries.length === 0) return new Set();

    try {
      // Get all workouts for the current user using the workouts endpoint
      const response = await apiClient.get(API_ENDPOINTS.GET_WORKOUTS);
      const workouts = response.data;
      const processedIds = new Set();

      workouts.forEach((workout) => {
        if (workout.entryId) {
          processedIds.add(workout.entryId);
        }
      });

      setProcessedEntryIds(processedIds);
      try {
        const user = await getCurrentAuthUser();
        if (user) {
          setMergedAnalyticsCache({
            uid: user.uid,
            processedEntryIds: Array.from(processedIds),
          });
        }
      } catch {
        // ignore
      }

      return processedIds;
    } catch {
      return new Set();
    }
  };

  const autoProcessNewEntries = async (entries) => {
    if (entries.length === 0) return;

    let processedCount = 0;

    for (const entry of entries) {
      try {
        // Log the entry being processed for debugging
        await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entry._id));
        processedCount++;
        // Mark as processed immediately
        setProcessedEntryIds((prev) => new Set([...prev, entry._id]));

        // Update the entry in the list to show as processed
        setUserEntries((prev) =>
          prev.map((e) => (e._id === entry._id ? { ...e, processed: true } : e))
        );
      } catch (error) {
        // Handle different types of errors
        if (error.response?.data?.message?.includes("already processed")) {
          setProcessedEntryIds((prev) => new Set([...prev, entry._id]));
        } else if (
          error.response?.data?.message?.includes("No valid exercises found")
        ) {
          // Skip entries that don't contain valid workout data
          setSkippedEntries((prev) => [
            ...prev,
            {
              id: entry._id,
              name: entry.name,
              description: entry.description,
              reason: "No valid exercises found",
            },
          ]);
        } else {
          // For other errors, show more details
          setSkippedEntries((prev) => [
            ...prev,
            {
              id: entry._id,
              name: entry.name,
              description: entry.description,
              reason: error.response?.data?.message || "Unknown error",
            },
          ]);
        }
      }
    }

    // Refresh analytics after auto-processing
    if (processedCount > 0) {
      fetchAnalytics();
      fetchPersonalRecords();
    }
  };

  const processEntry = async (entryId) => {
    try {
      setProcessingEntry(entryId);
      await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entryId));

      // Mark this entry as processed
      setProcessedEntryIds((prev) => new Set([...prev, entryId]));

      // Refresh everything after processing
      fetchAnalytics();
      fetchPersonalRecords();
      fetchUserEntries(); // Refresh the entries list
    } catch (error) {
      if (error.response?.data?.message?.includes("already processed")) {
        // Mark as processed and remove from list
        setProcessedEntryIds((prev) => new Set([...prev, entryId]));
        setUserEntries((prev) => prev.filter((entry) => entry._id !== entryId));
      } else {
        showToast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to process workout data",
          status: "error",
        });
      }
    } finally {
      setProcessingEntry(null);
    }
  };

  const autoProcessAll = async () => {
    if (userEntries.length === 0) {
      return;
    }

    // Filter out already processed entries
    const unprocessedEntries = userEntries.filter(
      (entry) => !processedEntryIds.has(entry._id)
    );

    if (unprocessedEntries.length === 0) {
      return;
    }

    setAutoProcessing(true);

    for (const entry of unprocessedEntries) {
      try {
        await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entry._id));
        setProcessedEntryIds((prev) => new Set([...prev, entry._id]));
      } catch (error) {
        if (error.response?.data?.message?.includes("already processed")) {
          setProcessedEntryIds((prev) => new Set([...prev, entry._id]));
        }
      }
    }

    setAutoProcessing(false);

    fetchAnalytics();
    fetchPersonalRecords();
    fetchUserEntries();
  };

  const resetAutoProcessedFlag = () => {
    setHasAutoProcessed(false);
  };

  const reprocessAllWorkoutsWithNormalization = async () => {
    try {
      setAutoProcessing(true);
      await apiClient.post(API_ENDPOINTS.COMPLETELY_REPROCESS_ALL_WORKOUTS);

      fetchAnalytics();
      fetchPersonalRecords();
    } catch {
      showToast({
        title: "Error",
        description: "Failed to reprocess workouts",
        status: "error",
      });
    } finally {
      setAutoProcessing(false);
    }
  };


  const periodPhrase =
    TIMEFRAMES.find((item) => item.value === timeframe)?.phrase ?? "lately";
  const unprocessedEntries = userEntries.filter(
    (entry) => !processedEntryIds.has(entry._id)
  );
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
  const exerciseNames = Object.keys(exercisesByName).sort((a, b) =>
    a.localeCompare(b)
  );
  const bestLifts = Object.entries(exercisesByName)
    .filter(([, stats]) => Number(stats?.maxWeight) > 0)
    .sort((a, b) => (b[1].maxWeight || 0) - (a[1].maxWeight || 0));
  const visibleBests = showAllBests
    ? bestLifts
    : bestLifts.slice(0, BEST_LIFTS_PREVIEW);
  const workoutCount = analytics?.totalWorkouts ?? 0;
  const pageShellProps = {
    maxW: "2xl",
    pt: "calc(env(safe-area-inset-top, 0px) + 3.5rem)",
    pb: 24,
    px: { base: 6, md: 8 },
    minH: "100dvh",
    bg: pageBg,
    color: cardText,
  };

  const timeframeChips = (
    <HStack spacing={0} flexWrap="wrap" mt={10} ml={-2}>
      {TIMEFRAMES.map((item) => {
        const selected = timeframe === item.value;
        return (
          <Button
            key={item.value}
            variant="ghost"
            size="sm"
            h="auto"
            py={2}
            px={3}
            fontWeight={selected ? "semibold" : "normal"}
            color={selected ? cardText : mutedText}
            bg="transparent"
            borderRadius="md"
            _hover={{ bg: "transparent", color: cardText }}
            _active={{ bg: "transparent" }}
            onClick={() => changeTimeframe(item.value)}
          >
            {item.label}
          </Button>
        );
      })}
    </HStack>
  );

  const pendingWorkouts = unprocessedEntries.length > 0 && (
    <Box>
      <SectionEyebrow color={mutedText}>Waiting to be added</SectionEyebrow>
      <Text
        fontSize="lg"
        lineHeight="tall"
        color={cardText}
        maxW="md"
        mb={6}
      >
        {unprocessedEntries.length === 1
          ? "One workout is not in your stats yet."
          : `${unprocessedEntries.length} workouts are not in your stats yet.`}
      </Text>
      <HStack spacing={4} flexWrap="wrap">
        <Button
          {...primarySolidButtonProps}
          size="md"
          borderRadius="full"
          px={6}
          onClick={autoProcessAll}
          isLoading={autoProcessing}
          spinner={<ButtonLoadingSpinner />}
          loadingText="Adding"
        >
          Add them
        </Button>
        <Button
          variant="ghost"
          size="md"
          color={mutedText}
          _hover={{ bg: "transparent", color: cardText }}
          onClick={() => setShowPendingDetails((open) => !open)}
        >
          {showPendingDetails ? "Hide list" : "See which ones"}
        </Button>
      </HStack>
      <Collapse in={showPendingDetails} animateOpacity>
        <VStack spacing={5} align="stretch" mt={8}>
          {unprocessedEntries.slice(0, 6).map((entry) => (
            <HStack key={entry._id} justify="space-between" align="flex-start" spacing={4}>
              <Box flex={1} minW={0}>
                <Text fontWeight="medium" color={cardText} noOfLines={1}>
                  {entry.name}
                </Text>
                <Text fontSize="sm" color={mutedText} noOfLines={2} mt={1}>
                  {entry.description}
                </Text>
              </Box>
              <Button
                size="sm"
                variant="ghost"
                color={colors.primary}
                _hover={{ bg: "transparent", color: cardText }}
                onClick={() => processEntry(entry._id)}
                isLoading={processingEntry === entry._id}
                spinner={<ButtonLoadingSpinner />}
                loadingText="Adding"
              >
                Add
              </Button>
            </HStack>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );

  const moreOptions = (
    <Box>
      <Button
        variant="ghost"
        size="sm"
        px={0}
        color={mutedText}
        fontWeight="normal"
        _hover={{ bg: "transparent", color: cardText }}
        onClick={() => setShowMoreOptions((open) => !open)}
      >
        {showMoreOptions ? "Hide extra tools" : "More options"}
      </Button>
      <Collapse in={showMoreOptions} animateOpacity>
        <VStack spacing={5} align="stretch" mt={6}>
          <Text fontSize="sm" color={mutedText} lineHeight="tall" maxW="md">
            These are only needed if something looks off, or you want workouts
            added on their own.
          </Text>
          <HStack spacing={4} flexWrap="wrap">
            <Button
              size="sm"
              variant="ghost"
              px={0}
              color={cardText}
              fontWeight="normal"
              _hover={{ bg: "transparent", color: colors.primary }}
              onClick={() => setAutoProcessEnabled(!autoProcessEnabled)}
            >
              Auto-add new workouts: {autoProcessEnabled ? "on" : "off"}
            </Button>
            {hasAutoProcessed && (
              <Button
                size="sm"
                variant="ghost"
                px={0}
                color={mutedText}
                fontWeight="normal"
                _hover={{ bg: "transparent", color: cardText }}
                onClick={resetAutoProcessedFlag}
              >
                Reset auto-add
              </Button>
            )}
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            px={0}
            alignSelf="flex-start"
            color={cardText}
            fontWeight="normal"
            _hover={{ bg: "transparent", color: colors.primary }}
            onClick={reprocessAllWorkoutsWithNormalization}
            isLoading={autoProcessing}
            spinner={<ButtonLoadingSpinner />}
            loadingText="Cleaning up"
          >
            Clean up exercise names
          </Button>
          <GymNameHelper />
          {skippedEntries.length > 0 && (
            <Box>
              <Text fontSize="sm" color={mutedText} mb={3}>
                {skippedEntries.length === 1
                  ? "One note could not be added."
                  : `${skippedEntries.length} notes could not be added.`}
              </Text>
              <VStack spacing={3} align="stretch">
                {skippedEntries.map((entry) => (
                  <Box key={entry.id}>
                    <Text fontSize="sm" fontWeight="medium" color={cardText}>
                      {entry.name}
                    </Text>
                    <Text fontSize="xs" color={mutedText} mt={1}>
                      {entry.reason}
                    </Text>
                  </Box>
                ))}
              </VStack>
              <Button
                size="sm"
                variant="ghost"
                px={0}
                mt={3}
                color={mutedText}
                fontWeight="normal"
                _hover={{ bg: "transparent", color: cardText }}
                onClick={() => setSkippedEntries([])}
              >
                Dismiss
              </Button>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  );

  if (loading) {
    return (
      <Container {...pageShellProps}>
        <Center minH="50vh">
          <VStack spacing={8}>
            <Box color={cardText}>
              <LoadingIndicator variant="page" />
            </Box>
            <Text color={mutedText} fontSize="sm">
              Getting your progress ready…
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (isAuthenticated === false) {
    return <SignedOutTabPrompt variant="analytics" />;
  }

  if (!analytics || workoutCount === 0) {
    return (
      <Container {...pageShellProps}>
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "3xl", md: "4xl" }}
            fontWeight="medium"
            letterSpacing="-0.03em"
            lineHeight="1.15"
            mb={4}
          >
            Your progress
          </Heading>
          <Text
            fontSize="lg"
            color={mutedText}
            lineHeight="tall"
            maxW="md"
          >
            {unprocessedEntries.length > 0
              ? "Add the workouts you already logged, and this page will fill in with a simple picture of how training is going."
              : analytics
                ? `No workouts ${periodPhrase} yet. Try a longer stretch above, or log a session.`
                : "Log a few sessions and this page will stay quiet and clear — just the numbers that matter."}
          </Text>
          {timeframeChips}
        </Box>

        <VStack spacing={16} align="stretch" mt={16}>
          {unprocessedEntries.length === 0 && (
            <Box>
              <Button
                as={RouterLink}
                to="/create"
                {...primarySolidButtonProps}
                size="md"
                borderRadius="full"
                px={6}
              >
                Log a workout
              </Button>
            </Box>
          )}
          {pendingWorkouts}
          {bestLifts.length > 0 && (
            <Box>
              <SectionEyebrow color={mutedText}>Best lifts</SectionEyebrow>
              <VStack spacing={6} align="stretch">
                {visibleBests.map(([exerciseName, stats]) => (
                  <HStack key={exerciseName} justify="space-between" align="baseline">
                    <Text color={cardText} pr={4}>
                      {exerciseName}
                    </Text>
                    <Text color={mutedText} whiteSpace="nowrap">
                      {stats.maxWeight} lbs
                    </Text>
                  </HStack>
                ))}
              </VStack>
              {bestLifts.length > BEST_LIFTS_PREVIEW && (
                <Button
                  variant="ghost"
                  size="sm"
                  mt={6}
                  px={0}
                  color={mutedText}
                  fontWeight="normal"
                  _hover={{ bg: "transparent", color: cardText }}
                  onClick={() => setShowAllBests((open) => !open)}
                >
                  {showAllBests ? "Show fewer" : "See all lifts"}
                </Button>
              )}
            </Box>
          )}
          {moreOptions}
        </VStack>
      </Container>
    );
  }

  return (
    <Container {...pageShellProps}>
      <Box>
        <Heading
          as="h1"
          fontSize={{ base: "3xl", md: "4xl" }}
          fontWeight="medium"
          letterSpacing="-0.03em"
          lineHeight="1.15"
          mb={4}
        >
          Your progress
        </Heading>
        <Text fontSize="lg" color={mutedText} lineHeight="tall" maxW="md">
          A simple look at how your training is going.
        </Text>
        {timeframeChips}
      </Box>

      <Box mt={{ base: 16, md: 20 }}>
        <Text
          fontSize={{ base: "6xl", md: "7xl" }}
          fontWeight="medium"
          letterSpacing="-0.05em"
          lineHeight="0.95"
          color={cardText}
        >
          {workoutCount}
        </Text>
        <Text fontSize="lg" color={mutedText} mt={4}>
          {workoutCount === 1 ? "workout" : "workouts"} {periodPhrase}
        </Text>
        <VStack align="start" spacing={2} mt={10}>
          <Text color={cardText}>
            {Math.round(analytics.totalVolume).toLocaleString()} lbs lifted
          </Text>
          <Text color={mutedText} fontSize="sm">
            {exerciseNames.length === 1
              ? "1 different exercise"
              : `${exerciseNames.length} different exercises`}
          </Text>
        </VStack>
      </Box>

      {bestLifts.length > 0 && (
        <Box mt={{ base: 20, md: 24 }}>
          <SectionEyebrow color={mutedText}>Best lifts</SectionEyebrow>
          <VStack spacing={6} align="stretch">
            {visibleBests.map(([exerciseName, stats]) => (
              <HStack key={exerciseName} justify="space-between" align="baseline">
                <Text color={cardText} pr={6}>
                  {exerciseName}
                </Text>
                <Text color={mutedText} whiteSpace="nowrap">
                  {stats.maxWeight} lbs
                </Text>
              </HStack>
            ))}
          </VStack>
          {bestLifts.length > BEST_LIFTS_PREVIEW && (
            <Button
              variant="ghost"
              size="sm"
              mt={6}
              px={0}
              color={mutedText}
              fontWeight="normal"
              _hover={{ bg: "transparent", color: cardText }}
              onClick={() => setShowAllBests((open) => !open)}
            >
              {showAllBests ? "Show fewer" : "See all lifts"}
            </Button>
          )}
        </Box>
      )}

      {exerciseNames.length > 0 && (
        <Box mt={{ base: 20, md: 24 }}>
          <SectionEyebrow color={mutedText}>One exercise</SectionEyebrow>
          <Text color={mutedText} lineHeight="tall" maxW="md" mb={8}>
            Pick a movement to see how it has been going.
          </Text>
          <Select
            placeholder="Choose an exercise"
            value={selectedExercise}
            onChange={(e) => handleExerciseSelect(e.target.value)}
            variant="flushed"
            maxW="sm"
            {...controlProps}
            bg="transparent"
            borderColor={softBorderColor}
          >
            {exerciseNames.map((exercise) => (
              <option key={exercise} value={exercise}>
                {exercise}
              </option>
            ))}
          </Select>

          {progressLoading && (
            <Center py={16}>
              <Box color={cardText}>
                <LoadingIndicator variant="inline" />
              </Box>
            </Center>
          )}

          {!progressLoading &&
            exerciseProgress &&
            exerciseProgress.dataPoints.length > 0 && (
              <Box mt={12}>
                <Suspense
                  fallback={
                    <Center py={16}>
                      <Box color={cardText}>
                        <LoadingIndicator variant="inline" />
                      </Box>
                    </Center>
                  }
                >
                  {chartType === "simple" ? (
                    <ExerciseProgressChart
                      exerciseProgress={exerciseProgress}
                      exerciseName={exerciseProgress.exercise}
                    />
                  ) : (
                    <MultiMetricProgressChart
                      exerciseProgress={exerciseProgress}
                      exerciseName={exerciseProgress.exercise}
                    />
                  )}
                </Suspense>

                <Box mt={8}>
                  <ProgressInsights exerciseProgress={exerciseProgress} />
                </Box>

                <Button
                  variant="ghost"
                  size="sm"
                  mt={4}
                  px={0}
                  color={mutedText}
                  fontWeight="normal"
                  _hover={{ bg: "transparent", color: cardText }}
                  onClick={() =>
                    setChartType((current) =>
                      current === "simple" ? "multi" : "simple"
                    )
                  }
                >
                  {chartType === "simple"
                    ? "Compare more numbers"
                    : "Just show weight"}
                </Button>

                {exerciseProgress.dataPoints.length > 0 && (
                  <Box mt={14}>
                    <Text fontSize="sm" color={mutedText} mb={6}>
                      Recent sessions
                    </Text>
                    <VStack spacing={5} align="stretch">
                      {exerciseProgress.dataPoints
                        .slice(-3)
                        .reverse()
                        .map((point, index) => {
                          const selected = isSameSession(
                            selectedWorkout,
                            point,
                          );
                          return (
                            <Box key={`${point.date}-${index}`}>
                              <HStack
                                as="button"
                                type="button"
                                w="full"
                                justify="space-between"
                                align="baseline"
                                cursor="pointer"
                                textAlign="left"
                                bg="transparent"
                                border="none"
                                p={0}
                                _hover={{ color: colors.primary }}
                                aria-expanded={selected}
                                onClick={() =>
                                  setSelectedWorkout(selected ? null : point)
                                }
                              >
                                <Text color={cardText}>
                                  {new Date(point.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </Text>
                                <Text color={mutedText}>
                                  {point.weight} lbs × {point.reps}
                                </Text>
                              </HStack>
                              <Collapse in={selected} animateOpacity>
                                <WorkoutDetailsModal
                                  workoutData={point}
                                  exerciseName={
                                    exerciseProgress?.exercise || ""
                                  }
                                />
                              </Collapse>
                            </Box>
                          );
                        })}
                    </VStack>
                  </Box>
                )}
              </Box>
            )}

          {!progressLoading &&
            selectedExercise &&
            exerciseProgress &&
            exerciseProgress.dataPoints.length === 0 && (
              <Text color={mutedText} mt={10} lineHeight="tall" maxW="md">
                No sessions for this exercise {periodPhrase} yet.
              </Text>
            )}
        </Box>
      )}

      <VStack spacing={16} align="stretch" mt={{ base: 20, md: 24 }}>
        {pendingWorkouts}
        {moreOptions}
      </VStack>
    </Container>
  );
};

export default AnalyticsPage;
