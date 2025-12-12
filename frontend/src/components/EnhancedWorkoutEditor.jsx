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
  FormHelperText,
  useColorModeValue,
  Divider,
  Badge,
  Box,
  IconButton,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Collapse,
  useDisclosure,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Tooltip,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import {
  AddIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
} from "@chakra-ui/icons";

const EnhancedWorkoutEditor = ({
  isOpen,
  onClose,
  entry,
  onUpdate,
  onSuccess,
}) => {
  const [workoutData, setWorkoutData] = useState({
    name: "",
    description: "",
    exercises: [],
    notes: "",
    tags: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(-1);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isOpen: showAdvanced, onToggle: toggleAdvanced } = useDisclosure();
  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  // Parse workout description into structured exercises
  const parseWorkoutDescription = useCallback((description) => {
    if (!description) return [];

    const lines = description.split("\n").filter((line) => line.trim());
    const exercises = [];
    let currentExercise = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip headers and empty lines
      if (
        trimmedLine.includes(":") &&
        (trimmedLine.toLowerCase().includes("warm") ||
          trimmedLine.toLowerCase().includes("cool") ||
          trimmedLine.toLowerCase().includes("main") ||
          trimmedLine.toLowerCase().includes("notes"))
      ) {
        continue;
      }

      // Check if line starts with exercise name (usually starts with dash or number)
      if (trimmedLine.startsWith("-") || /^\d+\./.test(trimmedLine)) {
        if (currentExercise) {
          exercises.push(currentExercise);
        }

        const exerciseText = trimmedLine.replace(/^[-•\d\.\s]+/, "");
        const parts = exerciseText.split(":");

        currentExercise = {
          name: parts[0]?.trim() || "",
          sets: "",
          reps: "",
          weight: "",
          restTime: "",
          notes: parts[1]?.trim() || "",
          category: "strength", // Default category
        };
      } else if (currentExercise && trimmedLine) {
        // This might be additional info for the current exercise
        if (trimmedLine.includes("sets") || trimmedLine.includes("reps")) {
          const setsMatch = trimmedLine.match(/(\d+)\s*sets?/i);
          const repsMatch = trimmedLine.match(/(\d+[-–]\d+|\d+)\s*reps?/i);
          const weightMatch = trimmedLine.match(
            /(\d+)\s*(lbs?|kg|pounds?|kilos?)/i
          );

          if (setsMatch) currentExercise.sets = setsMatch[1];
          if (repsMatch) currentExercise.reps = repsMatch[1];
          if (weightMatch) currentExercise.weight = weightMatch[0];
        } else {
          currentExercise.notes +=
            (currentExercise.notes ? " " : "") + trimmedLine;
        }
      }
    }

    if (currentExercise) {
      exercises.push(currentExercise);
    }

    return exercises;
  }, []);

  // Convert structured exercises back to text format
  const exercisesToText = useCallback((exercises) => {
    if (!exercises || exercises.length === 0) return "";

    let text = "Main Workout:\n\n";
    exercises.forEach((exercise, index) => {
      text += `- ${exercise.name}`;

      const details = [];
      if (exercise.sets) details.push(`${exercise.sets} sets`);
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.weight) details.push(`${exercise.weight}`);
      if (exercise.restTime) details.push(`${exercise.restTime} rest`);

      if (details.length > 0) {
        text += `: ${details.join(", ")}`;
      }

      if (exercise.notes) {
        text += `\n  ${exercise.notes}`;
      }

      text += "\n";
    });

    return text;
  }, []);

  // Initialize workout data when entry changes
  useEffect(() => {
    if (entry && isOpen) {
      const exercises = parseWorkoutDescription(entry.description);
      setWorkoutData({
        name: entry.name || "",
        description: entry.description || "",
        exercises: exercises,
        notes: "",
        tags: [],
      });
      setHasUnsavedChanges(false);
      setLastSaved(null);
    }
  }, [entry, isOpen, parseWorkoutDescription]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [workoutData, autoSaveEnabled, hasUnsavedChanges]);

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsLoading(true);
      const updatedDescription = exercisesToText(workoutData.exercises);

      await onUpdate(entry._id, {
        name: workoutData.name,
        description: updatedDescription,
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      toast({
        title: "Auto-saved",
        description: "Workout changes saved automatically",
        status: "success",
        duration: 1000,
        isClosable: true,
      });
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    try {
      setIsLoading(true);
      const updatedDescription = exercisesToText(workoutData.exercises);

      await onUpdate(entry._id, {
        name: workoutData.name,
        description: updatedDescription,
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      toast({
        title: "Saved",
        description: "Workout updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save workout changes",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkoutData = (updates) => {
    setWorkoutData((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const addExercise = () => {
    const newExercise = {
      name: "",
      sets: "",
      reps: "",
      weight: "",
      restTime: "",
      notes: "",
      category: "strength",
    };
    updateWorkoutData({
      exercises: [...workoutData.exercises, newExercise],
    });
    setEditingExerciseIndex(workoutData.exercises.length);
    setIsEditing(true);
  };

  const removeExercise = (index) => {
    const newExercises = workoutData.exercises.filter((_, i) => i !== index);
    updateWorkoutData({ exercises: newExercises });
  };

  const updateExercise = (index, updates) => {
    const newExercises = [...workoutData.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    updateWorkoutData({ exercises: newExercises });
  };

  const startEditingExercise = (index) => {
    setEditingExerciseIndex(index);
    setIsEditing(true);
  };

  const finishEditingExercise = () => {
    setEditingExerciseIndex(-1);
    setIsEditing(false);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflowY="auto">
        <ModalHeader>
          <HStack justify="space-between">
            <Text>Edit Workout</Text>
            <HStack spacing={2}>
              {lastSaved && (
                <Badge colorScheme="green" fontSize="xs">
                  Saved {formatLastSaved()}
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Badge colorScheme="orange" fontSize="xs">
                  Unsaved changes
                </Badge>
              )}
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Info */}
            <Card bg={cardBg}>
              <CardHeader pb={2}>
                <Text fontWeight="bold">Workout Details</Text>
              </CardHeader>
              <CardBody pt={2}>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Workout Name</FormLabel>
                    <Input
                      value={workoutData.name}
                      onChange={(e) =>
                        updateWorkoutData({ name: e.target.value })
                      }
                      placeholder="e.g., Upper Body Strength"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Auto-save</FormLabel>
                    <HStack>
                      <Switch
                        isChecked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      />
                      <Text fontSize="sm" color="gray.600">
                        Automatically save changes every 2 seconds
                      </Text>
                    </HStack>
                  </FormControl>
                </VStack>
              </CardBody>
            </Card>

            {/* Raw Description Editor */}
            <Card bg={cardBg}>
              <CardHeader pb={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    showAdvanced ? <ChevronDownIcon /> : <ChevronRightIcon />
                  }
                  onClick={toggleAdvanced}
                >
                  Raw Description Editor
                </Button>
              </CardHeader>
              <Collapse in={showAdvanced}>
                <CardBody pt={2}>
                  <FormControl>
                    <FormLabel>Full Workout Description</FormLabel>
                    <Textarea
                      value={workoutData.description}
                      onChange={(e) =>
                        updateWorkoutData({ description: e.target.value })
                      }
                      placeholder="Enter your workout description..."
                      rows={8}
                      fontFamily="monospace"
                      fontSize="sm"
                    />
                    <FormHelperText>
                      Edit the raw workout text. Changes will be parsed into
                      structured exercises below.
                    </FormHelperText>
                  </FormControl>
                </CardBody>
              </Collapse>
            </Card>

            {/* Structured Exercise Editor */}
            <Card bg={cardBg}>
              <CardHeader>
                <HStack justify="space-between">
                  <Text fontWeight="bold">
                    Exercises ({workoutData.exercises.length})
                  </Text>
                  <Button
                    size="sm"
                    leftIcon={<AddIcon />}
                    onClick={addExercise}
                    colorScheme="blue"
                  >
                    Add Exercise
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  {workoutData.exercises.map((exercise, index) => (
                    <Box
                      key={index}
                      w="full"
                      p={4}
                      border="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg={bgColor}
                    >
                      <VStack spacing={3}>
                        <HStack w="full" justify="space-between">
                          <Text fontWeight="medium" fontSize="lg">
                            {exercise.name || `Exercise ${index + 1}`}
                          </Text>
                          <HStack>
                            {editingExerciseIndex === index ? (
                              <>
                                <IconButton
                                  size="sm"
                                  icon={<CheckIcon />}
                                  colorScheme="green"
                                  onClick={finishEditingExercise}
                                />
                                <IconButton
                                  size="sm"
                                  icon={<CloseIcon />}
                                  colorScheme="red"
                                  onClick={finishEditingExercise}
                                />
                              </>
                            ) : (
                              <>
                                <IconButton
                                  size="sm"
                                  icon={<EditIcon />}
                                  onClick={() => startEditingExercise(index)}
                                />
                                <IconButton
                                  size="sm"
                                  icon={<DeleteIcon />}
                                  colorScheme="red"
                                  onClick={() => removeExercise(index)}
                                />
                              </>
                            )}
                          </HStack>
                        </HStack>

                        {editingExerciseIndex === index ? (
                          <VStack spacing={3} w="full">
                            <FormControl>
                              <FormLabel fontSize="sm">Exercise Name</FormLabel>
                              <Input
                                value={exercise.name}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="e.g., Bench Press"
                              />
                            </FormControl>

                            <HStack w="full" spacing={3}>
                              <FormControl>
                                <FormLabel fontSize="sm">Sets</FormLabel>
                                <NumberInput
                                  value={exercise.sets}
                                  onChange={(value) =>
                                    updateExercise(index, { sets: value })
                                  }
                                >
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="sm">Reps</FormLabel>
                                <Input
                                  value={exercise.reps}
                                  onChange={(e) =>
                                    updateExercise(index, {
                                      reps: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., 8-12"
                                />
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="sm">Weight</FormLabel>
                                <Input
                                  value={exercise.weight}
                                  onChange={(e) =>
                                    updateExercise(index, {
                                      weight: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., 135 lbs"
                                />
                              </FormControl>
                            </HStack>

                            <FormControl>
                              <FormLabel fontSize="sm">Notes</FormLabel>
                              <Textarea
                                value={exercise.notes}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    notes: e.target.value,
                                  })
                                }
                                placeholder="Any additional notes or cues..."
                                rows={2}
                              />
                            </FormControl>
                          </VStack>
                        ) : (
                          <VStack spacing={2} w="full" align="start">
                            <HStack spacing={4} wrap="wrap">
                              {exercise.sets && (
                                <Badge colorScheme="blue">
                                  {exercise.sets} sets
                                </Badge>
                              )}
                              {exercise.reps && (
                                <Badge colorScheme="green">
                                  {exercise.reps} reps
                                </Badge>
                              )}
                              {exercise.weight && (
                                <Badge colorScheme="purple">
                                  {exercise.weight}
                                </Badge>
                              )}
                            </HStack>
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
                                  color="gray.600"
                                  whiteSpace="pre-wrap"
                                  wordBreak="break-word"
                                >
                                  {exercise.notes}
                                </Text>
                              </Box>
                            )}
                          </VStack>
                        )}
                      </VStack>
                    </Box>
                  ))}

                  {workoutData.exercises.length === 0 && (
                    <Box textAlign="center" py={8} color="gray.500">
                      <Text>
                        No exercises found. Add some exercises or edit the raw
                        description.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleManualSave}
              isLoading={isLoading}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EnhancedWorkoutEditor;
