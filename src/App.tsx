import AppShell from "./components/layout/AppShell";
import SettingsModal from "./components/layout/SettingsModal";
import ShortcutLegendModal from "./components/layout/ShortcutLegendModal";
import { useShortcuts } from "./hooks/useShortcuts";
import { useApplyMasteryCssVars } from "./hooks/useApplyMasteryCssVars";

function App(): JSX.Element {
  useShortcuts();
  useApplyMasteryCssVars();

  return (
    <>
      <AppShell />
      <SettingsModal />
      <ShortcutLegendModal />
    </>
  );
}

export default App;