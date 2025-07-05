import React from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Collapse,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { RECOGNIZED_GYMS, getGymVariations } from "../utils/gymNormalizer.js";

const GymNameHelper = () => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box>
      <Button size="sm" variant="outline" onClick={onToggle} mb={2}>
        {isOpen ? "Hide" : "Show"} Gym Name Help
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <Box
          p={4}
          bg="gray.50"
          _dark={{ bg: "gray.700" }}
          borderRadius="md"
          mb={4}
        >
          <Text fontSize="sm" fontWeight="medium" mb={3}>
            Supported gym names and abbreviations:
          </Text>

          <VStack spacing={3} align="stretch">
            {RECOGNIZED_GYMS.map((gym) => {
              const variations = getGymVariations(gym);
              return (
                <Box key={gym}>
                  <Text fontWeight="bold" fontSize="sm">
                    {gym}
                  </Text>
                  <HStack spacing={1} flexWrap="wrap">
                    {variations.slice(0, 6).map((variation) => (
                      <Badge
                        key={variation}
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                      >
                        {variation}
                      </Badge>
                    ))}
                    {variations.length > 6 && (
                      <Badge size="sm" colorScheme="gray">
                        +{variations.length - 6} more
                      </Badge>
                    )}
                  </HStack>
                </Box>
              );
            })}
          </VStack>

          <Text fontSize="xs" color="gray.600" mt={3}>
            💡 Tip: Use @ symbol before gym names (e.g., "Push @blink" or "Legs
            @pf")
          </Text>
        </Box>
      </Collapse>
    </Box>
  );
};

export default GymNameHelper;
