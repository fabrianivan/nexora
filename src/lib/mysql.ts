import 'server-only';
import mysql, { type Pool } from 'mysql2/promise';
import { emptyWorkspace, workspaceSchema, type Workspace } from './domain';

declare global {
  var nexoraMysqlPool: Pool | undefined;
  var nexoraWorkspaceTableReady: Promise<void> | undefined;
}

export function getMysqlPool(): Pool {
  const connectionString = process.env.MYSQL_URL?.trim();
  if (!connectionString) throw new Error('MYSQL_URL is not configured.');
  globalThis.nexoraMysqlPool ??= mysql.createPool(connectionString);
  return globalThis.nexoraMysqlPool;
}

export async function ensureWorkspaceTable(): Promise<void> {
  globalThis.nexoraWorkspaceTableReady ??= getMysqlPool().query(
    `CREATE TABLE IF NOT EXISTS nexora_workspaces (
      workspace_key VARCHAR(64) NOT NULL PRIMARY KEY,
      payload JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ).then(() => undefined).catch((error: unknown) => {
    globalThis.nexoraWorkspaceTableReady = undefined;
    throw error;
  });
  await globalThis.nexoraWorkspaceTableReady;
}

export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
}

export class MysqlWorkspaceRepository implements WorkspaceRepository {
  async load(): Promise<Workspace> {
    await ensureWorkspaceTable();
    const [rows] = await getMysqlPool().query('SELECT payload FROM nexora_workspaces WHERE workspace_key = ?', ['default']);
    const row = (rows as Array<{ payload: unknown }>)[0];
    if (!row) return emptyWorkspace;
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) as unknown : row.payload;
    return workspaceSchema.parse(payload);
  }

  async save(workspace: Workspace): Promise<void> {
    await ensureWorkspaceTable();
    const validWorkspace = workspaceSchema.parse(workspace);
    await getMysqlPool().execute(
      `INSERT INTO nexora_workspaces (workspace_key, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      ['default', JSON.stringify(validWorkspace)],
    );
  }
}

export const workspaceRepository: WorkspaceRepository = new MysqlWorkspaceRepository();
