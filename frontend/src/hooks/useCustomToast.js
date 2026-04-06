import { toast as sonnerToast } from "sonner";

export const useCustomToast = () => {
  const showToast = ({
    title,
    description,
    status = "info",
    duration = 1300,
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
    // Ensure duration is a valid number (not 0 or Infinity) - default to 1300ms
    const validDuration =
      duration && duration > 0 && duration !== Infinity ? duration : 1300;
    const options = {
      duration: validDuration,
      dismissible: isClosable,
      position: sonnerPosition,
      ...(description && { description }),
    };

    return sonnerToast[sonnerType](message, options);
  };

  // Convenience methods for different toast types
  const success = (title, description) => {
    const options = {
      duration: 1300,
      dismissible: true,
      ...(description && { description }),
    };
    // Ensure duration is a valid number (not 0 or Infinity)
    if (!options.duration || options.duration <= 0) {
      options.duration = 1300;
    }
    return sonnerToast.success(title, options);
  };

  const error = (title, description) => {
    const options = {
      duration: 1300,
      dismissible: true,
      ...(description && { description }),
    };
    // Ensure duration is a valid number (not 0 or Infinity)
    if (!options.duration || options.duration <= 0) {
      options.duration = 1300;
    }
    return sonnerToast.error(title, options);
  };

  const warning = (title, description) => {
    const options = {
      duration: 1300,
      dismissible: true,
      ...(description && { description }),
    };
    // Ensure duration is a valid number (not 0 or Infinity)
    if (!options.duration || options.duration <= 0) {
      options.duration = 1300;
    }
    return sonnerToast.warning(title, options);
  };

  const info = (title, description) => {
    const options = {
      duration: 1300,
      dismissible: true,
      ...(description && { description }),
    };
    // Ensure duration is a valid number (not 0 or Infinity)
    if (!options.duration || options.duration <= 0) {
      options.duration = 1300;
    }
    return sonnerToast.info(title, options);
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
