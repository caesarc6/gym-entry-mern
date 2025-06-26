import { useToast } from "@chakra-ui/react";

export const useCustomToast = () => {
  const toast = useToast();

  const showToast = ({
    title,
    description,
    status = "info",
    duration = 5000,
    isClosable = true,
    position = "top-right",
    variant = "solid",
  }) => {
    return toast({
      title,
      description,
      status,
      duration,
      isClosable,
      position,
      variant,
      // Custom styling for modern look
      containerStyle: {
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
        background: "rgba(255, 255, 255, 0.95)",
        _dark: {
          background: "rgba(33, 37, 41, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
      },
    });
  };

  // Convenience methods for different toast types
  const success = (title, description) =>
    showToast({ title, description, status: "success" });

  const error = (title, description) =>
    showToast({ title, description, status: "error" });

  const warning = (title, description) =>
    showToast({ title, description, status: "warning" });

  const info = (title, description) =>
    showToast({ title, description, status: "info" });

  return {
    showToast,
    success,
    error,
    warning,
    info,
    toast, // Original toast function for advanced usage
  };
};
