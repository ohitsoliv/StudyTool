import AppShell from "./components/layout/AppShell";
import SettingsModal from "./components/layout/SettingsModal";
import ShortcutLegendModal from "./components/layout/ShortcutLegendModal";
import SessionModal from "./components/layout/SessionModal";
import { useShortcuts } from "./hooks/useShortcuts";
import { useApplyMasteryCssVars } from "./hooks/useApplyMasteryCssVars";
import { useSessionStore } from './store/sessionStore';

function App(): JSX.Element {
  useShortcuts();
  useApplyMasteryCssVars();
  const sessionModalOpen = useSessionStore((s) => s.modalOpen);

  return (
    <>
      <AppShell />
      <SettingsModal />
      <ShortcutLegendModal />
      {sessionModalOpen && <SessionModal />}
    </>
  );
}

export default App;