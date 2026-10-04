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
  Text,
  Badge,
  Box,
  HStack,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckCircleIcon, CalendarIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDateSafe } from "../utils/dateUtils";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useProductStore } from "../store/product";

const ClaimedWorkoutsModal = ({ isOpen, onClose, claimedWorkouts = [] }) => {
  const navigate = useNavigate();
  const toast = useCustomToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await apiClient.post(API_ENDPOINTS.CLAIM_PENDING_WORKOUTS);
      useProductStore.getState().setClaimedWorkouts([]);
      useProductStore.getState().setShowClaimedWorkoutsModal(false);
      onClose();
      navigate("/");
    } catch (error) {
      toast.error(
        "Could not accept workouts",
        error.response?.data?.message || "Try again in a moment.",
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (!claimedWorkouts || claimedWorkouts.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isCentered
      closeOnOverlayClick={false}
    >
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={bgColor} maxH="80vh">
        <ModalHeader>
          <HStack spacing={2}>
            <CheckCircleIcon color="green.500" />
            <Text>Welcome! You have workouts assigned to you!</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <VStack spacing={4} align="stretch">
            <Text color="gray.600">
              Your trainer assigned{" "}
              <strong>{claimedWorkouts.length}</strong> workout
              {claimedWorkouts.length > 1 ? "s" : ""} to you. Accept
              {claimedWorkouts.length > 1 ? " them" : " it"} to add
              {claimedWorkouts.length > 1 ? " them" : " it"} to your account.
            </Text>

            <Divider />

            <VStack spacing={3} align="stretch">
              {claimedWorkouts.map((assignment, index) => {
                const workout = assignment.sharedWorkoutId;
                return (
                  <Box
                    key={assignment._id || index}
                    p={4}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="green.200"
                  >
                    <VStack align="start" spacing={2}>
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="bold" fontSize="md">
                          {assignment.customLabel || workout?.workoutName}
                        </Text>
                        <Badge colorScheme="green" size="sm">
                          New
                        </Badge>
                      </HStack>

                      {workout?.description && (
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          noOfLines={2}
                          whiteSpace="pre-wrap"
                        >
                          {workout.description}
                        </Text>
                      )}

                      <HStack fontSize="xs" color="gray.500">
                        <CalendarIcon />
                        <Text>
                          Assigned: {formatDateSafe(assignment.createdAt)}
                        </Text>
                      </HStack>

                      {assignment.sharedByName && (
                        <Text fontSize="xs" color="gray.500">
                          From: <strong>{assignment.sharedByName}</strong>
                        </Text>
                      )}
                    </VStack>
                  </Box>
                );
              })}
            </VStack>

            <Box bg="blue.50" p={3} borderRadius="md" mt={2}>
              <Text fontSize="sm" color="blue.800">
                They stay pending until you accept. After that they show up on
                your home feed.
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isAccepting}>
            Not now
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleAccept}
            isLoading={isAccepting}
          >
            Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ClaimedWorkoutsModal;

