import type { AuditLogEntry, Finding, Workspace } from '@/lib/domain';

export interface FindingPatch {
  status?: Finding['status'];
  reviewer?: string;
  reviewerNotes?: string;
}

export interface AuditFilter {
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface NexoraRepository {
  readonly driver: string;
  loadWorkspace(): Promise<Workspace>;
  saveWorkspace(workspace: Workspace): Promise<void>;
  getFinding(id: string): Promise<Finding | null>;
  updateFinding(id: string, patch: FindingPatch): Promise<Finding | null>;
  appendAuditLog(entry: AuditLogEntry): Promise<void>;
  listAuditLogs(filter?: AuditFilter): Promise<AuditLogEntry[]>;
}
