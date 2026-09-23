import { toast as sonnerToast } from "sonner";

/** Instagram/X-style: toast errors and rare cases with no UI change (copy, check-email). Not successes the screen already shows. */
const DEFAULT_DURATION_MS = 2000;
const DEFAULT_POSITION = "bottom-center";

const withDefaults = (description) => ({
  duration: DEFAULT_DURATION_MS,
  dismissible: true,
  position: DEFAULT_POSITION,
  ...(description && { description }),
});

export const useCustomToast = () => {
  const showToast = ({
    title,
    description,
    status = "info",
    duration = DEFAULT_DURATION_MS,
    isClosable = true,
    position = "bottom",
  }) => {
    const sonnerType =
      status === "success"
        ? "success"
        : status === "error"
          ? "error"
          : status === "warning"
            ? "warning"
            : "info";

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
                  : DEFAULT_POSITION;

    const validDuration =
      duration && duration > 0 && duration !== Infinity
        ? duration
        : DEFAULT_DURATION_MS;

    return sonnerToast[sonnerType](title, {
      duration: validDuration,
      dismissible: isClosable,
      position: sonnerPosition,
      ...(description && { description }),
    });
  };

  const success = (title, description) =>
    sonnerToast.success(title, withDefaults(description));

  const error = (title, description) =>
    sonnerToast.error(title, withDefaults(description));

  const warning = (title, description) =>
    sonnerToast.warning(title, withDefaults(description));

  const info = (title, description) =>
    sonnerToast.info(title, withDefaults(description));

  return {
    showToast,
    success,
    error,
    warning,
    info,
    toast: sonnerToast,
  };
};
