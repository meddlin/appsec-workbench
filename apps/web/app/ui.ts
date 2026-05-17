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
  if (
    status === "success" ||
    status === "pass" ||
    status === "resolved" ||
    status === "fixed"
  ) {
    return "success";
  }

  if (status === "failed" || status === "fail" || status === "open") {
    return "danger";
  }

  return "warning";
}

export function dependabotStateClassName(state: string): string {
  if (state === "open") {
    return "danger";
  }

  if (state === "fixed") {
    return "success";
  }

  return "warning";
}

export function codeQlStateClassName(state: string): string {
  if (state === "open") {
    return "danger";
  }

  if (state === "fixed" || state === "closed") {
    return "success";
  }

  return "warning";
}

export function formatDependabotState(state: string): string {
  return state.replaceAll("_", " ");
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
