import { Box, Text } from "@chakra-ui/react";
import { useThemeColors } from "../../hooks/useThemeColors";

const WorkoutDetailsModal = ({ workoutData, exerciseName }) => {
  const colors = useThemeColors();

  if (!workoutData) {
    return null;
  }

  const date = new Date(workoutData.date);
  const hasValidDate = !Number.isNaN(date.getTime());
  const fullDate = hasValidDate
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const time = hasValidDate
    ? date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const setsLabel =
    workoutData.sets > 1
      ? `${workoutData.sets} sets`
      : workoutData.sets === 1
        ? "1 set"
        : null;

  return (
    <Box pt={3} pb={1} maxW="md">
      {fullDate ? (
        <Text fontSize="sm" color={colors.textMuted} lineHeight="tall">
          {fullDate}
          {time ? ` · ${time}` : ""}
        </Text>
      ) : null}
      <Text mt={fullDate ? 1 : 0} color={colors.textPrimary} lineHeight="tall">
        {[`${workoutData.weight} lbs`, `${workoutData.reps} reps`, setsLabel]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      {workoutData.volume ? (
        <Text
          fontSize="sm"
          color={colors.textMuted}
          mt={1}
          lineHeight="tall"
        >
          {workoutData.volume.toLocaleString()} lbs moved
          {exerciseName ? ` on ${exerciseName}` : ""}
        </Text>
      ) : null}
    </Box>
  );
};

export default WorkoutDetailsModal;
