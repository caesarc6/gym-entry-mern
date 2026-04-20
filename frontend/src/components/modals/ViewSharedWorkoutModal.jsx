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
  Badge,
  Box,
  Image,
  Divider,
} from "@chakra-ui/react";
import { useThemeColors } from "../../hooks/useThemeColors";
import { formatDateSafe } from "../../utils/dateUtils";
import { capitalizeName } from "../../utils/nameUtils";

const ViewSharedWorkoutModal = ({ isOpen, onClose, workout }) => {
  const colors = useThemeColors();

  if (!workout) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={colors.bgCard}>
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color={colors.textPrimary}>
              {workout.workoutName}
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              <Badge colorScheme="blue" size="sm">
                Client: {capitalizeName(workout.clientName || "Not specified")}
              </Badge>
              {workout.totalShares !== undefined && (
                <Badge colorScheme="green" size="sm">
                  {workout.totalShares || 0} shares
                </Badge>
              )}
              {workout.completions !== undefined && (
                <Badge colorScheme="purple" size="sm">
                  {workout.completions || 0} completions
                </Badge>
              )}
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <VStack spacing={4} align="stretch">
            {/* Workout Image */}
            {workout.image && (
              <Box>
                <Image
                  src={workout.image}
                  alt={workout.workoutName}
                  borderRadius="md"
                  maxH="300px"
                  objectFit="cover"
                  w="100%"
                />
              </Box>
            )}

            {/* Workout Description */}
            <Box
              p={4}
              bg={colors.bgMuted}
              borderRadius="md"
              border="1px solid"
              borderColor={colors.border}
            >
              <Text
                fontWeight="semibold"
                mb={2}
                fontSize="md"
                color={colors.textPrimary}
              >
                Workout Description
              </Text>
              <Text
                color={colors.textSecondary}
                fontSize="sm"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                fontFamily="monospace"
              >
                {workout.description || "No description provided"}
              </Text>
            </Box>

            {/* Workout Tags */}
            {workout.tags && workout.tags.length > 0 && (
              <Box>
                <Text fontWeight="semibold" mb={2} fontSize="sm">
                  Tags
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {workout.tags.map((tag, index) => (
                    <Badge key={index} colorScheme="gray" variant="subtle">
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </Box>
            )}

            <Divider />

            {/* Workout Metadata */}
            <VStack spacing={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" color={colors.textSecondary}>
                  Created:
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={colors.textPrimary}
                >
                  {formatDateSafe(workout.createdAt)}
                </Text>
              </HStack>
              {workout.updatedAt && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color={colors.textSecondary}>
                    Last Updated:
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={colors.textPrimary}
                  >
                    {formatDateSafe(workout.updatedAt)}
                  </Text>
                </HStack>
              )}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ViewSharedWorkoutModal;

