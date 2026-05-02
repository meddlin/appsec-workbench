export function formatDateTime(value: Date | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatBoolean(value: boolean | null | undefined): string {
  if (value === undefined || value === null) {
    return "-";
  }

  return value ? "Yes" : "No";
}

export function statusClassName(status: string): string {
  if (status === "success" || status === "pass" || status === "resolved") {
    return "success";
  }

  if (status === "failed" || status === "fail" || status === "open") {
    return "danger";
  }

  return "warning";
}

export function severityClassName(severity: string): string {
  if (severity === "critical" || severity === "high") {
    return "danger";
  }

  if (severity === "medium") {
    return "warning";
  }

  return "success";
}
