// Design philosophy: Salon Noir — the app shell is quiet, asymmetric, and built around a premium operational workspace.

import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <Toaster />
        <Home />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
