"use client";

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="route-state" role="alert">
      <h1>Something went wrong</h1>
      <p>The requested data could not be displayed.</p>
      <button className="action-button" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
