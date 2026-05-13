export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ paddingTop: "var(--space-6)" }}>
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}
