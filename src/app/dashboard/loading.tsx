/** Holds the page's shape while the server reads printers and jobs. */
export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-4xl animate-pulse"
    >
      <div className="bg-muted h-9 w-48 rounded-md" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full rounded" />
      <div className="mt-8 space-y-3">
        <div className="bg-muted h-20 rounded-xl" />
        <div className="bg-muted h-20 rounded-xl" />
      </div>
    </div>
  );
}
