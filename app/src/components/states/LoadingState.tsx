export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{label}…</p>
    </div>
  );
}

/** Esqueleto com a mesma proporção dos cards, para a lista não “pular”. */
export function GridSkeleton({ count = 8, widget = false }: { count?: number; widget?: boolean }) {
  return (
    <div className={`grid${widget ? " grid--widgets" : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card">
          <div
            className="skeleton"
            style={{ aspectRatio: widget ? "1 / 1" : "9 / 16", width: "100%" }}
          />
          <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
