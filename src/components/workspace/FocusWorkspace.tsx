export default function FocusWorkspace(): JSX.Element {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          width: "100%",
          padding: "40px",
          background: "var(--panel-bg)",
          border: "1px solid var(--panel-border)",
          borderRadius: "12px",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "var(--text)", marginBottom: "12px" }}>Focus Mode</h2>
        <p>Your workspace will render here. Press <kbd style={{ background: "var(--panel-border)", padding: "2px 6px", borderRadius: "4px", color: "var(--text)" }}>Ctrl+E</kbd> to switch back to the canvas.</p>
      </div>
    </div>
  );
}
