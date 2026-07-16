import Link from "next/link";

export default function NotFound() {
  return (
    <div className="route-state">
      <h1>Page not found</h1>
      <p>The requested AppSec Workbench resource does not exist.</p>
      <Link className="action-button" href="/dashboard">
        Return to dashboard
      </Link>
    </div>
  );
}
