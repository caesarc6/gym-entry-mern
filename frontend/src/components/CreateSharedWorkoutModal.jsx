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
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  HStack,
  Box,
  FormHelperText,
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useCustomToast } from "../hooks/useCustomToast";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { FileUploader } from "./FileUploader";
import { normalizeNameForStorage, capitalizeName } from "../utils/nameUtils";
import { useThemeColors } from "../hooks/useThemeColors";

const CreateSharedWorkoutModal = ({
  isOpen,
  onClose,
  clientName,
  displayClientName,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    workoutName: "",
    clientName: "",
    description: "",
    image: "",
    tags: [],
    createdAt: new Date().toISOString().split("T")[0],
  });
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

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

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setFormData({
        workoutName: "",
        clientName: clientName || "",
        description: "",
        image: "",
        tags: [],
        createdAt: new Date().toISOString().split("T")[0],
      });
      setNewTag("");
    }
  }, [isOpen, clientName]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;

    if (formData.tags.includes(newTag.trim())) {
      toast.error("Error", "Tag already exists");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()],
    }));
    setNewTag("");
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: reader.result,
      }));
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.workoutName.trim() || !formData.description.trim()) {
      toast.error("Error", "Workout name and description are required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Normalize client name for storage (lowercase) but keep original for display
      const dataToSubmit = {
        ...formData,
        clientName: formData.clientName
          ? normalizeNameForStorage(formData.clientName)
          : null,
      };

      const response = await apiClient.post(
        API_ENDPOINTS.CREATE_SHARED_WORKOUT,
        dataToSubmit
      );

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.message || "Failed to create workout");
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to create workout"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      workoutName: "",
      clientName: "",
      description: "",
      image: "",
      tags: [],
      createdAt: new Date().toISOString().split("T")[0],
    });
    setNewTag("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={colors.bgCard} maxW="600px">
        <ModalHeader color="gray.950">
          {clientName || displayClientName
            ? `Create Workout for ${capitalizeName(
                displayClientName || clientName
              )}`
            : "Create Shared Workout"}
        </ModalHeader>
        <ModalCloseButton color="gray.700" />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="gray.950" fontWeight="semibold">
                  Workout Name
                </FormLabel>
                <Input
                  placeholder="e.g., Upper Body Strength, Lower Body Strength"
                  value={formData.workoutName}
                  onChange={(e) =>
                    handleInputChange("workoutName", e.target.value)
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.950" fontWeight="semibold">
                  Workout Date
                </FormLabel>
                <Input
                  type="date"
                  value={formData.createdAt}
                  onChange={(e) =>
                    handleInputChange("createdAt", e.target.value)
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.950" fontWeight="semibold">
                  Workout Description
                </FormLabel>
                <Textarea
                  placeholder="Workout Example:
  Workout Name & Weight - Rep Count:
  Push-ups - 15 15 15
  Bench Press 100lbs - 12 10 8 6
  Dumbbell Rows 50lbs - 12 10 8 6
  Shoulder Press 50lbs - 12 10 8 6
  Assisted Pull-ups 50lbs - 12 10 8 6"
                  rows={8}
                  value={formData.description}
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
                <FormLabel color="gray.950" fontWeight="semibold">
                  Workout Image (Optional)
                </FormLabel>
                <FileUploader
                  handleFile={handleFileUpload}
                  maxSizeMB={5}
                  showCompressionInfo={true}
                />
                {formData.image && (
                  <Box mt={2}>
                    <img
                      src={formData.image}
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
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="outline"
              onClick={handleClose}
              type="button"
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
              loadingText="Creating..."
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              style={{ position: "relative", zIndex: 10 }}
              bg="blue.500"
              color="white"
              _hover={{ bg: "blue.600" }}
            >
              {clientName || displayClientName
                ? `Create Workout for ${capitalizeName(
                    displayClientName || clientName
                  )}`
                : "Create Workout"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateSharedWorkoutModal;
