import { useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import { useViewStore } from "./store/viewStore";

function App(): JSX.Element {
  const toggleViewMode = useViewStore((s) => s.toggleViewMode);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        toggleViewMode();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleViewMode]);

  return <AppShell />;
}

export default App;
