import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useColorModeValue,
  Spinner,
  Center,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { CheckIcon, ViewIcon, EditIcon } from "@chakra-ui/icons";
import { FiSave } from "react-icons/fi";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import ContinueWorkoutModal from "./ContinueWorkoutModal";

const AssignedWorkouts = ({ uid }) => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState(new Set());
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);

  const toast = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    if (uid) {
      fetchUserAssignments();
    }
  }, [uid]);

  const fetchUserAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.GET_USER_ASSIGNMENTS);
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      toast.error("Error", "Failed to load assigned workouts");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsSaved = async (assignmentId) => {
    try {
      setSavingIds((prev) => new Set([...prev, assignmentId]));

      await apiClient.put(API_ENDPOINTS.MARK_WORKOUT_AS_SAVED(assignmentId));

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment._id === assignmentId
            ? { ...assignment, savedToAccount: true }
            : assignment
        )
      );

      toast.success("Success", "Workout saved to your account!");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Error", "Failed to save workout");
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleContinueWorkout = (assignment) => {
    setSelectedAssignment(assignment);
    setIsContinueModalOpen(true);
  };

  const handleContinueModalClose = () => {
    setIsContinueModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleContinueSuccess = () => {
    // Refresh the assignments list
    fetchUserAssignments();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "in_progress":
        return "yellow";
      case "assigned":
        return "blue";
      case "skipped":
        return "red";
      default:
        return "gray";
    }
  };

  const canContinueWorkout = (assignment) => {
    // Allow continuing workouts regardless of status - users can always add more exercises
    return true;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card bg={bgColor}>
          <CardHeader>
            <Heading size="md">Assigned Workouts</Heading>
          </CardHeader>
          <CardBody>
            <Center py={8}>
              <VStack spacing={4}>
                <Spinner size="lg" color="blue.500" />
                <Text>Loading assigned workouts...</Text>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      );
    }

    if (assignments.length === 0) {
      return (
        <Card bg={bgColor}>
          <CardHeader>
            <Heading size="md">Assigned Workouts</Heading>
          </CardHeader>
          <CardBody>
            <Center py={8}>
              <VStack spacing={4}>
                <Text color="gray.500">No workouts assigned yet</Text>
                <Text fontSize="sm" color="gray.400" textAlign="center">
                  Your trainer will assign workouts for you to complete
                </Text>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card bg={bgColor}>
        <CardHeader>
          <Heading size="md">Assigned Workouts</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {assignments.map((assignment) => (
              <Box
                key={assignment._id}
                p={4}
                borderWidth={1}
                borderRadius="md"
                bg={cardBg}
              >
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Heading size="sm">{assignment.customLabel}</Heading>
                        {assignment.savedToAccount && (
                          <Tooltip label="Saved to your account">
                            <CheckIcon color="green.500" w={4} h={4} />
                          </Tooltip>
                        )}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        By: {assignment.assignedByName}
                      </Text>
                      {assignment.templateId && (
                        <Text fontSize="xs" color="gray.500">
                          Template: {assignment.templateId.templateName}
                        </Text>
                      )}
                    </VStack>
                    <VStack spacing={2} align="end">
                      <Badge colorScheme={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                      {assignment.dueDate && (
                        <Text fontSize="xs" color="gray.500">
                          Due:{" "}
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </Text>
                      )}
                    </VStack>
                  </HStack>

                  {assignment.instructions && (
                    <Text fontSize="sm" color="gray.600">
                      {assignment.instructions}
                    </Text>
                  )}

                  {/* Show progress if workout has been started */}
                  {assignment.userWorkout &&
                    assignment.userWorkout.actualExercises?.length > 0 && (
                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="green.600"
                          mb={2}
                        >
                          Progress:{" "}
                          {assignment.userWorkout.actualExercises.length}{" "}
                          exercise(s) completed
                        </Text>
                        <VStack spacing={1} align="stretch">
                          {assignment.userWorkout.actualExercises
                            .slice(0, 3)
                            .map((exercise, index) => (
                              <Text key={index} fontSize="xs" color="gray.500">
                                ✓ {exercise.name} - {exercise.setsCompleted}{" "}
                                sets × {exercise.repsCompleted} reps
                              </Text>
                            ))}
                          {assignment.userWorkout.actualExercises.length >
                            3 && (
                            <Text fontSize="xs" color="gray.400">
                              +
                              {assignment.userWorkout.actualExercises.length -
                                3}{" "}
                              more exercises...
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}

                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.500">
                      Assigned:{" "}
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </Text>
                    <HStack>
                      <Button
                        size="sm"
                        leftIcon={<EditIcon />}
                        colorScheme="blue"
                        variant="solid"
                        onClick={() => handleContinueWorkout(assignment)}
                      >
                        {assignment.status === "completed"
                          ? "Add More"
                          : "Continue"}
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<ViewIcon />}
                        variant="outline"
                        onClick={() => {
                          // TODO: Navigate to workout details
                          console.log("View workout:", assignment);
                        }}
                      >
                        View
                      </Button>
                      {!assignment.savedToAccount && (
                        <Tooltip label="Save to your account">
                          <IconButton
                            size="sm"
                            icon={<FiSave />}
                            colorScheme="blue"
                            variant="outline"
                            isLoading={savingIds.has(assignment._id)}
                            onClick={() => markAsSaved(assignment._id)}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        </CardBody>
      </Card>
    );
  };

  return (
    <>
      {renderContent()}
      <ContinueWorkoutModal
        isOpen={isContinueModalOpen}
        onClose={handleContinueModalClose}
        assignment={selectedAssignment}
        onSuccess={handleContinueSuccess}
      />
    </>
  );
};

export default AssignedWorkouts;
