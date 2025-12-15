import { toast as sonnerToast } from "sonner";

export const useCustomToast = () => {
  const showToast = ({
    title,
    description,
    status = "info",
    duration = 5000,
    isClosable = true,
    position = "top-right",
    variant = "solid",
  }) => {
    // Map Chakra UI status to Sonner types
    const sonnerType =
      status === "success"
        ? "success"
        : status === "error"
        ? "error"
        : status === "warning"
        ? "warning"
        : "info";

    // Map Chakra UI position to Sonner position
    const sonnerPosition =
      position === "top"
        ? "top-center"
        : position === "top-left"
        ? "top-left"
        : position === "top-right"
        ? "top-right"
        : position === "bottom"
        ? "bottom-center"
        : position === "bottom-left"
        ? "bottom-left"
        : position === "bottom-right"
        ? "bottom-right"
        : "top-right";

    // Combine title and description for Sonner
    // Sonner supports description as a second parameter or in options
    const message = title;
    const options = {
      duration,
      dismissible: isClosable,
      position: sonnerPosition,
      ...(description && { description }),
    };

    return sonnerToast[sonnerType](message, options);
  };

  // Convenience methods for different toast types
  const success = (title, description) => {
    return description
      ? sonnerToast.success(title, { description })
      : sonnerToast.success(title);
  };

  const error = (title, description) => {
    return description
      ? sonnerToast.error(title, { description })
      : sonnerToast.error(title);
  };

  const warning = (title, description) => {
    return description
      ? sonnerToast.warning(title, { description })
      : sonnerToast.warning(title);
  };

  const info = (title, description) => {
    return description
      ? sonnerToast.info(title, { description })
      : sonnerToast.info(title);
  };

  return {
    showToast,
    success,
    error,
    warning,
    info,
    toast: sonnerToast, // Original sonner toast function for advanced usage
  };
};
