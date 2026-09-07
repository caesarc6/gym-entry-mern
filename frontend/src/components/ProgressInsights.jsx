import { Text } from "@chakra-ui/react";
import { useThemeColors } from "../hooks/useThemeColors";

const ProgressInsights = ({ exerciseProgress }) => {
  const colors = useThemeColors();
  const mutedText = colors.textMuted;

  if (
    !exerciseProgress ||
    !exerciseProgress.dataPoints ||
    exerciseProgress.dataPoints.length < 2
  ) {
    return null;
  }

  const sortedDataPoints = [...exerciseProgress.dataPoints].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const firstWorkout = sortedDataPoints[0];
  const lastWorkout = sortedDataPoints[sortedDataPoints.length - 1];
  const weightProgress = lastWorkout.weight - firstWorkout.weight;
  const sessions = sortedDataPoints.length;

  let message;
  if (weightProgress > 0) {
    message = `You're getting stronger. Up ${weightProgress} lbs from where you started.`;
  } else if (weightProgress < 0) {
    message = `The weight has eased a little. That's okay — rest is part of getting stronger.`;
  } else {
    message = `You've stayed consistent at ${lastWorkout.weight} lbs across ${sessions} sessions.`;
  }

  return (
    <Text fontSize="md" color={mutedText} lineHeight="tall" maxW="md">
      {message}
    </Text>
  );
};

export default ProgressInsights;
