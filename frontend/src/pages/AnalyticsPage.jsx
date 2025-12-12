import React, { useState, useEffect } from "react";
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
  useColorModeValue,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Icon,
} from "@chakra-ui/react";
import { FiExternalLink } from "react-icons/fi";
import { auth } from "../firebase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import GymNameHelper from "../components/GymNameHelper";
import ExerciseProgressChart from "../components/ExerciseProgressChart";
import MultiMetricProgressChart from "../components/MultiMetricProgressChart";
import ProgressInsights from "../components/ProgressInsights";
import WorkoutDetailsModal from "../components/WorkoutDetailsModal";

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

  const { showToast } = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    // Wait for user to be authenticated before making API calls
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAnalytics();
        fetchPersonalRecords();
        fetchUserEntries();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await apiClient.get(
        API_ENDPOINTS.WORKOUT_ANALYTICS(timeframe, selectedExercise)
      );
      setAnalytics(response.data.data);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalRecords = async () => {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        return;
      }

      const response = await apiClient.get(API_ENDPOINTS.PERSONAL_RECORDS);
      setPersonalRecords(response.data.data);
    } catch (error) {
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
    } catch (error) {
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

  const fetchUserEntries = async () => {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        return;
      }

      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(auth.currentUser.uid, 1, 100)
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
    } catch (error) {
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

      return processedIds;
    } catch (error) {
      return new Set();
    }
  };

  const autoProcessNewEntries = async (entries) => {
    if (entries.length === 0) return;

    let processedCount = 0;
    let errorCount = 0;
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
        errorCount++;

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
      const response = await apiClient.post(
        API_ENDPOINTS.PROCESS_WORKOUT(entryId)
      );
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
    } catch (error) {
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
      <Container maxW="container.xl" py={8}>
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading analytics...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  // Check if user is not authenticated
  if (!auth.currentUser) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center>
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="medium">
              Please log in to view your workout analytics
            </Text>
            <Text fontSize="sm" color="gray.600">
              You need to be authenticated to access this page
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={4}>
              Workout Analytics
            </Heading>
            <Text mb={4}>
              No workout analytics found. You need to process your workout
              entries first.
            </Text>
            <GymNameHelper />
          </Box>

          {/* Show unprocessed entries */}
          {userEntries.length > 0 && (
            <Card bg={cardBg}>
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Heading size="md">Workout Entries</Heading>
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      {autoProcessEnabled
                        ? hasAutoProcessed
                          ? "Auto-processing has run. Use 'Reset' to run it again, or manually process remaining entries below."
                          : "New workouts will be automatically processed when the page loads."
                        : "Click 'Process' on any entry below to convert it to workout data for analytics."}
                    </Text>
                  </Box>
                  <VStack spacing={2} align="end">
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.600">
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
                        bg={bgColor}
                        borderRadius="md"
                        opacity={isProcessed ? 0.6 : 1}
                      >
                        <VStack align="start" flex={1}>
                          <HStack>
                            <Text fontWeight="bold">{entry.name}</Text>
                            {isProcessed && (
                              <Badge colorScheme="green" size="sm">
                                Processed
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="gray.500" noOfLines={2}>
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
            <Card bg={cardBg}>
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Heading size="md">
                      Skipped Entries ({skippedEntries.length})
                    </Heading>
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      These entries were skipped because they don't contain
                      valid workout data or couldn't be processed.
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
                      bg="red.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="red.200"
                      _dark={{ bg: "red.900/20", borderColor: "red.800" }}
                    >
                      <VStack align="start" flex={1}>
                        <HStack>
                          <Text fontWeight="bold">{entry.name}</Text>
                          <Badge colorScheme="red" size="sm">
                            Skipped
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.500" noOfLines={2}>
                          {entry.description}
                        </Text>
                        <Text
                          fontSize="xs"
                          color="red.500"
                          _dark={{ color: "red.400" }}
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
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4}>
            Workout Analytics
          </Heading>
          <HStack spacing={4} mb={6}>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              w="200px"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </Select>
            <Button onClick={fetchAnalytics} size="sm">
              Refresh
            </Button>
          </HStack>
          <GymNameHelper />
        </Box>

        <Tabs variant="enclosed">
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Exercises</Tab>
            <Tab>Personal Records</Tab>
            <Tab>Progress</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Card bg={cardBg}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Total Workouts</StatLabel>
                      <StatNumber>{analytics.totalWorkouts}</StatNumber>
                      <StatHelpText>In selected timeframe</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={cardBg}>
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

                <Card bg={cardBg}>
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

                <Card bg={cardBg}>
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
                <Card bg={cardBg}>
                  <CardBody>
                    <Heading size="md" mb={4}>
                      Workout Splits
                    </Heading>
                    <VStack align="start" spacing={2}>
                      {Object.entries(analytics.splits).map(
                        ([split, count]) => (
                          <HStack key={split} justify="space-between" w="full">
                            <Text fontWeight="medium">{split}</Text>
                            <Badge colorScheme="blue">{count}</Badge>
                          </HStack>
                        )
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={cardBg}>
                  <CardBody>
                    <Heading size="md" mb={4}>
                      Gyms Visited
                    </Heading>
                    <VStack align="start" spacing={2}>
                      {Object.entries(analytics.gyms).map(([gym, count]) => (
                        <HStack key={gym} justify="space-between" w="full">
                          <Text fontWeight="medium">{gym}</Text>
                          <Badge colorScheme="green">{count}</Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Unprocessed Entries Section */}
              {userEntries.length > 0 && (
                <Card bg={cardBg} mt={8}>
                  <CardBody>
                    <HStack justify="space-between" mb={4}>
                      <Box>
                        <Heading size="md">
                          Unprocessed Workout Entries (
                          {
                            userEntries.filter(
                              (entry) => !processedEntryIds.has(entry._id)
                            ).length
                          }
                          )
                        </Heading>
                        <Text fontSize="sm" color="gray.600" mt={1}>
                          {autoProcessEnabled
                            ? hasAutoProcessed
                              ? "Auto-processing has run. Use 'Reset' to run it again, or manually process remaining entries below."
                              : "New workouts will be automatically processed when the page loads."
                            : "Process these entries to add them to your analytics."}
                        </Text>
                      </Box>
                      <VStack spacing={2} align="end">
                        <HStack spacing={2}>
                          <Text fontSize="sm" color="gray.600">
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
                            bg={bgColor}
                            borderRadius="md"
                          >
                            <VStack align="start" flex={1}>
                              <HStack>
                                <Text fontWeight="bold" fontSize="sm">
                                  {entry.name}
                                </Text>
                              </HStack>
                              <Text
                                fontSize="xs"
                                color="gray.500"
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
                    <Card key={exerciseName} bg={cardBg}>
                      <CardBody>
                        <HStack justify="space-between" mb={4}>
                          <Heading size="md">{exerciseName}</Heading>
                          <Button
                            size="sm"
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
                      <Card key={exerciseName} bg={cardBg}>
                        <CardBody>
                          <Heading size="md" mb={4}>
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
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </Select>
                </HStack>

                {progressLoading && (
                  <Center>
                    <Spinner />
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
                    <Card bg={cardBg}>
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
                    <Card bg={cardBg}>
                      <CardBody>
                        <ProgressInsights exerciseProgress={exerciseProgress} />
                      </CardBody>
                    </Card>

                    {/* Progress Stats */}
                    <Card bg={cardBg}>
                      <CardBody>
                        <Heading size="md" mb={4}>
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
                              <Text fontSize="xs" color="gray.500" fontStyle="italic">
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
                                    bg={useColorModeValue('gray.50', 'gray.600')}
                                    borderRadius="md"
                                    cursor="pointer"
                                    _hover={{
                                      bg: useColorModeValue('gray.100', 'gray.500'),
                                      transform: 'translateY(-1px)',
                                      boxShadow: 'md',
                                    }}
                                    transition="all 0.2s"
                                    onClick={() => {
                                      setSelectedWorkout(point);
                                      setIsWorkoutModalOpen(true);
                                    }}
                                  >
                                    <VStack align="start" spacing={1}>
                                      <HStack spacing={2}>
                                        <Text fontWeight="medium">
                                          {new Date(
                                            point.date
                                          ).toLocaleDateString()}
                                        </Text>
                                        <Icon as={FiExternalLink} color="gray.400" boxSize={3} />
                                      </HStack>
                                      <Text fontSize="xs" color="gray.500">
                                        {new Date(point.date).toLocaleTimeString([], { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
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
