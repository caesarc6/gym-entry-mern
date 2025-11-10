import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Card,
  CardBody,
  CardHeader,
  IconButton,
  useColorModeValue,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AddIcon, DeleteIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { FileUploader } from "../components/FileUploader";
import { useCustomToast } from "../hooks/useCustomToast";
import { auth } from "../firebase";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { normalizeNameForStorage, capitalizeName } from "../utils/nameUtils";

const CreateSharedWorkout = () => {
  const [sharedWorkout, setSharedWorkout] = useState({
    workoutName: "",
    clientName: "",
    description: "",
    image: "",
    tags: [],
    createdAt: new Date().toISOString().split("T")[0], // Default to today
  });

  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const navigate = useNavigate();
  const toast = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  // Fetch clients list
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const response = await apiClient.get(
        `${API_ENDPOINTS.GET_TRAINER_SHARED_WORKOUTS}?limit=1000`
      );
      const workouts = response.data.data.sharedWorkouts || [];

      // Extract unique client names from workouts (case-insensitive deduplication)
      const clientNames = workouts
        .filter((workout) => workout.clientName && workout.clientName.trim())
        .map((workout) => workout.clientName.trim())
        .filter((name) => name.length > 0 && name.trim().length > 0); // Remove empty/whitespace-only names

      // Use a Map to deduplicate case-insensitively while preserving original casing
      const uniqueClientsMap = new Map();
      clientNames.forEach((name) => {
        const normalizedName = name.toLowerCase().trim();
        if (
          normalizedName &&
          normalizedName.length > 0 &&
          !uniqueClientsMap.has(normalizedName)
        ) {
          uniqueClientsMap.set(normalizedName, name.trim());
        }
      });

      const uniqueClients = Array.from(uniqueClientsMap.values())
        .filter((name) => name && name.trim().length > 0)
        .sort();

      setClients(uniqueClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Error", "Failed to load client list");
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  const handleInputChange = (field, value) => {
    setSharedWorkout((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;

    if (sharedWorkout.tags.includes(newTag.trim())) {
      toast.error("Error", "Tag already exists");
      return;
    }

    setSharedWorkout((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()],
    }));
    setNewTag("");
  };

  const removeTag = (tagToRemove) => {
    setSharedWorkout((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSharedWorkout((prev) => ({
        ...prev,
        image: reader.result,
      }));
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (
      !sharedWorkout.workoutName.trim() ||
      !sharedWorkout.description.trim()
    ) {
      toast.error("Error", "Workout name and description are required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Normalize client name for storage (lowercase) but keep original for display
      const dataToSubmit = {
        ...sharedWorkout,
        clientName: sharedWorkout.clientName
          ? normalizeNameForStorage(sharedWorkout.clientName)
          : null,
      };

      const response = await apiClient.post(
        API_ENDPOINTS.CREATE_SHARED_WORKOUT,
        dataToSubmit
      );

      if (response.data.success) {
        const successMessage =
          sharedWorkout.clientName && sharedWorkout.clientName.trim()
            ? `Workout created and assigned to ${capitalizeName(
                sharedWorkout.clientName
              )}!`
            : "Workout created successfully!";
        toast.success("Success", successMessage);
        navigate("/trainer/dashboard");
      } else {
        throw new Error(
          response.data.message || "Failed to create sharedWorkout"
        );
      }
    } catch (error) {
      console.error("Error creating sharedWorkout:", error);
      toast.error(
        "Error",
        error.response?.data?.message ||
          "Failed to create workout sharedWorkout"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8} pt="120px">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <HStack>
          <IconButton
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={() => navigate("/trainer/dashboard")}
          />
          <VStack align="start" spacing={1}>
            <Heading size="lg">Create Shared Workout</Heading>
            <Text color="gray.600">
              Create a reusable workout sharedWorkout for your clients
            </Text>
          </VStack>
        </HStack>

        {/* Basic Information */}
        <Card bg={bgColor}>
          <CardHeader>
            <Heading size="md">Basic Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Client Name</FormLabel>
                {isLoadingClients ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color="gray.500">
                      Loading clients...
                    </Text>
                  </HStack>
                ) : (
                  <VStack spacing={2} align="stretch">
                    <Input
                      placeholder="Type client name or select from list below"
                      value={sharedWorkout.clientName}
                      onChange={(e) =>
                        handleInputChange("clientName", e.target.value)
                      }
                      list="clients-list"
                    />
                    <datalist id="clients-list">
                      {clients.map((client) => (
                        <option key={client} value={client}>
                          {capitalizeName(client)}
                        </option>
                      ))}
                    </datalist>
                  </VStack>
                )}
                <FormHelperText>
                  Type a new client name or select from existing clients
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Workout Name</FormLabel>
                <Input
                  placeholder="e.g., Upper Body Strength, Lower Body Strength"
                  value={sharedWorkout.workoutName}
                  onChange={(e) =>
                    handleInputChange("workoutName", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Workout Date</FormLabel>
                <Input
                  type="date"
                  value={sharedWorkout.createdAt}
                  onChange={(e) =>
                    handleInputChange("createdAt", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Workout</FormLabel>
                <Textarea
                  placeholder="Workout Example:
  Workout Name & Weight - Rep Count:
  Push-ups - 15 15 15
  Bench Press 100lbs - 12 10 8 6
  Dumbbell Rows 50lbs - 12 10 8 6
  Shoulder Press 50lbs - 12 10 8 6
  Assisted Pull-ups 50lbs - 12 10 8 6"
                  rows={12}
                  value={sharedWorkout.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  fontSize="sm"
                  fontFamily="monospace"
                />
              </FormControl>

              {/* Image Upload */}
              <FormControl>
                <FormLabel>Workout Image (Optional)</FormLabel>
                <FileUploader
                  handleFile={handleFileUpload}
                  maxSizeMB={5}
                  showCompressionInfo={true}
                />
                {sharedWorkout.image && (
                  <Box mt={2}>
                    <img
                      src={sharedWorkout.image}
                      alt="Workout preview"
                      style={{
                        maxWidth: "200px",
                        maxHeight: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </Box>
                )}
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Submit Button */}
        <HStack justify="space-between">
          <Button
            variant="outline"
            onClick={() => navigate("/trainer/dashboard")}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Creating Workout..."
          >
            Create Workout
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};

export default CreateSharedWorkout;
