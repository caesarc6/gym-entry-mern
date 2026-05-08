import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Select,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Icon,
} from "@chakra-ui/react";
import { FiExternalLink } from "react-icons/fi";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import GymNameHelper from "../components/GymNameHelper";
import ExerciseProgressChart from "../components/ExerciseProgressChart";
import MultiMetricProgressChart from "../components/MultiMetricProgressChart";
import ProgressInsights from "../components/ProgressInsights";
import WorkoutDetailsModal from "../components/modals/WorkoutDetailsModal";
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import { useThemeColors } from "../hooks/useThemeColors";

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
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const { showToast } = useCustomToast();
  const colors = useThemeColors();
  const pageBg = colors.background;
  const cardBg = colors.bgCard;
  const cardText = colors.textPrimary;
  const mutedText = colors.textMuted;
  const rowBg = colors.muted;
  const rowHoverBg = colors.bgHover;
  const borderColor = colors.borderColor;
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
  const cardProps = {
    bg: cardBg,
    color: cardText,
    border: "1px solid",
    borderColor: softBorderColor,
    boxShadow: "sm",
  };
  const rowProps = {
    bg: rowBg,
    color: cardText,
    border: "1px solid",
    borderColor,
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

  const fetchAnalytics = async (authedUser = null) => {
    try {
      // Check if user is authenticated
      const user = authedUser || (await getCurrentAuthUser());
      if (!user) {
        return;
      }

      const response = await apiClient.get(
        API_ENDPOINTS.WORKOUT_ANALYTICS(timeframe, selectedExercise)
      );
      setAnalytics(response.data.data);
      if (user) {
        setMergedAnalyticsCache({
          uid: user.uid,
          timeframe,
          selectedExercise,
          analytics: response.data.data,
        });
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showToast({
          title: "Authentication Required",
          description: "Please log in to view analytics",
          status: "warning",
        });
      } else {
        showToast({
          title: "Error",
          description: "Failed to load analytics",
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

  const fetchExerciseProgress = async (exercise) => {
    if (!exercise) return;

    try {
      setProgressLoading(true);
      const response = await apiClient.get(
        API_ENDPOINTS.EXERCISE_PROGRESS(exercise, timeframe)
      );
      setExerciseProgress(response.data.data);
      const user = await getCurrentAuthUser();
      if (user) {
        setMergedAnalyticsCache({
          uid: user.uid,
          timeframe,
          selectedExercise: exercise,
          exerciseProgress: response.data.data,
        });
      }
    } catch {
      showToast({
        title: "Error",
        description: "Failed to load exercise progress",
        status: "error",
      });
    } finally {
      setProgressLoading(false);
    }
  };

  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise);
    fetchExerciseProgress(exercise);
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
    let skippedCount = 0;

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
          skippedCount++;
        } else if (
          error.response?.data?.message?.includes("No valid exercises found")
        ) {
          // Skip entries that don't contain valid workout data
          skippedCount++;
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

    // Show appropriate message based on results
    if (processedCount > 0) {
      showToast({
        title: "Auto-Processed Workouts",
        description: `Successfully processed ${processedCount} workout entries${
          skippedCount > 0 ? `, skipped ${skippedCount} invalid entries` : ""
        }`,
        status: "success",
      });

      // Refresh analytics after auto-processing
      fetchAnalytics();
      fetchPersonalRecords();
    } else if (skippedCount > 0) {
      showToast({
        title: "No Valid Workouts Found",
        description: `Skipped ${skippedCount} entries that don't contain valid workout data`,
        status: "info",
      });
    }
  };

  const processEntry = async (entryId) => {
    try {
      setProcessingEntry(entryId);
      await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entryId));
      showToast({
        title: "Success",
        description: "Workout data processed successfully",
        status: "success",
      });

      // Mark this entry as processed
      setProcessedEntryIds((prev) => new Set([...prev, entryId]));

      // Refresh everything after processing
      fetchAnalytics();
      fetchPersonalRecords();
      fetchUserEntries(); // Refresh the entries list
    } catch (error) {
      if (error.response?.data?.message?.includes("already processed")) {
        showToast({
          title: "Already Processed",
          description: "This workout has already been processed",
          status: "info",
        });
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
      showToast({
        title: "No Entries",
        description: "No workout entries to process",
        status: "info",
      });
      return;
    }

    // Filter out already processed entries
    const unprocessedEntries = userEntries.filter(
      (entry) => !processedEntryIds.has(entry._id)
    );

    if (unprocessedEntries.length === 0) {
      showToast({
        title: "All Processed",
        description: "All workout entries have already been processed",
        status: "info",
      });
      return;
    }

    setAutoProcessing(true);
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const entry of unprocessedEntries) {
      try {
        await apiClient.post(API_ENDPOINTS.PROCESS_WORKOUT(entry._id));
        processedCount++;
        // Mark as processed immediately
        setProcessedEntryIds((prev) => new Set([...prev, entry._id]));

        showToast({
          title: "Processing...",
          description: `Processed ${processedCount} of ${unprocessedEntries.length} entries`,
          status: "info",
        });
      } catch (error) {
        errorCount++;

        // If already processed, mark it as such
        if (error.response?.data?.message?.includes("already processed")) {
          setProcessedEntryIds((prev) => new Set([...prev, entry._id]));
          skippedCount++;
        }
      }
    }

    setAutoProcessing(false);

    const message = `Successfully processed ${processedCount} entries`;
    const details = [];
    if (skippedCount > 0) details.push(`${skippedCount} already processed`);
    if (errorCount > 0) details.push(`${errorCount} failed`);

    showToast({
      title: "Auto Processing Complete",
      description: `${message}${
        details.length > 0 ? ` (${details.join(", ")})` : ""
      }`,
      status: processedCount > 0 ? "success" : "info",
    });

    // Refresh everything
    fetchAnalytics();
    fetchPersonalRecords();
    fetchUserEntries();
  };

  const resetAutoProcessedFlag = () => {
    setHasAutoProcessed(false);
    showToast({
      title: "Auto-Processing Reset",
      description:
        "Auto-processing has been reset and will run again when enabled",
      status: "info",
    });
  };

  const reprocessAllWorkoutsWithNormalization = async () => {
    try {
      setAutoProcessing(true);
      const response = await apiClient.post(
        API_ENDPOINTS.COMPLETELY_REPROCESS_ALL_WORKOUTS
      );

      showToast({
        title: "Reprocessing Complete",
        description: response.data.data.message,
        status: "success",
      });

      // Refresh analytics to show updated gym names and exercise names
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

  if (loading) {
    return (
      <Container
        maxW="container.xl"
        pt="calc(env(safe-area-inset-top, 0px) + 2rem)"
        pb={8}
        minH="100dvh"
        bg={pageBg}
        color={cardText}
      >
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color={cardText} />
            <Text color={mutedText}>Loading analytics...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  // Check if user is not authenticated
  if (isAuthenticated === false) {
    return <SignedOutTabPrompt variant="analytics" />;
  }

  if (!analytics) {
    return (
      <Container
        maxW="container.xl"
        pt="calc(env(safe-area-inset-top, 0px) + 2rem)"
        pb={8}
        minH="100dvh"
        bg={pageBg}
        color={cardText}
      >
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={4} color={cardText}>
              Workout Analytics
            </Heading>
            <Text mb={4} color={mutedText}>
              No workout analytics found. You need to process your workout
              entries first.
            </Text>
            <GymNameHelper />
          </Box>

          {/* Show unprocessed entries */}
          {userEntries.length > 0 && (
            <Card {...cardProps}>
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Heading size="md" color={cardText}>
                      Workout Entries
                    </Heading>
                    <Text fontSize="sm" color={mutedText} mt={1}>
                      {autoProcessEnabled
                        ? hasAutoProcessed
                          ? "Auto-processing has run. Use 'Reset' to run it again, or manually process remaining entries below."
                          : "New workouts will be automatically processed when the page loads."
                        : "Click 'Process' on any entry below to convert it to workout data for analytics."}
                    </Text>
                  </Box>
                  <VStack spacing={2} align="end">
                    <HStack spacing={2}>
                      <Text fontSize="sm" color={mutedText}>
                        Auto-process:
                      </Text>
                      <Button
                        size="xs"
                        variant={autoProcessEnabled ? "solid" : "outline"}
                        colorScheme={autoProcessEnabled ? "green" : "gray"}
                        onClick={() =>
                          setAutoProcessEnabled(!autoProcessEnabled)
                        }
                      >
                        {autoProcessEnabled ? "ON" : "OFF"}
                      </Button>
                      {hasAutoProcessed && (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="orange"
                          onClick={resetAutoProcessedFlag}
                        >
                          Reset
                        </Button>
                      )}
                    </HStack>
                    <Button
                      colorScheme="blue"
                      onClick={autoProcessAll}
                      isLoading={autoProcessing}
                      loadingText="Processing All"
                      size="sm"
                    >
                      Process All Remaining (
                      {
                        userEntries.filter((e) => !processedEntryIds.has(e._id))
                          .length
                      }
                      )
                    </Button>
                    <Button
                      colorScheme="purple"
                      onClick={reprocessAllWorkoutsWithNormalization}
                      isLoading={autoProcessing}
                      loadingText="Reprocessing"
                      size="sm"
                      variant="outline"
                    >
                      Fix Exercise Names
                    </Button>
                  </VStack>
                </HStack>
                <VStack spacing={3} align="stretch">
                  {userEntries.slice(0, 5).map((entry) => {
                    const isProcessed = processedEntryIds.has(entry._id);
                    return (
                      <HStack
                        key={entry._id}
                        justify="space-between"
                        p={3}
                        {...rowProps}
                        borderRadius="md"
                        opacity={isProcessed ? 0.6 : 1}
                      >
                        <VStack align="start" flex={1}>
                          <HStack>
                            <Text fontWeight="bold" color={cardText}>
                              {entry.name}
                            </Text>
                            {isProcessed && (
                              <Badge colorScheme="green" size="sm">
                                Processed
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color={mutedText} noOfLines={2}>
                            {entry.description}
                          </Text>
                        </VStack>
                        <Button
                          size="sm"
                          colorScheme={isProcessed ? "gray" : "blue"}
                          onClick={() => processEntry(entry._id)}
                          isLoading={processingEntry === entry._id}
                          loadingText="Processing"
                          isDisabled={isProcessed}
                        >
                          {isProcessed ? "Processed" : "Process"}
                        </Button>
                      </HStack>
                    );
                  })}
                </VStack>
              </CardBody>
            </Card>
          )}

          {userEntries.length === 0 && (
            <Alert status="info">
              <AlertIcon />
              No workout entries found. Start logging your workouts to see
              analytics!
            </Alert>
          )}

          {/* Skipped Entries Section */}
          {skippedEntries.length > 0 && (
            <Card {...cardProps}>
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Heading size="md" color={cardText}>
                      Skipped Entries ({skippedEntries.length})
                    </Heading>
                    <Text fontSize="sm" color={mutedText} mt={1}>
                      These entries were skipped because they don&apos;t contain
                      valid workout data or couldn&apos;t be processed.
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkippedEntries([])}
                  >
                    Clear
                  </Button>
                </HStack>
                <VStack spacing={3} align="stretch">
                  {skippedEntries.map((entry) => (
                    <HStack
                      key={entry.id}
                      justify="space-between"
                      p={3}
                      bg="hsl(var(--destructive) / 0.08)"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="hsl(var(--destructive) / 0.28)"
                    >
                      <VStack align="start" flex={1}>
                        <HStack>
                          <Text fontWeight="bold" color={cardText}>
                            {entry.name}
                          </Text>
                          <Badge colorScheme="red" size="sm">
                            Skipped
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color={mutedText} noOfLines={2}>
                          {entry.description}
                        </Text>
                        <Text
                          fontSize="xs"
                          color="hsl(var(--destructive))"
                        >
                          Reason: {entry.reason}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    );
  }

  return (
    <Container
      maxW="container.xl"
      pt="calc(env(safe-area-inset-top, 0px) + 2rem)"
      pb={8}
      minH="100dvh"
      bg={pageBg}
      color={cardText}
    >
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4} color={cardText}>
            Workout Analytics
          </Heading>
          <HStack spacing={4} mb={6}>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              w="200px"
              {...controlProps}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </Select>
            <Button
              onClick={fetchAnalytics}
              size="sm"
              variant="outline"
              {...controlProps}
            >
              Refresh
            </Button>
          </HStack>
          <GymNameHelper />
        </Box>

        <Tabs variant="enclosed" color={cardText}>
          <TabList borderColor={borderColor} overflowX="auto" overflowY="hidden">
            <Tab
              color={mutedText}
              borderColor={borderColor}
              _selected={{ color: cardText, bg: cardBg, borderColor }}
            >
              Overview
            </Tab>
            <Tab
              color={mutedText}
              borderColor={borderColor}
              _selected={{ color: cardText, bg: cardBg, borderColor }}
            >
              Exercises
            </Tab>
            <Tab
              color={mutedText}
              borderColor={borderColor}
              _selected={{ color: cardText, bg: cardBg, borderColor }}
            >
              Personal Records
            </Tab>
            <Tab
              color={mutedText}
              borderColor={borderColor}
              _selected={{ color: cardText, bg: cardBg, borderColor }}
            >
              Progress
            </Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Card {...cardProps}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Total Workouts</StatLabel>
                      <StatNumber>{analytics.totalWorkouts}</StatNumber>
                      <StatHelpText>In selected timeframe</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card {...cardProps}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Total Volume</StatLabel>
                      <StatNumber>
                        {analytics.totalVolume.toLocaleString()}
                      </StatNumber>
                      <StatHelpText>lbs lifted</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card {...cardProps}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Avg Volume/Workout</StatLabel>
                      <StatNumber>
                        {Math.round(
                          analytics.averageVolumePerWorkout
                        ).toLocaleString()}
                      </StatNumber>
                      <StatHelpText>lbs per session</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card {...cardProps}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Unique Exercises</StatLabel>
                      <StatNumber>
                        {Object.keys(analytics.exercises).length}
                      </StatNumber>
                      <StatHelpText>Different exercises</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Splits and Gyms */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={8}>
                <Card {...cardProps}>
                  <CardBody>
                    <Heading size="md" mb={4} color={cardText}>
                      Workout Splits
                    </Heading>
                    <VStack align="start" spacing={2}>
                      {Object.entries(analytics.splits).map(
                        ([split, count]) => (
                          <HStack key={split} justify="space-between" w="full">
                            <Text fontWeight="medium" color={cardText}>
                              {split}
                            </Text>
                            <Badge colorScheme="blue">{count}</Badge>
                          </HStack>
                        )
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card {...cardProps}>
                  <CardBody>
                    <Heading size="md" mb={4} color={cardText}>
                      Gyms Visited
                    </Heading>
                    <VStack align="start" spacing={2}>
                      {Object.entries(analytics.gyms).map(([gym, count]) => (
                        <HStack key={gym} justify="space-between" w="full">
                          <Text fontWeight="medium" color={cardText}>{gym}</Text>
                          <Badge colorScheme="green">{count}</Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Unprocessed Entries Section */}
              {userEntries.length > 0 && (
                <Card {...cardProps} mt={8}>
                  <CardBody>
                    <HStack justify="space-between" mb={4}>
                      <Box>
                        <Heading size="md" color={cardText}>
                          Unprocessed Workout Entries (
                          {
                            userEntries.filter(
                              (entry) => !processedEntryIds.has(entry._id)
                            ).length
                          }
                          )
                        </Heading>
                        <Text fontSize="sm" color={mutedText} mt={1}>
                          {autoProcessEnabled
                            ? hasAutoProcessed
                              ? "Auto-processing has run. Use 'Reset' to run it again, or manually process remaining entries below."
                              : "New workouts will be automatically processed when the page loads."
                            : "Process these entries to add them to your analytics."}
                        </Text>
                      </Box>
                      <VStack spacing={2} align="end">
                        <HStack spacing={2}>
                          <Text fontSize="sm" color={mutedText}>
                            Auto-process:
                          </Text>
                          <Button
                            size="xs"
                            variant={autoProcessEnabled ? "solid" : "outline"}
                            colorScheme={autoProcessEnabled ? "green" : "gray"}
                            onClick={() =>
                              setAutoProcessEnabled(!autoProcessEnabled)
                            }
                          >
                            {autoProcessEnabled ? "ON" : "OFF"}
                          </Button>
                          {hasAutoProcessed && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="orange"
                              onClick={resetAutoProcessedFlag}
                            >
                              Reset
                            </Button>
                          )}
                        </HStack>
                        <Button
                          colorScheme="blue"
                          onClick={autoProcessAll}
                          isLoading={autoProcessing}
                          loadingText="Processing All"
                          size="sm"
                        >
                          Process All Remaining (
                          {
                            userEntries.filter(
                              (e) => !processedEntryIds.has(e._id)
                            ).length
                          }
                          )
                        </Button>
                        <Button
                          colorScheme="purple"
                          onClick={reprocessAllWorkoutsWithNormalization}
                          isLoading={autoProcessing}
                          loadingText="Reprocessing"
                          size="sm"
                          variant="outline"
                        >
                          Fix Exercise Names
                        </Button>
                      </VStack>
                    </HStack>
                    <VStack spacing={3} align="stretch">
                      {userEntries
                        .filter((entry) => !processedEntryIds.has(entry._id))
                        .slice(0, 5)
                        .map((entry) => (
                          <HStack
                            key={entry._id}
                            justify="space-between"
                            p={3}
                            {...rowProps}
                            borderRadius="md"
                          >
                            <VStack align="start" flex={1}>
                              <HStack>
                                <Text
                                  fontWeight="bold"
                                  fontSize="sm"
                                  color={cardText}
                                >
                                  {entry.name}
                                </Text>
                              </HStack>
                              <Text
                                fontSize="xs"
                                color={mutedText}
                                noOfLines={2}
                              >
                                {entry.description}
                              </Text>
                            </VStack>
                            <Button
                              size="xs"
                              colorScheme="blue"
                              onClick={() => processEntry(entry._id)}
                              isLoading={processingEntry === entry._id}
                              loadingText="Processing"
                            >
                              Process
                            </Button>
                          </HStack>
                        ))}
                      {userEntries.filter(
                        (entry) => !processedEntryIds.has(entry._id)
                      ).length === 0 && (
                        <Alert status="success">
                          <AlertIcon />
                          All workout entries have been processed! 🎉
                        </Alert>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </TabPanel>

            {/* Exercises Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {Object.entries(analytics.exercises).map(
                  ([exerciseName, stats]) => (
                    <Card key={exerciseName} {...cardProps}>
                      <CardBody>
                        <HStack justify="space-between" mb={4}>
                          <Heading size="md" color={cardText}>
                            {exerciseName}
                          </Heading>
                          <Button
                            size="sm"
                            variant="outline"
                            {...controlProps}
                            onClick={() => handleExerciseSelect(exerciseName)}
                          >
                            View Progress
                          </Button>
                        </HStack>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                          <Stat>
                            <StatLabel>Workouts</StatLabel>
                            <StatNumber>{stats.totalWorkouts}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Max Weight</StatLabel>
                            <StatNumber>{stats.maxWeight} lbs</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Total Volume</StatLabel>
                            <StatNumber>
                              {stats.totalVolume.toLocaleString()}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                      </CardBody>
                    </Card>
                  )
                )}
              </VStack>
            </TabPanel>

            {/* Personal Records Tab */}
            <TabPanel>
              {personalRecords && (
                <VStack spacing={4} align="stretch">
                  {Object.entries(personalRecords).map(
                    ([exerciseName, prs]) => (
                      <Card key={exerciseName} {...cardProps}>
                        <CardBody>
                          <Heading size="md" mb={4} color={cardText}>
                            {exerciseName}
                          </Heading>
                          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                            <Stat>
                              <StatLabel>Max Weight</StatLabel>
                              <StatNumber>{prs.maxWeight.value} lbs</StatNumber>
                              <StatHelpText>
                                {prs.maxWeight.date
                                  ? new Date(
                                      prs.maxWeight.date
                                    ).toLocaleDateString()
                                  : "No data"}
                              </StatHelpText>
                            </Stat>
                            <Stat>
                              <StatLabel>Max Volume</StatLabel>
                              <StatNumber>
                                {prs.maxVolume.value.toLocaleString()}
                              </StatNumber>
                              <StatHelpText>
                                {prs.maxVolume.date
                                  ? new Date(
                                      prs.maxVolume.date
                                    ).toLocaleDateString()
                                  : "No data"}
                              </StatHelpText>
                            </Stat>
                            <Stat>
                              <StatLabel>Max Reps</StatLabel>
                              <StatNumber>{prs.maxReps.value}</StatNumber>
                              <StatHelpText>
                                {prs.maxReps.date
                                  ? new Date(
                                      prs.maxReps.date
                                    ).toLocaleDateString()
                                  : "No data"}
                              </StatHelpText>
                            </Stat>
                          </SimpleGrid>
                        </CardBody>
                      </Card>
                    )
                  )}
                </VStack>
              )}
            </TabPanel>

            {/* Progress Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} wrap="wrap">
                  <Select
                    placeholder="Select exercise"
                    value={selectedExercise}
                    onChange={(e) => handleExerciseSelect(e.target.value)}
                    w="300px"
                    {...controlProps}
                  >
                    {Object.keys(analytics.exercises).map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={timeframe}
                    onChange={(e) => {
                      setTimeframe(e.target.value);
                      if (selectedExercise) {
                        fetchExerciseProgress(selectedExercise);
                      }
                    }}
                    w="150px"
                    {...controlProps}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </Select>
                </HStack>

                {progressLoading && (
                  <Center>
                    <Spinner color={cardText} />
                  </Center>
                )}

                {exerciseProgress && exerciseProgress.dataPoints.length > 0 && (
                  <>
                    {/* Chart Type Toggle */}
                    <HStack justify="center" spacing={4}>
                      <Button
                        size="sm"
                        variant={chartType === "simple" ? "solid" : "outline"}
                        colorScheme="blue"
                        onClick={() => setChartType("simple")}
                      >
                        Simple Chart
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === "multi" ? "solid" : "outline"}
                        colorScheme="green"
                        onClick={() => setChartType("multi")}
                      >
                        Multi-Metric Chart
                      </Button>
                    </HStack>

                    {/* Progress Chart */}
                    <Card {...cardProps}>
                      <CardBody>
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
                      </CardBody>
                    </Card>

                    {/* Progress Insights */}
                    <Card {...cardProps}>
                      <CardBody>
                        <ProgressInsights exerciseProgress={exerciseProgress} />
                      </CardBody>
                    </Card>

                    {/* Progress Stats */}
                    <Card {...cardProps}>
                      <CardBody>
                        <Heading size="md" mb={4} color={cardText}>
                          {exerciseProgress.exercise} Progress Summary
                        </Heading>
                        <VStack spacing={4} align="stretch">
                          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                            <Stat>
                              <StatLabel>Max Weight</StatLabel>
                              <StatNumber>
                                {exerciseProgress.maxWeight} lbs
                              </StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel>Max Volume</StatLabel>
                              <StatNumber>
                                {exerciseProgress.maxVolume.toLocaleString()}
                              </StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel>Max Reps</StatLabel>
                              <StatNumber>
                                {exerciseProgress.maxReps}
                              </StatNumber>
                            </Stat>
                          </SimpleGrid>

                          <Box>
                            <HStack justify="space-between" mb={2}>
                              <Text fontWeight="medium">
                                Recent Workouts:
                              </Text>
                              <Text
                                fontSize="xs"
                                color={mutedText}
                                fontStyle="italic"
                              >
                                Click any workout for details
                              </Text>
                            </HStack>
                            <VStack align="start" spacing={2}>
                              {exerciseProgress.dataPoints
                                .slice(-5)
                                .reverse()
                                .map((point, index) => (
                                  <HStack
                                    key={index}
                                    justify="space-between"
                                    w="full"
                                    p={3}
                                    {...rowProps}
                                    borderRadius="md"
                                    cursor="pointer"
                                    _hover={{
                                      bg: rowHoverBg,
                                      transform: "translateY(-1px)",
                                      boxShadow: "md",
                                    }}
                                    transition="all 0.2s"
                                    onClick={() => {
                                      setSelectedWorkout(point);
                                      setIsWorkoutModalOpen(true);
                                    }}
                                  >
                                    <VStack align="start" spacing={1}>
                                      <HStack spacing={2}>
                                        <Text fontWeight="medium" color={cardText}>
                                          {new Date(
                                            point.date
                                          ).toLocaleDateString()}
                                        </Text>
                                        <Icon
                                          as={FiExternalLink}
                                          color={mutedText}
                                          boxSize={3}
                                        />
                                      </HStack>
                                      <Text fontSize="xs" color={mutedText}>
                                        {new Date(point.date).toLocaleTimeString([], { 
                                          hour: "2-digit", 
                                          minute: "2-digit" 
                                        })}
                                      </Text>
                                    </VStack>
                                    <HStack spacing={3}>
                                      <Badge colorScheme="blue" variant="solid">
                                        {point.weight} lbs
                                      </Badge>
                                      <Badge colorScheme="green" variant="solid">
                                        {point.reps} reps
                                      </Badge>
                                      <Badge colorScheme="purple" variant="solid">
                                        {point.sets} sets
                                      </Badge>
                                      <Badge colorScheme="orange" variant="outline">
                                        {point.volume.toLocaleString()} vol
                                      </Badge>
                                    </HStack>
                                  </HStack>
                                ))}
                            </VStack>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </>
                )}

                {exerciseProgress &&
                  exerciseProgress.dataPoints.length === 0 && (
                    <Alert status="info">
                      <AlertIcon />
                      No progress data found for this exercise in the selected
                      timeframe.
                    </Alert>
                  )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Workout Details Modal */}
      <WorkoutDetailsModal
        isOpen={isWorkoutModalOpen}
        onClose={() => {
          setIsWorkoutModalOpen(false);
          setSelectedWorkout(null);
        }}
        workoutData={selectedWorkout}
        exerciseName={exerciseProgress?.exercise || ""}
      />
    </Container>
  );
};

export default AnalyticsPage;
