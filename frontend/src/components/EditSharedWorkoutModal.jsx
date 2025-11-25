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
  HStack,
  Box,
  FormHelperText,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useCustomToast } from "../hooks/useCustomToast";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { FileUploader } from "./FileUploader";
import { parseDateSafe } from "../utils/dateUtils";
import { capitalizeName } from "../utils/nameUtils";
import { useThemeColors } from "../hooks/useThemeColors";

const EditSharedWorkoutModal = ({
  isOpen,
  onClose,
  sharedWorkout,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    workoutName: "",
    clientName: "",
    description: "",
    image: "",
    tags: [],
    createdAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useCustomToast();
  const colors = useThemeColors();

  // Helper function to extract date for form input
  const extractDateForForm = (dateString) => {
    if (!dateString) return new Date().toISOString().split("T")[0];

    // If it's already a YYYY-MM-DD string, return it
    if (typeof dateString === "string" && !dateString.includes("T")) {
      return dateString;
    }

    // If it's an ISO string, parse it safely and return as YYYY-MM-DD
    const parsedDate = parseDateSafe(dateString);
    if (parsedDate) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const day = String(parsedDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return new Date().toISOString().split("T")[0];
  };

  // Initialize form data when modal opens or workout changes
  useEffect(() => {
    if (isOpen && sharedWorkout) {
      setFormData({
        workoutName: sharedWorkout.workoutName || "",
        clientName: sharedWorkout.clientName || "",
        description: sharedWorkout.description || "",
        image: sharedWorkout.image || "",
        tags: sharedWorkout.tags || [],
        createdAt: extractDateForForm(sharedWorkout.createdAt),
      });
    }
  }, [isOpen, sharedWorkout]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
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

      const response = await apiClient.put(
        API_ENDPOINTS.UPDATE_SHARED_WORKOUT(sharedWorkout._id),
        formData
      );

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.message || "Failed to update workout");
      }
    } catch (error) {
      console.error("Error updating workout:", error);
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to update workout"
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
      createdAt: "",
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <ModalOverlay />
      <ModalContent bg={colors.bgCard} maxW="800px">
        <ModalHeader>
          {sharedWorkout?.clientName
            ? `Edit ${capitalizeName(sharedWorkout.clientName)}'s Workout`
            : "Edit Workout"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Workout Name</FormLabel>
                <Input
                  placeholder="e.g., Upper Body Strength, Lower Body Strength"
                  value={formData.workoutName}
                  onChange={(e) =>
                    handleInputChange("workoutName", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Workout Date</FormLabel>
                <Input
                  type="date"
                  value={formData.createdAt}
                  onChange={(e) =>
                    handleInputChange("createdAt", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Workout Description</FormLabel>
                <Textarea
                  placeholder="Workout Example:
  Workout Name & Weight - Rep Count:
  Push-ups - 15 15 15
  Bench Press 100lbs - 12 10 8 6
  Dumbbell Rows 50lbs - 12 10 8 6
  Shoulder Press 50lbs - 12 10 8 6
  Assisted Pull-ups 50lbs - 12 10 8 6"
                  rows={10}
                  value={formData.description}
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
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Updating..."
            >
              Update Workout
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditSharedWorkoutModal;
