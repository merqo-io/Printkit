/** Holds the History page's shape while the server reads its data. */
export default function HistoryLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-4xl motion-safe:animate-pulse"
    >
      <div className="bg-muted h-4 w-20 rounded" />
      <div className="bg-muted mt-3 h-9 w-48 rounded-md" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full rounded" />
      <div className="mt-8 space-y-2">
        <div className="bg-muted h-14 rounded-xl" />
        <div className="bg-muted h-14 rounded-xl" />
        <div className="bg-muted h-14 rounded-xl" />
        <div className="bg-muted h-14 rounded-xl" />
        <div className="bg-muted h-14 rounded-xl" />
      </div>
    </div>
  );
}
