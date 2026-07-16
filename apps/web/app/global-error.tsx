"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="global-error" role="alert">
          <h1>AppSec Workbench could not start</h1>
          <p>Reload the application or try again.</p>
          <button className="action-button" onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
