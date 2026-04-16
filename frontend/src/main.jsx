import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import theme from "./theme.js";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { Toaster } from "./components/ui/sonner";
// Expose auth helpers to window for console debugging
import "./utils/getMyUID.js";

const isCapacitorNative =
  typeof window !== "undefined" &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

if (isCapacitorNative) {
  Promise.all([import("@capacitor/app"), import("@capacitor/browser")])
    .then(([{ App }, { Browser }]) => {
      App.addListener("appUrlOpen", async ({ url }) => {
        try {
          const incoming = new URL(url);
          // For custom schemes like com.etherealgains.gymentry://auth/callback,
          // URL parsing yields host="auth" and pathname="/callback". Reconstruct
          // the intended SPA path as "/auth/callback".
          const reconstructedPath = `/${incoming.host}${incoming.pathname}`;
          const nextPath = `${reconstructedPath}${incoming.search}${incoming.hash}`;
          // Close the in-app browser if it is still open.
          try {
            await Browser.close();
          } catch {
            // no-op
          }
          // Navigate inside the SPA to the callback route.
          window.location.assign(nextPath);
        } catch {
          // Ignore malformed URLs.
        }
      });
    })
    .catch(() => {
      // If plugins aren't available, skip deep-link wiring.
    });
}

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
