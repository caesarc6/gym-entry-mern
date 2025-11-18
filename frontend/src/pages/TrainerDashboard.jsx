import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Badge,
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
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Box,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HamburgerIcon,
  AddIcon,
  EditIcon,
  ViewIcon,
  SearchIcon,
  ArrowBackIcon,
  DeleteIcon,
  LinkIcon,
} from "@chakra-ui/icons";
import { useCustomToast } from "../hooks/useCustomToast";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useProductStore } from "../store/product";
import { capitalizeName, normalizeNameForStorage } from "../utils/nameUtils";
import { formatDateSafe } from "../utils/dateUtils";
import EditSharedWorkoutModal from "../components/EditSharedWorkoutModal";
import CreateSharedWorkoutModal from "../components/CreateSharedWorkoutModal";
import { useThemeColors } from "../hooks/useThemeColors";
import ShareableLinkModal from "../components/ShareableLinkModal";

const TrainerDashboard = () => {
  const [sharedWorkouts, setSharedWorkouts] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({
    totalSharedWorkouts: 0,
    totalClientWorkouts: 0,
    generalWorkouts: 0,
    clientSpecificWorkouts: 0,
    totalClients: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("created");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sharingWorkout, setSharingWorkout] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("workouts"); // "workouts" or "clients"
  const [clientSortBy, setClientSortBy] = useState("recent"); // "recent" or "name"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [clientForQuickCreate, setClientForQuickCreate] = useState("");
  const [clientDisplayName, setClientDisplayName] = useState("");

  const navigate = useNavigate();
  const toast = useCustomToast();
  const colors = useThemeColors();

  const { currentUserInfo } = useProductStore();

  // Fetch data on component mount and when user is authenticated
  useEffect(() => {
    if (currentUserInfo) {
      fetchData();
    }
  }, [currentUserInfo]);

  // Handle existing general workouts - convert them to client-specific or delete them
  const handleGeneralWorkouts = async () => {
    const generalWorkouts = sharedWorkouts.filter(
      (workout) => !workout.clientName || !workout.clientName.trim()
    );

    if (generalWorkouts.length > 0) {
      const shouldDelete = window.confirm(
        `You have ${generalWorkouts.length} general workouts that are no longer supported. Would you like to delete them? (Click Cancel to keep them for now)`
      );

      if (shouldDelete) {
        try {
          // Delete general workouts
          for (const workout of generalWorkouts) {
            await apiClient.delete(
              `${API_ENDPOINTS.DELETE_SHARED_WORKOUT(workout._id)}`
            );
          }
          toast.success("Success", "General workouts deleted successfully");
          fetchData(); // Refresh the data
        } catch (error) {
          console.error("Error deleting general workouts:", error);
          toast.error("Error", "Failed to delete some general workouts");
        }
      }
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch shared workouts (request all with high limit to avoid pagination issues)
      const sharedWorkoutsResponse = await apiClient.get(
        `${API_ENDPOINTS.GET_TRAINER_SHARED_WORKOUTS}?limit=1000`
      );

      // Fetch clients who have claimed workouts
      const clientsResponse = await apiClient.get(
        `${API_ENDPOINTS.GET_TRAINER_CLIENTS}?limit=1000`
      );

      const sharedWorkoutsData =
        sharedWorkoutsResponse.data.data.sharedWorkouts || [];
      const clientsData = clientsResponse.data.data.clients || [];

      setSharedWorkouts(sharedWorkoutsData);
      setClients(clientsData);

      // Calculate stats - only client-specific workouts
      const clientSpecificWorkouts = sharedWorkoutsData.filter(
        (workout) => workout.clientName && workout.clientName.trim()
      ).length;

      setStats({
        totalSharedWorkouts: clientSpecificWorkouts,
        totalClientWorkouts: clientSpecificWorkouts,
        generalWorkouts: 0,
        clientSpecificWorkouts: clientSpecificWorkouts,
        totalClients: clientsData.length,
      });

      // Check for and handle existing general workouts
      // DISABLED: Automatic deletion of general workouts to prevent accidental deletions
      // If you want to clean up general workouts, use the manual button in the dashboard
      // or uncomment the code below
      /*
      const generalWorkouts = sharedWorkoutsData.filter(
        (workout) => !workout.clientName || !workout.clientName.trim()
      );
      if (generalWorkouts.length > 0) {
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
          handleGeneralWorkouts();
        }, 1000);
      }
      */
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error", "Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  // Sort and filter functions - only client-specific workouts
  const getSortedSharedWorkouts = () => {
    // Filter to only client-specific workouts
    let sorted = sharedWorkouts.filter(
      (workout) => workout.clientName && workout.clientName.trim()
    );

    if (sortBy === "name") {
      sorted.sort((a, b) => a.workoutName.localeCompare(b.workoutName));
    } else if (sortBy === "created") {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Apply search filter
    if (searchTerm) {
      sorted = sorted.filter(
        (workout) =>
          workout.workoutName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          workout.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          workout.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (workout.tags &&
            workout.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      );
    }

    return sorted;
  };

  // Group workouts by client name
  const getWorkoutsByClient = () => {
    const grouped = {};

    sharedWorkouts.forEach((workout) => {
      if (workout.clientName && workout.clientName.trim()) {
        // Use normalized name as key to group clients properly
        const normalizedName = normalizeNameForStorage(workout.clientName);
        const displayName = workout.clientName.trim();

        if (!grouped[normalizedName]) {
          grouped[normalizedName] = {
            clientName: displayName,
            workouts: [],
            totalWorkouts: 0,
            lastWorkoutDate: null,
          };
        }

        grouped[normalizedName].workouts.push(workout);
        grouped[normalizedName].totalWorkouts++;

        // Track the most recent workout date for this client
        const workoutDate = new Date(workout.createdAt);
        if (
          !grouped[normalizedName].lastWorkoutDate ||
          workoutDate > grouped[normalizedName].lastWorkoutDate
        ) {
          grouped[normalizedName].lastWorkoutDate = workoutDate;
        }
      }
    });

    // Sort clients based on clientSortBy setting
    const clients = Object.values(grouped);
    if (clientSortBy === "recent") {
      return clients.sort(
        (a, b) => new Date(b.lastWorkoutDate) - new Date(a.lastWorkoutDate)
      );
    } else {
      return clients.sort((a, b) => a.clientName.localeCompare(b.clientName));
    }
  };

  // Get client-specific workouts for a particular client
  const getWorkoutsForClient = (clientName) => {
    return getSortedSharedWorkouts().filter(
      (workout) =>
        workout.clientName &&
        normalizeNameForStorage(workout.clientName) ===
          normalizeNameForStorage(clientName)
    );
  };

  // Handle edit workout
  const handleEditWorkout = (workout) => {
    setEditingWorkout(workout);
    setIsEditModalOpen(true);
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

  // Handle delete workout
  const handleDeleteWorkout = async (workout) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${workout.workoutName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await apiClient.delete(API_ENDPOINTS.DELETE_SHARED_WORKOUT(workout._id));

      setSharedWorkouts((prev) => prev.filter((w) => w._id !== workout._id));

      toast.success("Success", "Workout deleted successfully!");
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to delete workout"
      );
    }
  };

  // Handle view workout details
  const handleViewWorkoutDetails = (workout) => {
    const workoutInfo = `
Workout: ${workout.workoutName}
Client: ${workout.clientName || "Not specified"}
Total Shares: ${workout.totalShares || 0}
Completions: ${workout.completions || 0}
Created: ${formatDateSafe(workout.createdAt)}
    `.trim();

    alert(workoutInfo);
  };

  // Handle share workout
  const handleShareWorkout = (workout) => {
    setSharingWorkout(workout);
    setIsShareModalOpen(true);
  };

  // Handle share client (all workouts for a client)
  const handleShareClient = (clientName) => {
    setSharingWorkout({ clientName, isClientLink: true });
    setIsShareModalOpen(true);
  };

  const handleQuickCreateWorkout = (clientName) => {
    const normalizedName = normalizeNameForStorage(clientName);
    setClientForQuickCreate(normalizedName);
    setClientDisplayName(clientName);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setClientForQuickCreate("");
    setClientDisplayName("");
  };

  const handleCreateSuccess = () => {
    fetchData();
    toast.success(
      "Success",
      `Workout created for ${capitalizeName(
        clientDisplayName || clientForQuickCreate
      )}`
    );
    handleCloseCreateModal();
  };

  // Close share modal
  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setSharingWorkout(null);
  };

  if (!currentUserInfo) {
    return (
      <Container maxW="container.xl" pt={20} pb={8} px={6}>
        <Center>
          <VStack spacing={4}>
            <Text>Please log in to access the trainer dashboard.</Text>
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

  return (
    <Container maxW="container.xl" pt={20} pb={8} px={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack spacing={4} align="stretch">
          <VStack align="start" spacing={2}>
            <Heading size="lg">Trainer Dashboard</Heading>
            <Text color={colors.textSecondary}>
              Manage your shared workouts for clients
            </Text>
          </VStack>
          <HStack
            spacing={4}
            wrap="wrap"
            justify={{ base: "center", md: "flex-end" }}
          >
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="outline"
              onClick={() => navigate("/")}
              size={{ base: "sm", md: "md" }}
            >
              Back to Home
            </Button>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={() => navigate("/trainer/create-shared-workout")}
              size={{ base: "sm", md: "md" }}
            >
              Create Shared Workout
            </Button>
          </HStack>
        </VStack>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card bg={colors.bgMuted}>
            <CardBody>
              <Stat>
                <StatLabel>Total Workouts</StatLabel>
                <StatNumber>{stats.totalSharedWorkouts}</StatNumber>
                <StatHelpText>Created for clients</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg={colors.bgMuted}>
            <CardBody>
              <Stat>
                <StatLabel>Active Clients</StatLabel>
                <StatNumber>{getWorkoutsByClient().length}</StatNumber>
                <StatHelpText>With assigned workouts</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg={colors.bgMuted}>
            <CardBody>
              <Stat>
                <StatLabel>Clients with Claims</StatLabel>
                <StatNumber>{stats.totalClients}</StatNumber>
                <StatHelpText>Who have claimed workouts</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tab Navigation */}
        <HStack spacing={4} justify="center">
          <Button
            colorScheme={activeTab === "workouts" ? "blue" : "gray"}
            variant={activeTab === "workouts" ? "solid" : "outline"}
            onClick={() => setActiveTab("workouts")}
          >
            Client Workouts
          </Button>
          <Button
            colorScheme={activeTab === "clients" ? "blue" : "gray"}
            variant={activeTab === "clients" ? "solid" : "outline"}
            onClick={() => setActiveTab("clients")}
          >
            Claimed Clients
          </Button>
        </HStack>

        {/* Conditional Content Based on Active Tab */}
        {activeTab === "workouts" ? (
          /* Client Workouts Section */
          <VStack spacing={6} align="stretch">
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="semibold">
                Client Workouts ({getWorkoutsByClient().length} clients)
              </Text>
              <HStack
                spacing={4}
                wrap="wrap"
                justify={{ base: "center", md: "flex-end" }}
              >
                <InputGroup maxW={{ base: "100%", md: "300px" }} minW="200px">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color={colors.textMuted} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search clients or workouts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  maxW={{ base: "100%", md: "200px" }}
                  minW="150px"
                >
                  <option value="created">Sort by Created</option>
                  <option value="name">Sort by Name</option>
                </Select>
                <Select
                  value={clientSortBy}
                  onChange={(e) => setClientSortBy(e.target.value)}
                  maxW={{ base: "100%", md: "200px" }}
                  minW="150px"
                >
                  <option value="recent">Most Recent Workout</option>
                  <option value="name">Sort by Name</option>
                </Select>
              </HStack>
            </VStack>

            {getWorkoutsByClient().length > 0 ? (
              <VStack spacing={6} align="stretch">
                {getWorkoutsByClient()
                  .filter(
                    (client) =>
                      !searchTerm ||
                      client.clientName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      client.workouts.some((workout) =>
                        workout.workoutName
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                  )
                  .map((client) => {
                    const clientWorkouts = getWorkoutsForClient(
                      client.clientName
                    );
                    return (
                      <Card key={client.clientName} bg={colors.bgCard}>
                        <CardHeader>
                          <HStack
                            justify="space-between"
                            align="start"
                            spacing={4}
                            flexWrap="wrap"
                          >
                            <VStack align="start" spacing={2}>
                              <HStack
                                spacing={2}
                                flexWrap="wrap"
                                columnGap={2}
                                rowGap={2}
                                alignItems="center"
                              >
                                <Text fontWeight="bold" fontSize="lg">
                                  {capitalizeName(client.clientName)}
                                </Text>
                                <Button
                                  size="xs"
                                  colorScheme="purple"
                                  variant="outline"
                                  whiteSpace="nowrap"
                                  h="auto"
                                  fontSize="xs"
                                  px={3}
                                  onClick={() =>
                                    navigate(
                                      `/trainer/client/${encodeURIComponent(
                                        client.clientName
                                      )}`
                                    )
                                  }
                                >
                                  View Client
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="green"
                                  variant="outline"
                                  leftIcon={<LinkIcon />}
                                  whiteSpace="nowrap"
                                  h="auto"
                                  fontSize="xs"
                                  px={3}
                                  onClick={() =>
                                    handleShareClient(client.clientName)
                                  }
                                >
                                  Client Link
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="blue"
                                  variant="solid"
                                  leftIcon={<AddIcon />}
                                  whiteSpace="nowrap"
                                  h="auto"
                                  fontSize="xs"
                                  px={3}
                                  onClick={() =>
                                    handleQuickCreateWorkout(client.clientName)
                                  }
                                >
                                  Create Workout
                                </Button>
                              </HStack>
                            </VStack>
                          </HStack>
                        </CardHeader>
                        <CardBody pt={0}>
                          {clientWorkouts.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                              <SimpleGrid
                                columns={{ base: 1, md: 2 }}
                                spacing={4}
                              >
                                {clientWorkouts.slice(0, 2).map((workout) => (
                                  <Card
                                    key={workout._id}
                                    bg={colors.bgMuted}
                                    size="sm"
                                  >
                                    <CardHeader pb={2}>
                                      <HStack justify="space-between">
                                        <VStack align="start" spacing={1}>
                                          <Text
                                            fontWeight="medium"
                                            fontSize="md"
                                          >
                                            {workout.workoutName}
                                          </Text>
                                        </VStack>
                                        <HStack spacing={1}>
                                          <IconButton
                                            icon={<EditIcon />}
                                            variant="ghost"
                                            size="sm"
                                            aria-label="Edit workout"
                                            onClick={() =>
                                              handleEditWorkout(workout)
                                            }
                                          />
                                          <Menu>
                                            <MenuButton
                                              as={IconButton}
                                              icon={<HamburgerIcon />}
                                              variant="ghost"
                                              size="sm"
                                            />
                                            <MenuList>
                                              <MenuItem
                                                icon={<ViewIcon />}
                                                fontSize="sm"
                                                onClick={() =>
                                                  handleViewWorkoutDetails(
                                                    workout
                                                  )
                                                }
                                              >
                                                View Details
                                              </MenuItem>
                                              <MenuItem
                                                icon={<LinkIcon />}
                                                fontSize="sm"
                                                onClick={() =>
                                                  handleShareWorkout(workout)
                                                }
                                              >
                                                Generate Share Link
                                              </MenuItem>
                                              <MenuItem
                                                icon={<DeleteIcon />}
                                                fontSize="sm"
                                                onClick={() =>
                                                  handleDeleteWorkout(workout)
                                                }
                                                color="red.500"
                                              >
                                                Delete Workout
                                              </MenuItem>
                                            </MenuList>
                                          </Menu>
                                        </HStack>
                                      </HStack>
                                    </CardHeader>
                                    <CardBody pt={0}>
                                      <Box
                                        maxH="200px"
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
                                          color={colors.textSecondary}
                                          fontSize="xs"
                                          whiteSpace="pre-wrap"
                                          wordBreak="break-word"
                                        >
                                          {workout.description}
                                        </Text>
                                      </Box>
                                      <Text
                                        color={colors.textMuted}
                                        fontSize="xs"
                                        fontStyle="italic"
                                        mt={2}
                                      >
                                        Created:{" "}
                                        {formatDateSafe(workout.createdAt)}
                                      </Text>
                                    </CardBody>
                                  </Card>
                                ))}
                              </SimpleGrid>
                              {clientWorkouts.length > 4 && (
                                <Box
                                  bg={colors.bgMuted}
                                  borderRadius="md"
                                  p={3}
                                  textAlign="center"
                                  border="1px dashed"
                                  borderColor={colors.border}
                                  cursor="pointer"
                                  _hover={{ borderColor: colors.textPrimary }}
                                  onClick={() =>
                                    navigate(
                                      `/trainer/client/${encodeURIComponent(
                                        client.clientName
                                      )}`
                                    )
                                  }
                                >
                                  <Text
                                    color={colors.textSecondary}
                                    fontSize="sm"
                                    fontWeight="medium"
                                  >
                                    +{clientWorkouts.length - 4} more workout
                                    {clientWorkouts.length - 4 !== 1 ? "s" : ""}
                                  </Text>
                                  <Text
                                    color={colors.textMuted}
                                    fontSize="xs"
                                    mt={1}
                                  >
                                    Click to see all workouts
                                  </Text>
                                </Box>
                              )}
                            </VStack>
                          ) : (
                            <Text
                              color={colors.textMuted}
                              fontSize="sm"
                              textAlign="center"
                              py={4}
                            >
                              No workouts assigned to this client yet
                            </Text>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
              </VStack>
            ) : (
              <Card bg={colors.bgMuted}>
                <CardBody>
                  <Center py={8}>
                    <VStack spacing={4}>
                      <Text color={colors.textMuted}>
                        No Client Workouts Yet
                      </Text>
                      <Text
                        fontSize="sm"
                        color={colors.textMuted}
                        textAlign="center"
                      >
                        Create workouts for your clients to get started
                      </Text>
                      <Button
                        colorScheme="blue"
                        leftIcon={<AddIcon />}
                        onClick={() =>
                          navigate("/trainer/create-shared-workout")
                        }
                      >
                        Create Your First Workout
                      </Button>
                    </VStack>
                  </Center>
                </CardBody>
              </Card>
            )}
          </VStack>
        ) : (
          /* Clients Section */
          <VStack spacing={6} align="stretch">
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="semibold">
                Clients Who Have Claimed Workouts ({clients.length} clients)
              </Text>
              <HStack
                spacing={4}
                wrap="wrap"
                justify={{ base: "center", md: "flex-end" }}
              >
                <InputGroup maxW={{ base: "100%", md: "300px" }} minW="200px">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color={colors.textMuted} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </HStack>
            </VStack>

            {clients.length > 0 ? (
              <VStack spacing={6} align="stretch">
                {clients
                  .filter(
                    (client) =>
                      !searchTerm ||
                      client.clientName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      client.claimedWorkouts.some((workout) =>
                        workout.workoutName
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                  )
                  .map((client) => (
                    <Card key={client.clientUid} bg={colors.bgCard}>
                      <CardHeader>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2}>
                            <HStack>
                              <Text fontWeight="bold" fontSize="lg">
                                {capitalizeName(client.clientName)}
                              </Text>
                              <Badge colorScheme="green" size="sm">
                                {client.totalClaimedWorkouts} claimed
                              </Badge>
                              <Badge colorScheme="blue" size="sm">
                                {
                                  client.claimedWorkouts.filter(
                                    (w) => w.status === "completed"
                                  ).length
                                }{" "}
                                completed
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" color={colors.textMuted}>
                              Last claimed:{" "}
                              {formatDateSafe(client.lastClaimedAt)}
                            </Text>
                          </VStack>
                        </HStack>
                      </CardHeader>
                      <CardBody pt={0}>
                        {client.claimedWorkouts.length > 0 ? (
                          <VStack spacing={4} align="stretch">
                            <SimpleGrid
                              columns={{ base: 1, md: 2 }}
                              spacing={4}
                            >
                              {client.claimedWorkouts
                                .slice(0, 4)
                                .map((workout) => (
                                  <Card
                                    key={workout.assignmentId}
                                    bg={colors.bgMuted}
                                    size="sm"
                                  >
                                    <CardHeader pb={2}>
                                      <VStack align="start" spacing={1}>
                                        <Text fontWeight="medium" fontSize="md">
                                          {workout.workoutName}
                                        </Text>
                                        <Badge
                                          colorScheme={
                                            workout.status === "completed"
                                              ? "green"
                                              : workout.status === "in_progress"
                                              ? "yellow"
                                              : "blue"
                                          }
                                          size="sm"
                                        >
                                          {workout.status}
                                        </Badge>
                                      </VStack>
                                    </CardHeader>
                                    <CardBody pt={0}>
                                      <Text
                                        color={colors.textSecondary}
                                        fontSize="xs"
                                        noOfLines={3}
                                      >
                                        {workout.workoutDescription}
                                      </Text>
                                      <Text
                                        color={colors.textMuted}
                                        fontSize="xs"
                                        fontStyle="italic"
                                        mt={2}
                                      >
                                        Claimed:{" "}
                                        {formatDateSafe(workout.claimedAt)}
                                      </Text>
                                      {workout.completedAt && (
                                        <Text
                                          color={colors.textMuted}
                                          fontSize="xs"
                                          fontStyle="italic"
                                        >
                                          Completed:{" "}
                                          {formatDateSafe(workout.completedAt)}
                                        </Text>
                                      )}
                                    </CardBody>
                                  </Card>
                                ))}
                            </SimpleGrid>
                            {client.claimedWorkouts.length > 4 && (
                              <Box
                                bg={colors.bgMuted}
                                borderRadius="md"
                                p={3}
                                textAlign="center"
                                border="1px dashed"
                                borderColor={colors.border}
                              >
                                <Text
                                  color={colors.textSecondary}
                                  fontSize="sm"
                                  fontWeight="medium"
                                >
                                  +{client.claimedWorkouts.length - 4} more
                                  workout
                                  {client.claimedWorkouts.length - 4 !== 1
                                    ? "s"
                                    : ""}
                                </Text>
                              </Box>
                            )}
                          </VStack>
                        ) : (
                          <Text
                            color={colors.textMuted}
                            fontSize="sm"
                            textAlign="center"
                            py={4}
                          >
                            No claimed workouts yet
                          </Text>
                        )}
                      </CardBody>
                    </Card>
                  ))}
              </VStack>
            ) : (
              <Card bg={colors.bgMuted}>
                <CardBody>
                  <Center py={8}>
                    <VStack spacing={4}>
                      <Text color={colors.textMuted}>No Clients Yet</Text>
                      <Text
                        fontSize="sm"
                        color={colors.textMuted}
                        textAlign="center"
                      >
                        Share workouts with clients to see them here once they
                        claim them
                      </Text>
                    </VStack>
                  </Center>
                </CardBody>
              </Card>
            )}
          </VStack>
        )}
      </VStack>

      {/* Edit Modal */}
      <EditSharedWorkoutModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        sharedWorkout={editingWorkout}
        onSuccess={handleEditSuccess}
      />

      {/* Share Link Modal */}
      <ShareableLinkModal
        isOpen={isShareModalOpen}
        onClose={handleCloseShareModal}
        workout={sharingWorkout}
      />
      <CreateSharedWorkoutModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        clientName={clientForQuickCreate}
        displayClientName={clientDisplayName}
        onSuccess={handleCreateSuccess}
      />
    </Container>
  );
};

export default TrainerDashboard;
