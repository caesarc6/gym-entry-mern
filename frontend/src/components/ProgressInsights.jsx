import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from "@chakra-ui/react";
import { useThemeColors } from "../hooks/useThemeColors";

const ProgressInsights = ({ exerciseProgress }) => {
  const colors = useThemeColors();
  const textColor = colors.textPrimary;
  const mutedText = colors.textMuted;
  const cardBg = colors.muted;
  const cardBorder = colors.borderColor;
  const insightCardProps = {
    bg: cardBg,
    color: textColor,
    border: "1px solid",
    borderColor: cardBorder,
    borderRadius: "lg",
  };

  if (
    !exerciseProgress ||
    !exerciseProgress.dataPoints ||
    exerciseProgress.dataPoints.length < 2
  ) {
    return (
      <Box p={4} textAlign="center">
        <Text color={mutedText}>
          Need at least 2 data points to show insights
        </Text>
      </Box>
    );
  }

  // Sort data points by date
  const sortedDataPoints = [...exerciseProgress.dataPoints].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Calculate insights
  const firstWorkout = sortedDataPoints[0];
  const lastWorkout = sortedDataPoints[sortedDataPoints.length - 1];
  const totalWorkouts = sortedDataPoints.length;
  const timeSpan = new Date(lastWorkout.date) - new Date(firstWorkout.date);
  const daysBetween = Math.ceil(timeSpan / (1000 * 60 * 60 * 24));

  // Weight progress
  const weightProgress = lastWorkout.weight - firstWorkout.weight;
  const weightProgressPercent = (
    (weightProgress / firstWorkout.weight) *
    100
  ).toFixed(1);
  const weightTrend =
    weightProgress > 0
      ? "increasing"
      : weightProgress < 0
      ? "decreasing"
      : "stable";

  // Volume progress
  const volumeProgress = lastWorkout.volume - firstWorkout.volume;
  const volumeProgressPercent = (
    (volumeProgress / firstWorkout.volume) *
    100
  ).toFixed(1);
  const volumeTrend =
    volumeProgress > 0
      ? "increasing"
      : volumeProgress < 0
      ? "decreasing"
      : "stable";

  // Reps progress
  const repsProgress = lastWorkout.reps - firstWorkout.reps;
  const repsProgressPercent = (
    (repsProgress / firstWorkout.reps) *
    100
  ).toFixed(1);
  const repsTrend =
    repsProgress > 0
      ? "increasing"
      : repsProgress < 0
      ? "decreasing"
      : "stable";

  // Consistency analysis
  const workoutFrequency =
    daysBetween > 0 ? ((totalWorkouts / daysBetween) * 7).toFixed(1) : 0;
  const consistencyLevel =
    workoutFrequency >= 3 ? "high" : workoutFrequency >= 2 ? "medium" : "low";

  // Find personal records
  const maxWeight = Math.max(...sortedDataPoints.map((p) => p.weight));
  const maxVolume = Math.max(...sortedDataPoints.map((p) => p.volume));
  const maxReps = Math.max(...sortedDataPoints.map((p) => p.reps));

  const getTrendColor = (trend) => {
    switch (trend) {
      case "increasing":
        return "green";
      case "decreasing":
        return "red";
      default:
        return "gray";
    }
  };

  const getConsistencyColor = (level) => {
    switch (level) {
      case "high":
        return "green";
      case "medium":
        return "yellow";
      case "low":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold" color={textColor}>
        Progress Insights
      </Text>

      {/* Time Period Summary */}
      <Box p={4} {...insightCardProps}>
        <Text fontWeight="medium" mb={2}>
          Time Period
        </Text>
        <HStack justify="space-between">
          <Text fontSize="sm" color={mutedText}>
            {new Date(firstWorkout.date).toLocaleDateString()} to{" "}
            {new Date(lastWorkout.date).toLocaleDateString()}
          </Text>
          <Badge colorScheme="blue">{daysBetween} days</Badge>
        </HStack>
        <HStack justify="space-between" mt={2}>
          <Text fontSize="sm" color={mutedText}>Total Workouts</Text>
          <Badge colorScheme="purple">{totalWorkouts}</Badge>
        </HStack>
        <HStack justify="space-between" mt={2}>
          <Text fontSize="sm" color={mutedText}>Weekly Frequency</Text>
          <Badge colorScheme={getConsistencyColor(consistencyLevel)}>
            {workoutFrequency} workouts/week
          </Badge>
        </HStack>
      </Box>

      {/* Progress Metrics */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box p={4} {...insightCardProps}>
          <Stat>
            <StatLabel>Weight Progress</StatLabel>
            <StatNumber color={getTrendColor(weightTrend)}>
              {weightProgress > 0 ? "+" : ""}
              {weightProgress} lbs
            </StatNumber>
            <StatHelpText>
              {weightProgressPercent}% {weightTrend}
            </StatHelpText>
          </Stat>
        </Box>

        <Box p={4} {...insightCardProps}>
          <Stat>
            <StatLabel>Volume Progress</StatLabel>
            <StatNumber color={getTrendColor(volumeTrend)}>
              {volumeProgress > 0 ? "+" : ""}
              {volumeProgress.toLocaleString()}
            </StatNumber>
            <StatHelpText>
              {volumeProgressPercent}% {volumeTrend}
            </StatHelpText>
          </Stat>
        </Box>

        <Box p={4} {...insightCardProps}>
          <Stat>
            <StatLabel>Reps Progress</StatLabel>
            <StatNumber color={getTrendColor(repsTrend)}>
              {repsProgress > 0 ? "+" : ""}
              {repsProgress}
            </StatNumber>
            <StatHelpText>
              {repsProgressPercent}% {repsTrend}
            </StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Personal Records */}
      <Box p={4} {...insightCardProps}>
        <Text fontWeight="medium" mb={3}>
          Personal Records
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Max Weight</Text>
            <Badge colorScheme="green">{maxWeight} lbs</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Max Volume</Text>
            <Badge colorScheme="blue">{maxVolume.toLocaleString()}</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Max Reps</Text>
            <Badge colorScheme="purple">{maxReps}</Badge>
          </HStack>
        </SimpleGrid>
      </Box>

      {/* Recommendations */}
      <Box p={4} {...insightCardProps}>
        <Text fontWeight="medium" mb={3}>
          Recommendations
        </Text>
        <VStack align="start" spacing={2}>
          {consistencyLevel === "low" && (
            <Text fontSize="sm" color="orange.500">
              💡 Try to increase workout frequency for better progress
            </Text>
          )}
          {weightTrend === "increasing" && (
            <Text fontSize="sm" color="green.500">
              🎉 Great job! Your weight progression is on track
            </Text>
          )}
          {weightTrend === "decreasing" && (
            <Text fontSize="sm" color="red.500">
              ⚠️ Consider adjusting your training program or recovery
            </Text>
          )}
          {volumeTrend === "increasing" && (
            <Text fontSize="sm" color="green.500">
              📈 Your volume is increasing, which is excellent for hypertrophy
            </Text>
          )}
          {totalWorkouts >= 10 && (
            <Text fontSize="sm" color="blue.500">
              🏆 You&apos;ve been consistent! Keep up the great work
            </Text>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};

export default ProgressInsights;
