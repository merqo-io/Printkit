/** Holds the Designer page's shape while the server reads its data. */
export default function DesignerLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-6xl motion-safe:animate-pulse"
    >
      <div className="bg-muted h-4 w-20 rounded" />
      <div className="bg-muted mt-3 h-9 w-48 rounded-md" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full rounded" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="bg-muted h-96 rounded-xl" />
        <div className="bg-muted h-96 rounded-xl" />
      </div>
    </div>
  );
}
