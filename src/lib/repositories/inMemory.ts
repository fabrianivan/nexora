import {
  auditLogEntrySchema,
  emptyWorkspace,
  findingSchema,
  workspaceSchema,
  type AuditLogEntry,
  type Finding,
  type Workspace,
} from '@/lib/domain';
import type { AuditFilter, FindingPatch, NexoraRepository } from './types';

declare global {
  var nexoraV2Workspace: Workspace | undefined;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryRepository implements NexoraRepository {
  readonly driver = 'memory';

  async loadWorkspace(): Promise<Workspace> {
    return clone(globalThis.nexoraV2Workspace ?? emptyWorkspace);
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    globalThis.nexoraV2Workspace = workspaceSchema.parse(clone(workspace));
  }

  async getFinding(id: string): Promise<Finding | null> {
    const workspace = await this.loadWorkspace();
    return workspace.findings?.find((finding) => finding.id === id) ?? null;
  }

  async updateFinding(id: string, patch: FindingPatch): Promise<Finding | null> {
    const workspace = await this.loadWorkspace();
    const findings = workspace.findings ?? [];
    const index = findings.findIndex((finding) => finding.id === id);
    if (index < 0) return null;

    const current = findings[index];
    const next = findingSchema.parse({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      version: (current.version ?? 1) + 1,
    });
    findings[index] = next;
    workspace.findings = findings;
    await this.saveWorkspace(workspace);
    return next;
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    const workspace = await this.loadWorkspace();
    const logs = workspace.auditLogs ?? [];
    logs.push(auditLogEntrySchema.parse(entry));
    workspace.auditLogs = logs;
    await this.saveWorkspace(workspace);
  }

  async listAuditLogs(filter: AuditFilter = {}): Promise<AuditLogEntry[]> {
    const workspace = await this.loadWorkspace();
    const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
    return (workspace.auditLogs ?? [])
      .filter((entry) => !filter.actor || entry.actor === filter.actor)
      .filter((entry) => !filter.action || entry.action === filter.action)
      .filter((entry) => !filter.targetType || entry.targetType === filter.targetType)
      .filter((entry) => !filter.from || entry.timestamp >= filter.from)
      .filter((entry) => !filter.to || entry.timestamp <= filter.to)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, limit);
  }
}
