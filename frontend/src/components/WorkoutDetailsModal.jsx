import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from "@chakra-ui/react";
import { useThemeColors } from "../hooks/useThemeColors";

const WorkoutDetailsModal = ({
  isOpen,
  onClose,
  workoutData,
  exerciseName,
}) => {
  const colors = useThemeColors();

  if (!workoutData) {
    return null;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      fullDate: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      relative: getRelativeTime(date),
    };
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const dateInfo = formatDate(workoutData.date);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent bg={colors.bgCard}>
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <HStack spacing={2} w="full" align="start">
              <Text fontSize="lg" fontWeight="bold" flex="1">
                {exerciseName}
              </Text>
              <Text fontSize="sm" color={colors.textMuted} flexShrink={0}>
                {dateInfo.fullDate} at {dateInfo.time}
              </Text>
            </HStack>
            <Badge colorScheme="blue" variant="subtle">
              {dateInfo.relative}
            </Badge>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Workout Summary */}
            <Box
              p={4}
              border="1px solid"
              borderColor={colors.borderColor}
              borderRadius="lg"
            >
              <Text fontWeight="bold" mb={3} fontSize="md">
                Workout Summary
              </Text>
              <SimpleGrid columns={2} spacing={4}>
                <Stat>
                  <StatLabel>Weight Used</StatLabel>
                  <StatNumber color="blue.500">
                    {workoutData.weight} lbs
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Reps</StatLabel>
                  <StatNumber color="green.500">{workoutData.reps}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Number of Sets</StatLabel>
                  <StatNumber color="purple.500">{workoutData.sets}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Volume</StatLabel>
                  <StatNumber color="orange.500">
                    {workoutData.volume.toLocaleString()}
                  </StatNumber>
                  <StatHelpText>lbs lifted</StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>

            {/* Performance Metrics */}
            <Box
              p={4}
              border="1px solid"
              borderColor={colors.borderColor}
              borderRadius="lg"
            >
              <Text fontWeight="bold" mb={3} fontSize="md">
                Performance Metrics
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Average Reps per Set</Text>
                  <Badge colorScheme="green">
                    {(workoutData.reps / workoutData.sets).toFixed(1)}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Volume per Set</Text>
                  <Badge colorScheme="blue">
                    {(workoutData.volume / workoutData.sets).toLocaleString()}{" "}
                    lbs
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Intensity (Weight/Rep Ratio)</Text>
                  <Badge colorScheme="purple">
                    {(
                      workoutData.weight /
                      (workoutData.reps / workoutData.sets)
                    ).toFixed(1)}{" "}
                    lbs/rep
                  </Badge>
                </HStack>
              </VStack>
            </Box>

            {/* Workout Context */}
            <Box
              p={4}
              border="1px solid"
              borderColor={colors.borderColor}
              borderRadius="lg"
            >
              <Text fontWeight="bold" mb={3} fontSize="md">
                Workout Context
              </Text>
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Workout ID</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.500">
                    {workoutData.workoutId?.slice(-8) || "N/A"}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Exercise Type</Text>
                  <Badge colorScheme="teal" variant="outline">
                    {exerciseName}
                  </Badge>
                </HStack>
              </VStack>
            </Box>

            {/* Progress Context */}
            <Box
              p={4}
              border="1px solid"
              borderColor={colors.borderColor}
              borderRadius="lg"
            >
              <Text fontWeight="bold" mb={3} fontSize="md">
                Progress Context
              </Text>
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">This workout represents</Text>
                  <Badge colorScheme="cyan">
                    {(
                      (workoutData.volume / (workoutData.volume * 100)) *
                      100
                    ).toFixed(1)}
                    % of your volume
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  💡 This workout data contributes to your overall progress
                  tracking and analytics.
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // You can add functionality to edit or share the workout here
            }}
          >
            Edit Workout
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WorkoutDetailsModal;
