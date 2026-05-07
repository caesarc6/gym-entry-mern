import {
  Badge,
  Box,
  Flex,
  HStack,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import {
  canSyncWorkoutHabitWidget,
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
  const [syncStatus, setSyncStatus] = useState(null);
  const canSyncIosWidget = canSyncWorkoutHabitWidget();
  const { currentTheme } = useTheme();
  const isLightTheme = currentTheme === "light";

  const cardBg = isLightTheme
    ? "linear-gradient(235deg, #f8fafc, #e5e7eb, #f3f4f6)"
    : "linear-gradient(135deg, #070708, #0d1117, #111827)";
  const borderColor = isLightTheme ? "gray.200" : "whiteAlpha.200";
  const textColor = isLightTheme ? "gray.800" : "white";
  const mutedColor = isLightTheme ? "gray.600" : "gray.400";
  const emptyCellBg = "rgba(255, 255, 255, 0.94)";
  const activeCellBlur = isLightTheme
    ? "rgba(20, 30, 44, 0.8)"
    : "rgba(8, 14, 22, 0.9)";

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextSummary = await fetchWorkoutHabitSummary();
        if (ignore) return;
        setSummary(nextSummary);
        if (!canSyncIosWidget) {
          setSyncStatus({ skipped: true, reason: "not-ios-native" });
          return;
        }
        try {
          const result = await syncWorkoutHabitWidget(nextSummary);
          if (!ignore) setSyncStatus(result);
        } catch (syncError) {
          if (!ignore) {
            setSyncStatus(null);
            setError(syncError?.message || "Unable to sync iOS widget");
          }
        }
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
  }, [canSyncIosWidget, refreshKey]);

  const days = useMemo(
    () => summary?.workoutDays?.slice(-30) || buildEmptyDays(),
    [summary],
  );

  const workoutCount = summary?.workoutCount30d ?? 0;
  const currentStreak = summary?.currentStreak ?? 0;
  const lastWorkoutName = summary?.lastWorkoutName || "Log your first workout";
  const lastWorkoutAt = formatDate(summary?.lastWorkoutAt);
  const widgetSyncLabel = (() => {
    if (!canSyncIosWidget) {
      return "Open the iOS app to sync the home widget";
    }
    if (syncStatus?.saved) {
      return `Synced ${syncStatus.activeDaysCount ?? workoutCount} active days to iOS widget`;
    }
    if (syncStatus?.skipped) {
      return `Widget sync skipped: ${syncStatus.reason}`;
    }
    if (syncStatus == null && !isLoading && summary) {
      return "Widget sync did not return a native result";
    }
    return "Syncing iOS widget...";
  })();

  return (
    <Box
      w="full"
      maxW="720px"
      mx="auto"
      rounded="3xl"
      border="1px solid"
      borderColor={borderColor}
      bg={cardBg}
      color={textColor}
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
                Rest days welcome
              </Badge>
            </HStack>
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
              Consistency, not just streaks
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

        <Skeleton isLoaded={!isLoading} rounded="0">
          <Box position="relative" aria-label="Last 30 days workout chart">
            <Box
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap={0}
            >
              {days.map((day) => (
                <Box
                  key={day.date}
                  title={`${day.date}: ${day.workedOut ? "Workout logged" : "No workout"}`}
                  aspectRatio="1"
                  rounded="0"
                  bg={day.workedOut ? "rgba(38, 53, 71, 0.14)" : emptyCellBg}
                />
              ))}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap={0}
              filter="blur(9px)"
              transform="translateX(4px)"
              opacity={0.85}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-near-blur`}
                  aspectRatio="1"
                  rounded="0"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap={0}
              filter="blur(18px)"
              transform="translateX(8px)"
              opacity={0.8}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-tight-blur`}
                  aspectRatio="1"
                  rounded="0"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap={0}
              filter="blur(52px)"
              transform="translateX(22px)"
              opacity={0.65}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-wide-blur`}
                  aspectRatio="1"
                  rounded="0"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>
          </Box>
        </Skeleton>

        <Flex justify="space-between" align="center" gap={3}>
          <Text color={mutedColor} fontSize="sm">
            {workoutCount}/30 active days in the last 30 days
          </Text>
          <Text color={error ? "red.400" : mutedColor} fontSize="sm">
            {error || widgetSyncLabel}
          </Text>
        </Flex>
      </VStack>
    </Box>
  );
}
