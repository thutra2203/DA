export default function SkeletonTable({ cols = 5, rows = 6 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-row">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton-cell"
              style={{ flex: c === 0 ? '0 0 50px' : c === cols - 1 ? '0 0 120px' : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
