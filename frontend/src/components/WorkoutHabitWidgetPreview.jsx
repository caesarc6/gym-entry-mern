import {
  Badge,
  Box,
  Flex,
  HStack,
  Skeleton,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchWorkoutHabitSummary,
  syncWorkoutHabitWidget,
} from "../utils/workoutHabitWidget";

const formatDate = (value) => {
  if (!value) return "No workouts yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const buildEmptyDays = () => {
  const today = new Date();
  const start = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 29,
  ));

  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return {
      date: day.toISOString().slice(0, 10),
      workedOut: false,
    };
  });
};

export default function WorkoutHabitWidgetPreview({ refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardBg = useColorModeValue("white", "rgba(24, 24, 27, 0.92)");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const mutedColor = useColorModeValue("gray.600", "gray.400");
  const emptyCellBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const activeCellBg = useColorModeValue("blue.400", "blue.300");
  const activeCellShadow = useColorModeValue(
    "0 0 14px rgba(59, 130, 246, 0.28)",
    "0 0 16px rgba(147, 197, 253, 0.32)",
  );

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextSummary = await fetchWorkoutHabitSummary();
        if (ignore) return;
        setSummary(nextSummary);
        syncWorkoutHabitWidget(nextSummary);
      } catch (err) {
        if (ignore) return;
        setError(err?.message || "Unable to load habit widget");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const days = useMemo(
    () => summary?.workoutDays?.slice(-30) || buildEmptyDays(),
    [summary],
  );

  const workoutCount = summary?.workoutCount30d ?? 0;
  const currentStreak = summary?.currentStreak ?? 0;
  const lastWorkoutName = summary?.lastWorkoutName || "Log your first workout";
  const lastWorkoutAt = formatDate(summary?.lastWorkoutAt);

  return (
    <Box
      w="full"
      maxW="720px"
      mx="auto"
      rounded="3xl"
      border="1px solid"
      borderColor={borderColor}
      bg={cardBg}
      p={{ base: 4, md: 5 }}
      textAlign="left"
      shadow="xl"
    >
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box>
            <HStack spacing={2} mb={2}>
              <Badge colorScheme="blue" rounded="full" px={3} py={1}>
                Home widget
              </Badge>
              <Badge variant="subtle" rounded="full" px={3} py={1}>
                30 days
              </Badge>
            </HStack>
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
              Keep the streak visible
            </Text>
            <Text color={mutedColor} fontSize="sm">
              Last workout: {lastWorkoutName} - {lastWorkoutAt}
            </Text>
          </Box>
          <Box textAlign="right">
            <Text fontSize="2xl" fontWeight="black" lineHeight="1">
              {currentStreak}
            </Text>
            <Text color={mutedColor} fontSize="xs" textTransform="uppercase">
              day streak
            </Text>
          </Box>
        </Flex>

        <Skeleton isLoaded={!isLoading} rounded="2xl">
          <Box
            display="grid"
            gridTemplateColumns="repeat(10, minmax(0, 1fr))"
            gap={{ base: 1.5, md: 2 }}
            aria-label="Last 30 days workout chart"
          >
            {days.map((day) => (
              <Box
                key={day.date}
                title={`${day.date}: ${day.workedOut ? "Workout logged" : "No workout"}`}
                aspectRatio="1"
                rounded="lg"
                bg={day.workedOut ? activeCellBg : emptyCellBg}
                boxShadow={day.workedOut ? activeCellShadow : "none"}
                border="1px solid"
                borderColor={day.workedOut ? "transparent" : borderColor}
              />
            ))}
          </Box>
        </Skeleton>

        <Flex justify="space-between" align="center" gap={3}>
          <Text color={mutedColor} fontSize="sm">
            {workoutCount} workouts in the last 30 days
          </Text>
          <Text color={error ? "red.400" : mutedColor} fontSize="sm">
            {error || "Synced to iOS when opened in the app"}
          </Text>
        </Flex>
      </VStack>
    </Box>
  );
}
