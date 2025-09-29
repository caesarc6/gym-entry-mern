import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Box,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Badge,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Center,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Divider,
  Progress,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowBackIcon,
  HamburgerIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
  SearchIcon,
  ChevronDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  TimeIcon,
  InfoIcon,
  AddIcon,
} from "@chakra-ui/icons";
import { useCustomToast } from "../hooks/useCustomToast";
import { useProductStore } from "../store/product";
import { apiClient, API_ENDPOINTS } from "../config/api";
import ContinueWorkoutModal from "../components/ContinueWorkoutModal";
import EditSharedWorkoutModal from "../components/EditSharedWorkoutModal";
import CreateSharedWorkoutModal from "../components/CreateSharedWorkoutModal";
import { capitalizeName, normalizeNameForStorage } from "../utils/nameUtils";

const ClientWorkoutsPage = () => {
  const { clientName } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [sharedWorkouts, setSharedWorkouts] = useState([]);
  const [clientStats, setClientStats] = useState({
    totalWorkouts: 0,
    completedWorkouts: 0,
    inProgressWorkouts: 0,
    sharedWorkouts: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAssignmentForContinue, setSelectedAssignmentForContinue] =
    useState(null);
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const navigate = useNavigate();
  const toast = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const { currentUserInfo } = useProductStore();

  // Fetch data on component mount
  useEffect(() => {
    if (currentUserInfo && clientName) {
      fetchClientData();
    }
  }, [currentUserInfo, clientName]);

  const fetchClientData = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching data for client: ${clientName}`);

      // Fetch all trainer assignments and shared workouts
      const [assignmentsResponse, sharedWorkoutsResponse] = await Promise.all([
        apiClient.get(API_ENDPOINTS.GET_TRAINER_ASSIGNMENTS),
        apiClient.get(API_ENDPOINTS.GET_TRAINER_SHARED_WORKOUTS),
      ]);

      const allAssignments = assignmentsResponse.data.data.assignments || [];
      const allSharedWorkouts =
        sharedWorkoutsResponse.data.data.sharedWorkouts || [];

      // Normalize the client name for comparison
      const normalizedClientName = normalizeNameForStorage(clientName);

      // Filter assignments for this specific client
      const clientAssignments = allAssignments.filter(
        (assignment) =>
          normalizeNameForStorage(assignment.assignedToName) ===
          normalizedClientName
      );

      // Get shared workouts that are assigned to this client OR have clientName field
      const clientWorkouts = allSharedWorkouts.filter(
        (workout) =>
          // Either has an assignment for this client
          clientAssignments.some(
            (assignment) =>
              assignment.sharedWorkoutId &&
              assignment.sharedWorkoutId._id === workout._id
          ) ||
          // Or has a clientName field matching this client (normalized comparison)
          (workout.clientName &&
            normalizeNameForStorage(workout.clientName) ===
              normalizedClientName)
      );

      // Create virtual assignments for workouts that have clientName but no assignment
      const virtualAssignments = clientWorkouts
        .filter(
          (workout) =>
            normalizeNameForStorage(workout.clientName) ===
              normalizedClientName &&
            !clientAssignments.some(
              (assignment) =>
                assignment.sharedWorkoutId &&
                assignment.sharedWorkoutId._id === workout._id
            )
        )
        .map((workout) => ({
          _id: `virtual_${workout._id}`,
          sharedWorkoutId: workout._id,
          assignedToName: clientName,
          assignedToUid: null,
          assignedToEmail: null,
          isRegisteredUser: false,
          sharedByUid: workout.creatorUid,
          sharedByName: workout.creatorName,
          customLabel: workout.workoutName,
          instructions: null,
          targetDate: null,
          dueDate: null,
          status: "shared",
          userWorkout: null,
          trainerFeedback: null,
          isVisible: true,
          savedToAccount: false,
          createdAt: workout.createdAt,
          updatedAt: workout.updatedAt,
          isVirtual: true, // Flag to identify virtual assignments
        }));

      // Combine real assignments with virtual ones
      const allClientAssignments = [
        ...clientAssignments,
        ...virtualAssignments,
      ];

      setAssignments(allClientAssignments);
      setSharedWorkouts(clientWorkouts);

      // Calculate client stats
      const completed = allClientAssignments.filter(
        (assignment) => assignment.status === "completed"
      ).length;
      const inProgress = allClientAssignments.filter(
        (assignment) => assignment.status === "in_progress"
      ).length;
      const shared = allClientAssignments.filter(
        (assignment) => assignment.status === "shared"
      ).length;
      const total = allClientAssignments.length;

      setClientStats({
        totalWorkouts: total,
        completedWorkouts: completed,
        inProgressWorkouts: inProgress,
        sharedWorkouts: shared,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });

      console.log(`Found ${total} assignments for ${clientName}`);
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Error", "Failed to fetch client data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort assignments
  const getFilteredAssignments = () => {
    let filtered = [...assignments];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.status === statusFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (assignment) =>
          assignment.customLabel
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (assignment.instructions &&
            assignment.instructions
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    if (sortBy === "name") {
      filtered.sort((a, b) => a.customLabel.localeCompare(b.customLabel));
    } else if (sortBy === "created") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "status") {
      const statusOrder = {
        completed: 1,
        in_progress: 2,
        shared: 3,
        skipped: 4,
      };
      filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filtered;
  };

  const handleContinueWorkout = (assignment) => {
    setSelectedAssignmentForContinue(assignment);
    setIsContinueModalOpen(true);
  };

  const handleContinueSuccess = () => {
    fetchClientData(); // Refresh data
  };

  // Handle edit workout
  const handleEditWorkout = (assignment) => {
    console.log("handleEditWorkout called with assignment:", assignment);

    // Find the shared workout for this assignment
    const sharedWorkout = sharedWorkouts.find((workout) => {
      // Handle both cases: sharedWorkoutId as string or as object with _id
      const workoutId = assignment.sharedWorkoutId;
      const targetId =
        typeof workoutId === "string" ? workoutId : workoutId?._id;
      console.log("Comparing:", targetId, "with", workout._id);
      return targetId === workout._id;
    });

    console.log("Found shared workout:", sharedWorkout);

    if (sharedWorkout) {
      setEditingWorkout(sharedWorkout);
      setIsEditModalOpen(true);
    } else {
      console.error("Shared workout not found for assignment:", assignment);
      toast.error("Error", "Could not find workout details to edit");
    }
  };

  // Handle edit success
  const handleEditSuccess = (updatedWorkout) => {
    setSharedWorkouts((prev) =>
      prev.map((workout) =>
        workout._id === updatedWorkout._id ? updatedWorkout : workout
      )
    );
    toast.success("Success", "Workout updated successfully!");
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingWorkout(null);
  };

  // Handle create workout success
  const handleCreateSuccess = (newWorkout) => {
    // Refresh the data to show the new workout
    fetchClientData();
    toast.success("Success", "Workout created and assigned successfully!");
  };

  // Close create modal
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Handle delete workout
  const handleDeleteWorkout = async (assignment) => {
    // Find the shared workout for this assignment
    const sharedWorkout = sharedWorkouts.find((workout) => {
      const workoutId = assignment.sharedWorkoutId;
      const targetId =
        typeof workoutId === "string" ? workoutId : workoutId?._id;
      return targetId === workout._id;
    });

    if (!sharedWorkout) {
      toast.error("Error", "Could not find workout to delete");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${sharedWorkout.workoutName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await apiClient.delete(
        API_ENDPOINTS.DELETE_SHARED_WORKOUT(sharedWorkout._id)
      );

      // Refresh the data to remove the deleted workout
      fetchClientData();

      toast.success("Success", "Workout deleted successfully!");
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to delete workout"
      );
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
      default:
        return "red";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon />;
      case "in_progress":
        return <TimeIcon />;
      case "shared":
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  if (!currentUserInfo) {
    return (
      <Container maxW="container.xl" pt={20} pb={8} px={6}>
        <Center>
          <VStack spacing={4}>
            <Text>Please log in to access client workouts.</Text>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" pt={20} pb={8} px={6}>
        <Center>
          <Spinner size="xl" />
        </Center>
      </Container>
    );
  }

  const filteredAssignments = getFilteredAssignments();

  return (
    <Container maxW="container.xl" pt={20} pb={8} px={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={2}>
            <HStack>
              <Button
                leftIcon={<ArrowBackIcon />}
                variant="outline"
                size="sm"
                onClick={() => navigate("/trainer/dashboard")}
              >
                Back to Dashboard
              </Button>
            </HStack>
            <Heading size="lg">{capitalizeName(clientName)}'s Workouts</Heading>
            <Text color="gray.600">
              Manage and track {capitalizeName(clientName)}'s workouts
            </Text>
          </VStack>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Workout for {capitalizeName(clientName)}
          </Button>
        </HStack>

        {/* Filters and Search */}
        <Card bg={bgColor}>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <InputGroup maxW="300px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search workouts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                maxW="200px"
              >
                <option value="created">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                maxW="200px"
              >
                <option value="all">All Statuses</option>
                <option value="shared">Shared</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {/* Client Workouts */}
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="semibold">
              Client Workouts ({filteredAssignments.length})
            </Text>
          </HStack>

          {filteredAssignments.length > 0 ? (
            <VStack spacing={4} align="stretch">
              {filteredAssignments.map((assignment) => {
                const sharedWorkout = sharedWorkouts.find((workout) => {
                  // Handle both cases: sharedWorkoutId as string or as object with _id
                  const workoutId = assignment.sharedWorkoutId;
                  const targetId =
                    typeof workoutId === "string" ? workoutId : workoutId?._id;
                  return targetId === workout._id;
                });

                return (
                  <Card key={assignment._id} bg={bgColor}>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {/* Assignment Header */}
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2}>
                            <HStack>
                              <Text fontWeight="bold" fontSize="lg">
                                {assignment.customLabel}
                              </Text>
                              <Badge
                                colorScheme={getStatusColor(assignment.status)}
                                size="sm"
                                display="flex"
                                alignItems="center"
                                gap={1}
                              >
                                {getStatusIcon(assignment.status)}
                                {assignment.status.replace("_", " ")}
                              </Badge>
                              {assignment.isVirtual && (
                                <Badge colorScheme="gray" size="sm">
                                  Direct Client
                                </Badge>
                              )}
                            </HStack>
                            <HStack spacing={4} fontSize="sm" color="gray.600">
                              <HStack>
                                <CalendarIcon />
                                <Text>
                                  Assigned:{" "}
                                  {new Date(
                                    assignment.createdAt
                                  ).toLocaleDateString()}
                                </Text>
                              </HStack>
                              {assignment.dueDate && (
                                <HStack>
                                  <CalendarIcon />
                                  <Text>
                                    Due:{" "}
                                    {new Date(
                                      assignment.dueDate
                                    ).toLocaleDateString()}
                                  </Text>
                                </HStack>
                              )}
                            </HStack>
                          </VStack>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<HamburgerIcon />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem icon={<ViewIcon />}>
                                View Details
                              </MenuItem>
                              <MenuItem
                                icon={<EditIcon />}
                                onClick={() => handleEditWorkout(assignment)}
                              >
                                Edit Workout
                              </MenuItem>
                              <MenuItem
                                icon={<DeleteIcon />}
                                onClick={() => handleDeleteWorkout(assignment)}
                                color="red.500"
                              >
                                Delete Workout
                              </MenuItem>
                              {assignment.status !== "completed" &&
                                !assignment.isVirtual && (
                                  <MenuItem
                                    icon={<TimeIcon />}
                                    onClick={() =>
                                      handleContinueWorkout(assignment)
                                    }
                                  >
                                    Continue Workout
                                  </MenuItem>
                                )}
                              {assignment.isVirtual && (
                                <MenuItem icon={<InfoIcon />} isDisabled>
                                  Convert to Tracked Workout
                                </MenuItem>
                              )}
                            </MenuList>
                          </Menu>
                        </HStack>

                        {/* Instructions */}
                        {assignment.instructions && (
                          <Box>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color="gray.700"
                              mb={1}
                            >
                              Instructions:
                            </Text>
                            <Box
                              maxH="60px"
                              overflowY="auto"
                              overflowX="hidden"
                              css={{
                                "&::-webkit-scrollbar": {
                                  width: "4px",
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
                                {assignment.instructions}
                              </Text>
                            </Box>
                          </Box>
                        )}

                        {/* Workout Description */}
                        {sharedWorkout && (
                          <Box>
                            <Divider my={2} />
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color="gray.700"
                              mb={2}
                            >
                              Workout Description:
                            </Text>
                            <Box
                              maxH="220px"
                              overflowY="auto"
                              overflowX="hidden"
                              css={{
                                "&::-webkit-scrollbar": {
                                  width: "4px",
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
                                {sharedWorkout.description}
                              </Text>
                            </Box>
                          </Box>
                        )}

                        {/* User Workout Data */}
                        {assignment.userWorkout &&
                          assignment.userWorkout.actualExercises &&
                          assignment.userWorkout.actualExercises.length > 0 && (
                            <Box>
                              <Divider my={2} />
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="gray.700"
                                mb={2}
                              >
                                Client's Progress:
                              </Text>
                              <VStack spacing={2} align="stretch">
                                {assignment.userWorkout.actualExercises
                                  .slice(0, 3)
                                  .map((exercise, index) => (
                                    <HStack
                                      key={index}
                                      fontSize="xs"
                                      color="gray.600"
                                    >
                                      <Text fontWeight="medium">
                                        {exercise.name}:
                                      </Text>
                                      <Text>{exercise.setsCompleted} sets</Text>
                                      <Text>•</Text>
                                      <Text>{exercise.repsCompleted} reps</Text>
                                      {exercise.weightUsed && (
                                        <>
                                          <Text>•</Text>
                                          <Text>{exercise.weightUsed}</Text>
                                        </>
                                      )}
                                      <Badge
                                        size="xs"
                                        colorScheme={
                                          exercise.addedBy === "trainer"
                                            ? "blue"
                                            : "green"
                                        }
                                      >
                                        {exercise.addedBy}
                                      </Badge>
                                    </HStack>
                                  ))}
                                {assignment.userWorkout.actualExercises.length >
                                  3 && (
                                  <Text fontSize="xs" color="gray.500">
                                    +
                                    {assignment.userWorkout.actualExercises
                                      .length - 3}{" "}
                                    more exercises
                                  </Text>
                                )}
                              </VStack>
                            </Box>
                          )}

                        {/* Action Buttons */}
                        <HStack justify="flex-end">
                          {assignment.status !== "completed" &&
                            !assignment.isVirtual && (
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={() =>
                                  handleContinueWorkout(assignment)
                                }
                              >
                                Continue Workout
                              </Button>
                            )}
                          {assignment.isVirtual && (
                            <Text fontSize="sm" color="gray.500">
                              This workout is directly associated with the
                              client
                            </Text>
                          )}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </VStack>
          ) : (
            <Card bg={cardBg}>
              <CardBody>
                <Center py={8}>
                  <VStack spacing={4}>
                    <Text color="gray.500">
                      No workouts found for {capitalizeName(clientName)}
                    </Text>
                    <Text fontSize="sm" color="gray.400" textAlign="center">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Create workouts for this client to see them here"}
                    </Text>
                  </VStack>
                </Center>
              </CardBody>
            </Card>
          )}
        </VStack>

        {/* Continue Workout Modal */}
        <ContinueWorkoutModal
          isOpen={isContinueModalOpen}
          onClose={() => setIsContinueModalOpen(false)}
          assignment={selectedAssignmentForContinue}
          onSuccess={handleContinueSuccess}
        />

        {/* Edit Workout Modal */}
        <EditSharedWorkoutModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          sharedWorkout={editingWorkout}
          onSuccess={handleEditSuccess}
        />

        {/* Create Workout Modal */}
        <CreateSharedWorkoutModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          clientName={clientName}
          onSuccess={handleCreateSuccess}
        />
      </VStack>
    </Container>
  );
};

export default ClientWorkoutsPage;
