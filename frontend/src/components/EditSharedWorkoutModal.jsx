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
  useColorModeValue,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  HStack,
  Box,
  FormHelperText,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useCustomToast } from "../hooks/useCustomToast";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { FileUploader } from "./FileUploader";

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
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");

  // Initialize form data when modal opens or workout changes
  useEffect(() => {
    console.log(
      "EditSharedWorkoutModal useEffect - isOpen:",
      isOpen,
      "sharedWorkout:",
      sharedWorkout
    );
    if (isOpen && sharedWorkout) {
      console.log("Setting form data for workout:", sharedWorkout);
      setFormData({
        workoutName: sharedWorkout.workoutName || "",
        clientName: sharedWorkout.clientName || "",
        description: sharedWorkout.description || "",
        image: sharedWorkout.image || "",
        tags: sharedWorkout.tags || [],
        createdAt: sharedWorkout.createdAt
          ? new Date(sharedWorkout.createdAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
      setNewTag("");
    }
  }, [isOpen, sharedWorkout]);

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

      console.log("Submitting workout update:", {
        workoutId: sharedWorkout._id,
        formData: formData,
        endpoint: API_ENDPOINTS.UPDATE_SHARED_WORKOUT(sharedWorkout._id),
      });

      const response = await apiClient.put(
        API_ENDPOINTS.UPDATE_SHARED_WORKOUT(sharedWorkout._id),
        formData
      );

      console.log("Update response:", response);

      if (response.data.success) {
        toast.success("Success", "Workout updated successfully!");
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
    setNewTag("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW="600px">
        <ModalHeader>Edit Shared Workout</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Client Name</FormLabel>
                <Input
                  placeholder="Client name"
                  value={formData.clientName}
                  onChange={(e) =>
                    handleInputChange("clientName", e.target.value)
                  }
                />
                <FormHelperText>
                  This workout will be organized under this client on your
                  dashboard
                </FormHelperText>
              </FormControl>

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
                <FormHelperText>
                  Set the date when this workout was created (useful for
                  backdating)
                </FormHelperText>
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
                  rows={8}
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

              {/* Tags */}
              <FormControl>
                <FormLabel>Tags (Optional)</FormLabel>
                <HStack w="full">
                  <Input
                    placeholder="Add tags for better organization..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    Add
                  </Button>
                </HStack>

                {formData.tags.length > 0 && (
                  <Wrap mt={2}>
                    {formData.tags.map((tag, index) => (
                      <WrapItem key={index}>
                        <Tag size="md" colorScheme="blue" variant="solid">
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton onClick={() => removeTag(tag)} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
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
