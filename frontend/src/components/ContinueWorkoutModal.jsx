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
  Textarea,
  Input,
  FormControl,
  FormLabel,
  Select,
  Divider,
  Badge,
  Box,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useThemeColors } from "../hooks/useThemeColors";

const ContinueWorkoutModal = ({
  isOpen,
  onClose,
  assignment,
  onSuccess,
  addedBy = "client",
}) => {
  const [additionalExercises, setAdditionalExercises] = useState([
    {
      name: "",
      setsCompleted: "",
      repsCompleted: "",
      weightUsed: "",
      notes: "",
    },
  ]);
  const [userNotes, setUserNotes] = useState(
    assignment?.userWorkout?.userNotes || ""
  );
  const [rating, setRating] = useState(assignment?.userWorkout?.rating || "");
  const [workoutDescription, setWorkoutDescription] = useState(
    assignment?.instructions || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const colors = useThemeColors();

  const handleAddExercise = () => {
    setAdditionalExercises([
      ...additionalExercises,
      {
        name: "",
        setsCompleted: "",
        repsCompleted: "",
        weightUsed: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveExercise = (index) => {
    if (additionalExercises.length > 1) {
      setAdditionalExercises(additionalExercises.filter((_, i) => i !== index));
    }
  };

  const handleExerciseChange = (index, field, value) => {
    const updated = [...additionalExercises];
    updated[index][field] = value;
    setAdditionalExercises(updated);
  };

  const handleContinueWorkout = async () => {
    try {
      setIsLoading(true);

      // Filter out empty exercises
      const validExercises = additionalExercises.filter(
        (exercise) => exercise.name.trim() !== ""
      );

      if (validExercises.length === 0) {
        toast({
          title: "No exercises added",
          description:
            "Please add at least one exercise to continue the workout.",
          status: "warning",
          isClosable: true,
        });
        return;
      }

      await apiClient.put(
        API_ENDPOINTS.CONTINUE_ASSIGNED_WORKOUT(assignment._id),
        {
          additionalExercises: validExercises,
          userNotes,
          rating: rating ? parseInt(rating) : null,
          addedBy,
          instructions: workoutDescription,
        }
      );

      toast({
        title: "Success",
        description: "Workout continued successfully!",
        status: "success",
        isClosable: true,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error continuing workout:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to continue workout",
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      setIsLoading(true);

      // Filter out empty exercises
      const validExercises = additionalExercises.filter(
        (exercise) => exercise.name.trim() !== ""
      );

      await apiClient.put(
        API_ENDPOINTS.COMPLETE_ASSIGNED_WORKOUT(assignment._id),
        {
          userNotes,
          rating: rating ? parseInt(rating) : null,
          addedBy,
          instructions: workoutDescription,
        }
      );

      toast({
        title: "Success",
        description: "Workout completed successfully!",
        status: "success",
        isClosable: true,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error completing workout:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to complete workout",
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "in_progress":
        return "yellow";
      case "shared":
        return "blue";
      case "skipped":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={colors.bgCard}>
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text fontSize="lg" fontWeight="bold">
              {addedBy === "trainer"
                ? "Add Exercises to Client Workout"
                : assignment?.status === "completed"
                ? "Add More Exercises"
                : "Continue Workout"}
            </Text>
            <HStack>
              <Text fontSize="sm" color={colors.textSecondary}>
                {assignment?.customLabel}
              </Text>
              <Badge colorScheme={getStatusColor(assignment?.status)}>
                {assignment?.status}
              </Badge>
              {addedBy === "trainer" && (
                <Badge colorScheme="purple" size="sm">
                  Trainer View
                </Badge>
              )}
              {assignment?.status === "completed" && (
                <Badge colorScheme="orange" size="sm">
                  Adding to Completed
                </Badge>
              )}
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Existing exercises */}
            {assignment?.userWorkout?.actualExercises?.length > 0 && (
              <Box>
                <Text fontWeight="semibold" mb={3}>
                  Previous Exercises:
                </Text>
                <VStack spacing={2} align="stretch">
                  {assignment.userWorkout.actualExercises.map(
                    (exercise, index) => (
                      <Box
                        key={index}
                        p={3}
                        bg={colors.bgMuted}
                        borderRadius="md"
                      >
                        <HStack justify="space-between">
                          <Text fontWeight="medium">{exercise.name}</Text>
                          {exercise.addedBy && (
                            <Badge
                              size="sm"
                              colorScheme={
                                exercise.addedBy === "trainer"
                                  ? "purple"
                                  : "blue"
                              }
                            >
                              {exercise.addedBy === "trainer"
                                ? "Trainer"
                                : "Client"}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color={colors.textSecondary}>
                          {exercise.setsCompleted} sets ×{" "}
                          {exercise.repsCompleted} reps @ {exercise.weightUsed}
                        </Text>
                        {exercise.notes && (
                          <Box
                            maxH="40px"
                            overflowY="auto"
                            overflowX="hidden"
                            css={{
                              "&::-webkit-scrollbar": {
                                width: "3px",
                              },
                              "&::-webkit-scrollbar-track": {
                                background: "transparent",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                background: "#CBD5E0",
                                borderRadius: "2px",
                              },
                              "&::-webkit-scrollbar-thumb:hover": {
                                background: "#A0AEC0",
                              },
                            }}
                          >
                            <Text
                              fontSize="sm"
                              color={colors.textMuted}
                              whiteSpace="pre-wrap"
                              wordBreak="break-word"
                            >
                              Notes: {exercise.notes}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    )
                  )}
                </VStack>
                <Divider my={4} />
              </Box>
            )}

            {/* Add new exercises */}
            <Box>
              <HStack justify="space-between" mb={3}>
                <Text fontWeight="semibold">Add New Exercises:</Text>
                <Button
                  size="sm"
                  leftIcon={<AddIcon />}
                  onClick={handleAddExercise}
                  colorScheme="blue"
                  variant="outline"
                >
                  Add Exercise
                </Button>
              </HStack>

              <VStack spacing={4} align="stretch">
                {additionalExercises.map((exercise, index) => (
                  <Box
                    key={index}
                    p={4}
                    borderWidth={1}
                    borderRadius="md"
                    bg={colors.bgMuted}
                  >
                    <HStack justify="space-between" mb={3}>
                      <Text fontSize="sm" fontWeight="medium">
                        Exercise {index + 1}
                      </Text>
                      {additionalExercises.length > 1 && (
                        <IconButton
                          size="sm"
                          icon={<DeleteIcon />}
                          onClick={() => handleRemoveExercise(index)}
                          colorScheme="red"
                          variant="ghost"
                        />
                      )}
                    </HStack>

                    <VStack spacing={3} align="stretch">
                      <FormControl>
                        <FormLabel fontSize="sm">Exercise Name *</FormLabel>
                        <Input
                          placeholder="e.g., Bench Press"
                          value={exercise.name}
                          onChange={(e) =>
                            handleExerciseChange(index, "name", e.target.value)
                          }
                        />
                      </FormControl>

                      <HStack spacing={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Sets</FormLabel>
                          <Input
                            placeholder="3"
                            value={exercise.setsCompleted}
                            onChange={(e) =>
                              handleExerciseChange(
                                index,
                                "setsCompleted",
                                e.target.value
                              )
                            }
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm">Reps</FormLabel>
                          <Input
                            placeholder="10"
                            value={exercise.repsCompleted}
                            onChange={(e) =>
                              handleExerciseChange(
                                index,
                                "repsCompleted",
                                e.target.value
                              )
                            }
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm">Weight</FormLabel>
                          <Input
                            placeholder="135 lbs"
                            value={exercise.weightUsed}
                            onChange={(e) =>
                              handleExerciseChange(
                                index,
                                "weightUsed",
                                e.target.value
                              )
                            }
                          />
                        </FormControl>
                      </HStack>

                      <FormControl>
                        <FormLabel fontSize="sm">Notes (optional)</FormLabel>
                        <Input
                          placeholder="How did it feel?"
                          value={exercise.notes}
                          onChange={(e) =>
                            handleExerciseChange(index, "notes", e.target.value)
                          }
                        />
                      </FormControl>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Workout description, notes and rating */}
            <Divider />
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Workout Description / Instructions</FormLabel>
                <Textarea
                  placeholder="Describe the workout, add instructions, or modify existing description..."
                  value={workoutDescription}
                  onChange={(e) => setWorkoutDescription(e.target.value)}
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Workout Notes</FormLabel>
                <Textarea
                  placeholder="How did the workout go? Any observations or thoughts?"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Rate this workout (1-5)</FormLabel>
                <Select
                  placeholder="Select rating"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value={1}>1 - Very Poor</option>
                  <option value={2}>2 - Poor</option>
                  <option value={3}>3 - Average</option>
                  <option value={4}>4 - Good</option>
                  <option value={5}>5 - Excellent</option>
                </Select>
              </FormControl>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleContinueWorkout}
              isLoading={isLoading}
              loadingText="Adding..."
            >
              {addedBy === "trainer"
                ? "Add Exercises"
                : assignment?.status === "completed"
                ? "Add More Exercises"
                : "Continue Workout"}
            </Button>
            {assignment?.status !== "completed" && (
              <Button
                colorScheme="green"
                onClick={handleCompleteWorkout}
                isLoading={isLoading}
                loadingText="Completing..."
              >
                {addedBy === "trainer"
                  ? "Mark as Complete"
                  : "Complete Workout"}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ContinueWorkoutModal;
