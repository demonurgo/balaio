import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/caveat-brush/400.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installViewportGuards } from "./installViewportGuards";
import { primeHaptics } from "./lib/haptics";
import { registerServiceWorker } from "./registerServiceWorker";

const queryClient = new QueryClient();

installViewportGuards();
primeHaptics();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
