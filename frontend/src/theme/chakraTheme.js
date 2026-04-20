import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    silver: {
      50: "#f8f9fa",
      100: "#e9ecef",
      200: "#dee2e6",
      300: "#ced4da",
      400: "#adb5bd",
      500: "#6c757d",
      600: "#495057",
      700: "#343a40",
      800: "#212529",
      900: "#1a1d20",
    },
    // Custom status colors with silver aesthetic
    success: {
      50: "#f0f9f4",
      100: "#dcf2e3",
      200: "#bce5c9",
      300: "#8dd4a8",
      400: "#5bbd85",
      500: "#3da06b",
      600: "#2f8054",
      700: "#276545",
      800: "#225139",
      900: "#1e4330",
    },
    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
    },
    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },
    info: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
  },
  components: {
    Toast: {
      baseStyle: {
        container: {
          bg: "white",
          color: "silver.800",
          borderRadius: "xl",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid",
          borderColor: "silver.200",
          backdropFilter: "blur(10px)",
          _dark: {
            bg: "silver.800",
            color: "silver.100",
            borderColor: "silver.700",
          },
        },
        title: {
          fontWeight: "600",
          fontSize: "sm",
          color: "silver.900",
          _dark: {
            color: "silver.50",
          },
        },
        description: {
          fontSize: "sm",
          color: "silver.700",
          _dark: {
            color: "silver.300",
          },
        },
        icon: {
          color: "silver.600",
          _dark: {
            color: "silver.400",
          },
        },
      },
      variants: {
        solid: (props) => ({
          container: {
            bg: `${props.colorScheme}.50`,
            color: `${props.colorScheme}.800`,
            borderColor: `${props.colorScheme}.200`,
            _dark: {
              bg: `${props.colorScheme}.900`,
              color: `${props.colorScheme}.100`,
              borderColor: `${props.colorScheme}.700`,
            },
          },
          title: {
            color: `${props.colorScheme}.900`,
            _dark: {
              color: `${props.colorScheme}.50`,
            },
          },
          description: {
            color: `${props.colorScheme}.700`,
            _dark: {
              color: `${props.colorScheme}.300`,
            },
          },
          icon: {
            color: `${props.colorScheme}.600`,
            _dark: {
              color: `${props.colorScheme}.400`,
            },
          },
        }),
        subtle: (props) => ({
          container: {
            bg: `${props.colorScheme}.50`,
            color: `${props.colorScheme}.800`,
            borderColor: `${props.colorScheme}.200`,
            _dark: {
              bg: `${props.colorScheme}.900`,
              color: `${props.colorScheme}.100`,
              borderColor: `${props.colorScheme}.700`,
            },
          },
        }),
        leftAccent: (props) => ({
          container: {
            borderLeft: "4px solid",
            borderLeftColor: `${props.colorScheme}.500`,
            bg: `${props.colorScheme}.50`,
            color: `${props.colorScheme}.800`,
            _dark: {
              bg: `${props.colorScheme}.900`,
              color: `${props.colorScheme}.100`,
            },
          },
        }),
        topAccent: (props) => ({
          container: {
            borderTop: "4px solid",
            borderTopColor: `${props.colorScheme}.500`,
            bg: `${props.colorScheme}.50`,
            color: `${props.colorScheme}.800`,
            _dark: {
              bg: `${props.colorScheme}.900`,
              color: `${props.colorScheme}.100`,
            },
          },
        }),
      },
      defaultProps: {
        variant: "solid",
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: "xl",
          // Keep modals compact on mobile (iOS) and avoid tall empty space.
          maxH: { base: "80vh", md: "85vh" },
          my: { base: 4, md: 10 },
          mx: { base: 4, md: 0 },
        },
        body: {
          // Let content scroll instead of stretching the dialog.
          overflowY: "auto",
          py: { base: 3, md: 4 },
        },
        header: {
          py: { base: 3, md: 4 },
        },
        footer: {
          py: { base: 3, md: 4 },
        },
      },
      sizes: {
        // Narrower defaults so "md/lg/xl" don't feel huge on iPhone widths.
        md: { dialog: { maxW: { base: "92vw", md: "28rem" } } },
        lg: { dialog: { maxW: { base: "92vw", md: "34rem" } } },
        xl: { dialog: { maxW: { base: "92vw", md: "40rem" } } },
        "2xl": { dialog: { maxW: { base: "92vw", md: "48rem" } } },
        "4xl": { dialog: { maxW: { base: "92vw", md: "56rem" } } },
      },
      defaultProps: {
        isCentered: true,
        scrollBehavior: "inside",
      },
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: "silver.50",
        color: "silver.900",
        _dark: {
          bg: "silver.900",
          color: "silver.100",
        },
        // Dark black theme
        ".dark-black &": {
          bg: "#141414", // Very dark black
          color: "#f5f5f5",
        },
        ".dark-blue &": {
          bg: "#050508",
          color: "#e6f0ff",
        },
      },
    }),
  },
});

export default theme;

