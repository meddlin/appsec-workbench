function getErrorValue(error: unknown, key: "code" | "message" | "name"): string {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const code = getErrorValue(error, "code");
  const message = getErrorValue(error, "message");
  const name = getErrorValue(error, "name");

  return (
    code === "P1001" ||
    name === "PrismaClientInitializationError" ||
    message.includes("DATABASE_URL is required") ||
    message.includes("Can't reach database server") ||
    message.includes("Can't reach database at")
  );
}

export function DatabaseUnavailable() {
  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Database unavailable</h1>
        <p>The local Postgres database is not reachable.</p>
      </div>

      <div className="empty">
        Make sure <code>DATABASE_URL</code> is set in the repo root{" "}
        <code>.env</code>, start Postgres with{" "}
        <code>docker compose up -d postgres</code>, then run{" "}
        <code>pnpm db:migrate</code> before refreshing this page.
      </div>
    </div>
  );
}
