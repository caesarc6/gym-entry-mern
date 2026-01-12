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
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AddIcon, DeleteIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { FileUploader } from "../components/FileUploader";
import { useCustomToast } from "../hooks/useCustomToast";
import { auth } from "../firebase";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { normalizeNameForStorage, capitalizeName } from "../utils/nameUtils";
import { useThemeColors } from "../hooks/useThemeColors";

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
  const [isClientPrefilled, setIsClientPrefilled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useCustomToast();
  const colors = useThemeColors();

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
      toast.error("Error", "Failed to load client list");
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Prefill client name if provided via query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientParam = params.get("client");
    if (clientParam && clientParam.trim().length > 0) {
      setIsClientPrefilled(true);
      setSharedWorkout((prev) => ({
        ...prev,
        clientName: clientParam.trim(),
      }));
    } else {
      setIsClientPrefilled(false);
    }
  }, [location.search]);

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
            <Heading size="lg" color={colors.textPrimary}>Create Shared Workout</Heading>
            <Text color={colors.textSecondary}>
              Create a reusable workout sharedWorkout for your clients
            </Text>
          </VStack>
        </HStack>

        {/* Basic Information */}
        <Card bg={colors.bgCard}>
          <CardHeader>
            <Heading size="md" color={colors.textPrimary}>Basic Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="gray.950" fontWeight="semibold">Client Name</FormLabel>
                {isClientPrefilled ? (
                  <Text fontWeight="semibold" color={colors.textPrimary}>
                    {capitalizeName(sharedWorkout.clientName)}
                  </Text>
                ) : isLoadingClients ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color="gray.700">
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
                      color={colors.textPrimary}
                      borderColor={colors.borderColorInput}
                      _placeholder={{ color: colors.textMuted }}
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
                {!isClientPrefilled && (
                  <FormHelperText color="gray.700">
                    Type a new client name or select from existing clients
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.950" fontWeight="semibold">Workout Name</FormLabel>
                <Input
                  placeholder="e.g., Upper Body Strength, Lower Body Strength"
                  value={sharedWorkout.workoutName}
                  onChange={(e) =>
                    handleInputChange("workoutName", e.target.value)
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.950" fontWeight="semibold">Workout Date</FormLabel>
                <Input
                  type="date"
                  value={sharedWorkout.createdAt}
                  onChange={(e) =>
                    handleInputChange("createdAt", e.target.value)
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.950" fontWeight="semibold">Workout</FormLabel>
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
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
              </FormControl>

              {/* Image Upload */}
              <FormControl>
                <FormLabel color="gray.950" fontWeight="semibold">Workout Image (Optional)</FormLabel>
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
            borderColor={colors.borderColorInput}
            color="gray.950"
            _hover={{ bg: colors.bgHover, borderColor: colors.borderColor }}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Creating Workout..."
            bg="blue.500"
            color="white"
            _hover={{ bg: "blue.600" }}
          >
            Create Workout
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};

export default CreateSharedWorkout;
