export type ModuleRunStatus = "running" | "success" | "failed";

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
}

export interface ModuleContext {
  logger: Logger;
  organizationId?: string;
  repositoryId?: string;
  runId?: string;
}

export interface IngestResult {
  status: ModuleRunStatus;
  message?: string;
  recordsProcessed?: number;
}

export type ControlEvaluationStatus = "pass" | "fail" | "unknown";

export interface ControlEvaluationResult {
  controlId: string;
  status: ControlEvaluationStatus;
  message?: string;
  evidence?: Record<string, unknown>;
}

export interface AppSecModule {
  id: string;
  name: string;
  description: string;
  ingest?: (ctx: ModuleContext) => Promise<IngestResult> | IngestResult;
  evaluate?: (ctx: ModuleContext) =>
    | Promise<ControlEvaluationResult[]>
    | ControlEvaluationResult[];
}
