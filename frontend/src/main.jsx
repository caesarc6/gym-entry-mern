import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import theme from "./theme.js";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { Toaster } from "./components/ui/sonner";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <ChakraProvider theme={theme}>
          <App />
          <Toaster />
        </ChakraProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
