export default function Loading() {
  return (
    <div className="route-state" aria-live="polite" role="status">
      <h1>Loading AppSec data</h1>
      <p>Reading the latest records from the local database.</p>
    </div>
  );
}
