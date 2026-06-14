export function CollapseToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      className="collapse-btn"
      onClick={onToggle}
      aria-label={open ? 'Collapse panel' : 'Expand panel'}
      title={open ? 'Collapse' : 'Expand'}
    >
      {open ? '–' : '+'}
    </button>
  );
}
