/** Holds the card's shape while the server checks the recovery session. */
export default function ResetPasswordLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div
        role="status"
        aria-label="Loading"
        className="w-full max-w-md animate-pulse"
      >
        <div className="bg-muted mx-auto mb-8 h-9 w-32 rounded-md" />
        <div className="bg-muted h-64 rounded-xl" />
      </div>
    </main>
  );
}
