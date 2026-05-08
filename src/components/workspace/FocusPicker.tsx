import { useUserPrefsStore } from '../../store/userPrefsStore';
import { useGraphStore } from '../../store/graphStore';
import { useDrillStore } from '../../store/drillStore';
import { useSessionStore } from '../../store/sessionStore';
import {
  canCloze,
  canDebuggerNode,
  canDebuggerSystem,
  canPathFinder,
  canMissingLink,
  canClusterTitle,
  canSorter,
  canScenarioBuilder,
  type Eligibility,
} from '../../utils/drillEligibility';

interface DrillEntry {
  id: string;
  label: string;
  eligibility: Eligibility;
  start: () => void;
  hint?: string;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  borderRadius: 8,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
const cardHeader: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  color: 'var(--text-muted)',
  marginBottom: 4,
};
const lensTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 4,
};
const drillButton = (eligible: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  background: eligible ? '#1e1e2e' : 'transparent',
  border: `1px solid ${eligible ? 'var(--panel-border)' : 'rgba(42,42,47,0.5)'}`,
  borderRadius: 6,
  padding: '8px 12px',
  color: eligible ? 'var(--text)' : 'var(--text-muted)',
  cursor: eligible ? 'pointer' : 'not-allowed',
  textAlign: 'left',
  opacity: eligible ? 1 : 0.55,
  fontSize: 13,
});
const drillLabel: React.CSSProperties = { fontWeight: 500 };
const drillHint: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' };
const drillReason: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' };

export default function FocusPicker() {
  const lensNameMemorizer = useUserPrefsStore((s) => s.lensNameMemorizer);
  const lensNameArchitect = useUserPrefsStore((s) => s.lensNameArchitect);
  const lensNamePractitioner = useUserPrefsStore((s) => s.lensNamePractitioner);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  const startCloze = useDrillStore((s) => s.startCloze);
  const startPathFinder = useDrillStore((s) => s.startPathFinder);
  const startMissingLink = useDrillStore((s) => s.startMissingLink);
  const startClusterTitle = useDrillStore((s) => s.startClusterTitle);
  const startSorter = useDrillStore((s) => s.startSorter);
  const startScenarioBuilder = useDrillStore((s) => s.startScenarioBuilder);
  const startDebugger = useDrillStore((s) => s.startDebugger);
  const openSessionModal = useSessionStore((s) => s.openModal);

  const memorizer: DrillEntry[] = [];
  if (selectedNode) {
    memorizer.push({
      id: 'cloze-selected',
      label: 'Cloze',
      hint: 'for selected node',
      eligibility: canCloze(selectedNode),
      start: () => startCloze(selectedNode),
    });
  } else {
    memorizer.push({
      id: 'cloze-no-selection',
      label: 'Cloze',
      eligibility: { eligible: false, reason: 'Select a node first' },
      start: () => {},
    });
  }
  memorizer.push({
    id: 'path-finder',
    label: 'Path Finder',
    eligibility: canPathFinder(nodes, edges),
    start: () => startPathFinder(),
  });

  const architect: DrillEntry[] = [
    {
      id: 'missing-link',
      label: 'Missing Link',
      eligibility: canMissingLink(nodes),
      start: () => startMissingLink(nodes, edges),
    },
    {
      id: 'cluster-title',
      label: 'Cluster Title',
      eligibility: canClusterTitle(edges),
      start: () => startClusterTitle(nodes, edges),
    },
    {
      id: 'sorter',
      label: 'Sorter',
      eligibility: canSorter(edges),
      start: () => startSorter(nodes, edges),
    },
  ];

  const practitioner: DrillEntry[] = [
    {
      id: 'scenario-builder',
      label: 'Scenario Builder',
      eligibility: canScenarioBuilder(nodes),
      start: () => startScenarioBuilder(),
    },
  ];
  if (selectedNode) {
    practitioner.push({
      id: 'debugger-selected',
      label: 'Debugger',
      hint: 'for selected node',
      eligibility: canDebuggerNode(selectedNode),
      start: () => startDebugger({ nodeId: selectedNode.id }),
    });
  } else {
    practitioner.push({
      id: 'debugger-system',
      label: 'Debugger',
      hint: 'random eligible layer',
      eligibility: canDebuggerSystem(nodes),
      start: () => startDebugger(),
    });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '40px 24px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 880, width: '100%' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
          Pick a drill
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          {selectedNode
            ? `Drills for ${selectedNode.title || 'selected node'} surface first.`
            : 'Select a node first if you want a node-targeted drill.'}
        </p>

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={openSessionModal}
            style={{
              width: '100%',
              background: 'var(--panel-bg)',
              color: 'var(--text)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Start a session
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <LensCard title={lensNameMemorizer} drills={memorizer} />
          <LensCard title={lensNameArchitect} drills={architect} />
          <LensCard title={lensNamePractitioner} drills={practitioner} />
        </div>
      </div>
    </div>
  );
}

function LensCard({ title, drills }: { title: string; drills: DrillEntry[] }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeader}>Lens</div>
      <div style={lensTitle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {drills.map((d) => (
          <button
            key={d.id}
            disabled={!d.eligibility.eligible}
            onClick={d.eligibility.eligible ? d.start : undefined}
            title={d.eligibility.reason ?? ''}
            style={drillButton(d.eligibility.eligible)}
          >
            <span style={drillLabel}>{d.label}</span>
            {d.eligibility.eligible
              ? d.hint && <span style={drillHint}>{d.hint}</span>
              : <span style={drillReason}>{d.eligibility.reason}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
