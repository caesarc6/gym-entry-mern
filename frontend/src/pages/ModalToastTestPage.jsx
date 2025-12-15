import {
  Box,
  Button,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
} from "@chakra-ui/react";
import { useState } from "react";
import CreateSharedWorkoutModal from "../components/CreateSharedWorkoutModal";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";

const ModalToastTestPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState("Test Client");
  const [displayClientName, setDisplayClientName] = useState("Test Client");

  // Toast configuration state
  const [toastConfig, setToastConfig] = useState({
    title: "Test Toast",
    description: "This is a test toast notification",
    status: "success",
    duration: 5000,
    isClosable: true,
    position: "top-right",
    variant: "solid",
  });

  // Toast CSS styling state
  const [toastStyles, setToastStyles] = useState({
    minWidth: "320px",
    maxWidth: "400px",
    padding: "16px",
    margin: "8px",
    borderRadius: "16px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    backdropFilter: "blur(16px)",
    border: "1px solid",
    borderColor: "rgba(255, 255, 255, 0.1)",
  });

  const toast = useCustomToast();
  const colors = useThemeColors();

  const handleModalSuccess = (data) => {
    toast.success(
      "Workout Created",
      `Workout "${data.workoutName}" was created successfully!`
    );
  };

  const showTestToast = () => {
    // Use showToast with custom configuration
    toast.showToast({
      title: toastConfig.title,
      description: toastConfig.description,
      status: toastConfig.status,
      duration: toastConfig.duration,
      isClosable: toastConfig.isClosable,
      position: toastConfig.position,
      variant: toastConfig.variant,
    });
  };

  return (
    <Container maxW="container.xl" pt={20} pb={8} px={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="xl" color={colors.textPrimary}>
          Modal & Toast Testing Page
        </Heading>
        <Text color={colors.textSecondary}>
          Test the CreateSharedWorkoutModal and toast notifications
        </Text>

        <Divider />

        {/* Modal Testing Section */}
        <Card bg={colors.bgCard}>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="lg" color={colors.textPrimary}>
                Modal Testing
              </Heading>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Client Name</FormLabel>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>
                  Display Client Name
                </FormLabel>
                <Input
                  value={displayClientName}
                  onChange={(e) => setDisplayClientName(e.target.value)}
                  placeholder="Enter display client name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <HStack spacing={4}>
                <Button
                  colorScheme="blue"
                  onClick={() => setIsModalOpen(true)}
                  size="lg"
                >
                  Open Create Workout Modal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  size="lg"
                >
                  Close Modal
                </Button>
              </HStack>

              <Text fontSize="sm" color={colors.textMuted}>
                Current Modal State: {isModalOpen ? "Open" : "Closed"}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Toast Testing Section */}
        <Card bg={colors.bgCard}>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="lg" color={colors.textPrimary}>
                Toast Testing
              </Heading>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Toast Title</FormLabel>
                <Input
                  value={toastConfig.title}
                  onChange={(e) =>
                    setToastConfig({ ...toastConfig, title: e.target.value })
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>
                  Toast Description
                </FormLabel>
                <Input
                  value={toastConfig.description}
                  onChange={(e) =>
                    setToastConfig({
                      ...toastConfig,
                      description: e.target.value,
                    })
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Status</FormLabel>
                <Select
                  value={toastConfig.status}
                  onChange={(e) =>
                    setToastConfig({ ...toastConfig, status: e.target.value })
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                >
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Position</FormLabel>
                <Select
                  value={toastConfig.position}
                  onChange={(e) =>
                    setToastConfig({ ...toastConfig, position: e.target.value })
                  }
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                >
                  <option value="top">Top</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom">Bottom</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Duration (ms)</FormLabel>
                <NumberInput
                  value={toastConfig.duration}
                  onChange={(value) =>
                    setToastConfig({
                      ...toastConfig,
                      duration: parseInt(value) || 5000,
                    })
                  }
                  min={1000}
                  max={10000}
                  step={500}
                >
                  <NumberInputField
                    color={colors.textPrimary}
                    borderColor={colors.borderColorInput}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel color={colors.textPrimary} mb={0}>
                  Closable
                </FormLabel>
                <Switch
                  isChecked={toastConfig.isClosable}
                  onChange={(e) =>
                    setToastConfig({
                      ...toastConfig,
                      isClosable: e.target.checked,
                    })
                  }
                />
              </FormControl>

              <Divider />

              <Heading size="md" color={colors.textPrimary}>
                Toast CSS Styling
              </Heading>
              <Text fontSize="sm" color={colors.textMuted}>
                Edit the CSS properties below. These match the containerStyle in
                useCustomToast.js
              </Text>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Min Width</FormLabel>
                <Input
                  value={toastStyles.minWidth}
                  onChange={(e) =>
                    setToastStyles({ ...toastStyles, minWidth: e.target.value })
                  }
                  placeholder="320px"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Max Width</FormLabel>
                <Input
                  value={toastStyles.maxWidth}
                  onChange={(e) =>
                    setToastStyles({ ...toastStyles, maxWidth: e.target.value })
                  }
                  placeholder="400px"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Padding</FormLabel>
                <Input
                  value={toastStyles.padding}
                  onChange={(e) =>
                    setToastStyles({ ...toastStyles, padding: e.target.value })
                  }
                  placeholder="16px"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Margin</FormLabel>
                <Input
                  value={toastStyles.margin}
                  onChange={(e) =>
                    setToastStyles({ ...toastStyles, margin: e.target.value })
                  }
                  placeholder="8px"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Border Radius</FormLabel>
                <Input
                  value={toastStyles.borderRadius}
                  onChange={(e) =>
                    setToastStyles({
                      ...toastStyles,
                      borderRadius: e.target.value,
                    })
                  }
                  placeholder="16px"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Box Shadow</FormLabel>
                <Input
                  value={toastStyles.boxShadow}
                  onChange={(e) =>
                    setToastStyles({
                      ...toastStyles,
                      boxShadow: e.target.value,
                    })
                  }
                  placeholder="0 20px 25px -5px rgba(0, 0, 0, 0.1)..."
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>
                  Backdrop Filter
                </FormLabel>
                <Input
                  value={toastStyles.backdropFilter}
                  onChange={(e) =>
                    setToastStyles({
                      ...toastStyles,
                      backdropFilter: e.target.value,
                    })
                  }
                  placeholder="blur(16px)"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Border</FormLabel>
                <Input
                  value={toastStyles.border}
                  onChange={(e) =>
                    setToastStyles({ ...toastStyles, border: e.target.value })
                  }
                  placeholder="1px solid"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={colors.textPrimary}>Border Color</FormLabel>
                <Input
                  value={toastStyles.borderColor}
                  onChange={(e) =>
                    setToastStyles({
                      ...toastStyles,
                      borderColor: e.target.value,
                    })
                  }
                  placeholder="rgba(255, 255, 255, 0.1)"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                />
              </FormControl>

              <HStack spacing={4} flexWrap="wrap">
                <Button colorScheme="blue" onClick={showTestToast} size="lg">
                  Show Custom Toast
                </Button>
                <Button
                  colorScheme="green"
                  onClick={() =>
                    toast.success(
                      "Success!",
                      "Operation completed successfully"
                    )
                  }
                  size="lg"
                >
                  Quick Success Toast
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => toast.error("Error!", "Something went wrong")}
                  size="lg"
                >
                  Quick Error Toast
                </Button>
                <Button
                  colorScheme="yellow"
                  onClick={() => toast.warning("Warning!", "Please be careful")}
                  size="lg"
                >
                  Quick Warning Toast
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => toast.info("Info", "Here's some information")}
                  size="lg"
                >
                  Quick Info Toast
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* CSS Location Info */}
        <Card bg={colors.bgCard}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" color={colors.textPrimary}>
                Toast Configuration
              </Heading>
              <VStack align="start" spacing={2}>
                <Text color={colors.textPrimary} fontWeight="bold">
                  File: frontend/src/hooks/useCustomToast.js
                </Text>
                <Text color={colors.textSecondary}>
                  The app now uses Sonner for toasts. Styling is handled via the
                  Toaster component in frontend/src/components/ui/sonner.tsx
                </Text>
                <Box
                  p={3}
                  bg={colors.bgMuted}
                  borderRadius="md"
                  fontFamily="monospace"
                  fontSize="sm"
                  color={colors.textPrimary}
                >
                  <Text>containerStyle: {"{"}</Text>
                  <Text pl={4}>minWidth: "{toastStyles.minWidth}",</Text>
                  <Text pl={4}>maxWidth: "{toastStyles.maxWidth}",</Text>
                  <Text pl={4}>padding: "{toastStyles.padding}",</Text>
                  <Text pl={4}>margin: "{toastStyles.margin}",</Text>
                  <Text pl={4}>
                    borderRadius: "{toastStyles.borderRadius}",
                  </Text>
                  <Text pl={4}>boxShadow: "{toastStyles.boxShadow}",</Text>
                  <Text pl={4}>
                    backdropFilter: "{toastStyles.backdropFilter}",
                  </Text>
                  <Text pl={4}>border: "{toastStyles.border}",</Text>
                  <Text pl={4}>borderColor: "{toastStyles.borderColor}",</Text>
                  <Text>{"}"}</Text>
                </Box>
                <Text color={colors.textSecondary} fontSize="sm">
                  After testing, copy your preferred values to useCustomToast.js
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Mobile Testing Instructions */}
        <Card bg={colors.bgCard}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" color={colors.textPrimary}>
                Mobile Testing Instructions
              </Heading>
              <VStack align="start" spacing={2}>
                <Text color={colors.textSecondary}>
                  1. Open the modal and test tapping the "Create Workout" button
                </Text>
                <Text color={colors.textSecondary}>
                  2. Verify that tapping "Create Workout" doesn't select the
                  "Add Image" button
                </Text>
                <Text color={colors.textSecondary}>
                  3. Test the toast notifications on mobile to see positioning
                </Text>
                <Text color={colors.textSecondary}>
                  4. Try different toast positions to see which works best on
                  mobile
                </Text>
                <Text color={colors.textSecondary}>
                  5. Adjust CSS properties above and test how they look on
                  mobile
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Modal Component */}
      <CreateSharedWorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientName={clientName}
        displayClientName={displayClientName}
        onSuccess={handleModalSuccess}
      />
    </Container>
  );
};

export default ModalToastTestPage;
