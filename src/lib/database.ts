import 'server-only';
import path from 'path';
import fs from 'fs';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';

// Type definitions for internal storage & entities
export type DbGenericRecord = Record<string, unknown>;

interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close?(): void;
}

type SqliteConstructor = new (filename: string) => SqliteDatabase;

// Check if node:sqlite is available
let DatabaseSyncClass: SqliteConstructor | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqlite = require('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync as SqliteConstructor;
} catch {
  DatabaseSyncClass = null;
}

// Global singletons to prevent multiple instances during Next.js hot reload
declare global {
  var nexoraSqliteDb: SqliteDatabase | undefined;
  var nexoraMysqlPool: Pool | undefined;
  var nexoraDbInitialized: boolean | undefined;
}

function getSqlitePath(): string {
  // Use project sql/ directory if writable, otherwise /tmp/
  const preferredDir = path.join(process.cwd(), 'sql');
  try {
    if (!fs.existsSync(preferredDir)) {
      fs.mkdirSync(preferredDir, { recursive: true });
    }
    const testFile = path.join(preferredDir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return path.join(preferredDir, 'nexora.sqlite');
  } catch {
    return path.join('/tmp', 'nexora.sqlite');
  }
}

export function getDatabaseEngine(): 'mysql' | 'sqlite' | 'memory' {
  if (process.env.MYSQL_URL?.trim()) return 'mysql';
  if (DatabaseSyncClass) return 'sqlite';
  return 'memory';
}

function getSqliteDb(): SqliteDatabase | null {
  if (!globalThis.nexoraSqliteDb && DatabaseSyncClass) {
    const dbPath = getSqlitePath();
    globalThis.nexoraSqliteDb = new DatabaseSyncClass(dbPath);
  }
  return globalThis.nexoraSqliteDb ?? null;
}

function getMysqlPool(): Pool {
  const connectionString = process.env.MYSQL_URL?.trim();
  if (!connectionString) throw new Error('MYSQL_URL is not configured.');
  globalThis.nexoraMysqlPool ??= mysql.createPool(connectionString);
  return globalThis.nexoraMysqlPool;
}

// In-memory fallback if neither SQLite nor MySQL is accessible
const memoryStore: Record<string, Map<string, DbGenericRecord>> = {
  companies: new Map(),
  calculations: new Map(),
  tax_returns: new Map(),
  payments: new Map(),
  calendar_events: new Map(),
  audit_logs: new Map(),
  studies: new Map(),
  app_state: new Map(),
};

function parseJsonRow<T = DbGenericRecord>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return raw as T;
}

export async function initDatabase(forceReset = false): Promise<void> {
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;

    if (forceReset) {
      db.exec(`
        DROP TABLE IF EXISTS nexora_companies;
        DROP TABLE IF EXISTS nexora_calculations;
        DROP TABLE IF EXISTS nexora_tax_returns;
        DROP TABLE IF EXISTS nexora_payments;
        DROP TABLE IF EXISTS nexora_calendar_events;
        DROP TABLE IF EXISTS nexora_audit_logs;
        DROP TABLE IF EXISTS nexora_studies;
        DROP TABLE IF EXISTS nexora_app_state;
      `);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS nexora_companies (
        id TEXT PRIMARY KEY,
        legal_name TEXT NOT NULL,
        country_code TEXT NOT NULL,
        tax_id TEXT NOT NULL,
        data JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS nexora_calculations (
        id TEXT PRIMARY KEY,
        fiscal_year TEXT NOT NULL,
        data JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS nexora_tax_returns (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        data JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS nexora_payments (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        tax_type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        data JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS nexora_calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL,
        data JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS nexora_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        data JSON NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nexora_studies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        data JSON NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nexora_app_state (
        key TEXT PRIMARY KEY,
        value JSON NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    globalThis.nexoraDbInitialized = true;
    return;
  }

  if (engine === 'mysql') {
    const pool = getMysqlPool();
    if (forceReset) {
      await pool.execute('DROP TABLE IF EXISTS nexora_companies');
      await pool.execute('DROP TABLE IF EXISTS nexora_calculations');
      await pool.execute('DROP TABLE IF EXISTS nexora_tax_returns');
      await pool.execute('DROP TABLE IF EXISTS nexora_payments');
      await pool.execute('DROP TABLE IF EXISTS nexora_calendar_events');
      await pool.execute('DROP TABLE IF EXISTS nexora_audit_logs');
      await pool.execute('DROP TABLE IF EXISTS nexora_studies');
      await pool.execute('DROP TABLE IF EXISTS nexora_app_state');
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_companies (
        id VARCHAR(64) PRIMARY KEY,
        legal_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(8) NOT NULL,
        tax_id VARCHAR(64) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_calculations (
        id VARCHAR(64) PRIMARY KEY,
        fiscal_year VARCHAR(16) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_tax_returns (
        id VARCHAR(64) PRIMARY KEY,
        entity_id VARCHAR(64) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_payments (
        id VARCHAR(64) PRIMARY KEY,
        entity_id VARCHAR(64) NOT NULL,
        tax_type VARCHAR(128) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(32) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_calendar_events (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        due_date VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp VARCHAR(64) NOT NULL,
        actor VARCHAR(128) NOT NULL,
        action VARCHAR(64) NOT NULL,
        data JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_studies (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(128) NOT NULL,
        data JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS nexora_app_state (
        \`key\` VARCHAR(64) PRIMARY KEY,
        \`value\` JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    globalThis.nexoraDbInitialized = true;
    return;
  }

  // Memory fallback
  if (forceReset) {
    for (const key of Object.keys(memoryStore)) {
      memoryStore[key].clear();
    }
  }
  globalThis.nexoraDbInitialized = true;
}

// ---------------------------------------------------------------------------
// STATUS CHECK
// ---------------------------------------------------------------------------
export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  engine: 'mysql' | 'sqlite' | 'memory';
  storagePath?: string;
  tables: Record<string, number>;
}> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const tables: Record<string, number> = {};

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) {
      return { connected: false, engine: 'sqlite', tables: {} };
    }
    const tableNames = [
      'nexora_companies',
      'nexora_calculations',
      'nexora_tax_returns',
      'nexora_payments',
      'nexora_calendar_events',
      'nexora_audit_logs',
      'nexora_studies',
      'nexora_app_state',
    ];
    for (const tbl of tableNames) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${tbl}`).get();
        tables[tbl.replace('nexora_', '')] = Number(row?.count ?? 0);
      } catch {
        tables[tbl.replace('nexora_', '')] = 0;
      }
    }
    return {
      connected: true,
      engine: 'sqlite',
      storagePath: getSqlitePath(),
      tables,
    };
  }

  if (engine === 'mysql') {
    const pool = getMysqlPool();
    const tableNames = [
      'nexora_companies',
      'nexora_calculations',
      'nexora_tax_returns',
      'nexora_payments',
      'nexora_calendar_events',
      'nexora_audit_logs',
      'nexora_studies',
      'nexora_app_state',
    ];
    for (const tbl of tableNames) {
      try {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as count FROM ${tbl}`);
        tables[tbl.replace('nexora_', '')] = Number(rows[0]?.count ?? 0);
      } catch {
        tables[tbl.replace('nexora_', '')] = 0;
      }
    }
    return {
      connected: true,
      engine: 'mysql',
      tables,
    };
  }

  // Memory
  for (const [k, v] of Object.entries(memoryStore)) {
    tables[k] = v.size;
  }
  return { connected: true, engine: 'memory', tables };
}

// ---------------------------------------------------------------------------
// COMPANIES CRUD
// ---------------------------------------------------------------------------
export async function dbGetCompanies<T = DbGenericRecord>(): Promise<T[]> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return [];
    const rows = db.prepare('SELECT data FROM nexora_companies ORDER BY id ASC').all();
    return rows.map((r) => parseJsonRow<T>(r.data));
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_companies ORDER BY id ASC');
    return rows.map((r) => parseJsonRow<T>(r.data));
  }
  return Array.from(memoryStore.companies.values()) as T[];
}

export async function dbSaveCompany(company: { id: string; legalName: string; countryCode?: string; taxId: string; [key: string]: unknown }): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const dataJson = JSON.stringify(company);

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO nexora_companies (id, legal_name, country_code, tax_id, data, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        legal_name = excluded.legal_name,
        country_code = excluded.country_code,
        tax_id = excluded.tax_id,
        data = excluded.data,
        updated_at = datetime('now')
    `);
    stmt.run(company.id, company.legalName, company.countryCode || 'ID', company.taxId, dataJson);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_companies (id, legal_name, country_code, tax_id, data)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         legal_name = VALUES(legal_name),
         country_code = VALUES(country_code),
         tax_id = VALUES(tax_id),
         data = VALUES(data),
         updated_at = CURRENT_TIMESTAMP`,
      [company.id, company.legalName, company.countryCode || 'ID', company.taxId, dataJson],
    );
  } else {
    memoryStore.companies.set(company.id, company);
  }
}

export async function dbSaveCompanies(companies: { id: string; legalName: string; countryCode?: string; taxId: string; [key: string]: unknown }[]): Promise<void> {
  for (const c of companies) {
    await dbSaveCompany(c);
  }
}

export async function dbDeleteCompany(id: string): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare('DELETE FROM nexora_companies WHERE id = ?').run(id);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute('DELETE FROM nexora_companies WHERE id = ?', [id]);
  } else {
    memoryStore.companies.delete(id);
  }
}

// ---------------------------------------------------------------------------
// CALCULATION CRUD
// ---------------------------------------------------------------------------
export async function dbGetCalculations<T = DbGenericRecord>(): Promise<T | null> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return null;
    const row = db.prepare('SELECT data FROM nexora_calculations WHERE id = ?').get('default');
    if (!row) return null;
    return parseJsonRow<T>(row.data);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_calculations WHERE id = ?', ['default']);
    const row = rows[0];
    if (!row) return null;
    return parseJsonRow<T>(row.data);
  }
  return (memoryStore.calculations.get('default') as T) ?? null;
}

export async function dbSaveCalculations(data: { fiscalYear?: string; [key: string]: unknown }): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const jsonStr = JSON.stringify(data);

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_calculations (id, fiscal_year, data, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = datetime('now')
    `).run('default', data.fiscalYear || '2026', jsonStr);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_calculations (id, fiscal_year, data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      ['default', data.fiscalYear || '2026', jsonStr],
    );
  } else {
    memoryStore.calculations.set('default', data);
  }
}

// ---------------------------------------------------------------------------
// TAX RETURN CRUD
// ---------------------------------------------------------------------------
export async function dbGetTaxReturn<T = DbGenericRecord>(entityId = 'ENT-ID-001'): Promise<T | null> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return null;
    const row = db.prepare('SELECT data FROM nexora_tax_returns WHERE entity_id = ?').get(entityId);
    if (!row) return null;
    return parseJsonRow<T>(row.data);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_tax_returns WHERE entity_id = ?', [entityId]);
    const row = rows[0];
    if (!row) return null;
    return parseJsonRow<T>(row.data);
  }
  return (memoryStore.tax_returns.get(entityId) as T) ?? null;
}

export async function dbSaveTaxReturn(entityId: string, data: Record<string, unknown>): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const jsonStr = JSON.stringify(data);
  const id = `RETURN_${entityId}_2026`;

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_tax_returns (id, entity_id, data, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = datetime('now')
    `).run(id, entityId, jsonStr);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_tax_returns (id, entity_id, data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [id, entityId, jsonStr],
    );
  } else {
    memoryStore.tax_returns.set(entityId, data);
  }
}

// ---------------------------------------------------------------------------
// PAYMENTS CRUD
// ---------------------------------------------------------------------------
export async function dbGetPayments<T = DbGenericRecord>(): Promise<T[]> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return [];
    const rows = db.prepare('SELECT data FROM nexora_payments ORDER BY id ASC').all();
    return rows.map((r) => parseJsonRow<T>(r.data));
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_payments ORDER BY id ASC');
    return rows.map((r) => parseJsonRow<T>(r.data));
  }
  return Array.from(memoryStore.payments.values()) as T[];
}

export async function dbSavePayment(payment: { id: string; entityId?: string; taxType: string; amount?: number; status: string; [key: string]: unknown }): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const jsonStr = JSON.stringify(payment);

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_payments (id, entity_id, tax_type, amount, status, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        amount = excluded.amount,
        data = excluded.data,
        updated_at = datetime('now')
    `).run(payment.id, payment.entityId || 'ENT-ID-001', payment.taxType, payment.amount || 0, payment.status, jsonStr);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_payments (id, entity_id, tax_type, amount, status, data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), amount = VALUES(amount), data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [payment.id, payment.entityId || 'ENT-ID-001', payment.taxType, payment.amount || 0, payment.status, jsonStr],
    );
  } else {
    memoryStore.payments.set(payment.id, payment);
  }
}

export async function dbSavePayments(payments: { id: string; entityId?: string; taxType: string; amount?: number; status: string; [key: string]: unknown }[]): Promise<void> {
  for (const p of payments) {
    await dbSavePayment(p);
  }
}

// ---------------------------------------------------------------------------
// CALENDAR EVENTS CRUD
// ---------------------------------------------------------------------------
export async function dbGetCalendarEvents<T = DbGenericRecord>(): Promise<T[]> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return [];
    const rows = db.prepare('SELECT data FROM nexora_calendar_events ORDER BY due_date ASC').all();
    return rows.map((r) => parseJsonRow<T>(r.data));
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_calendar_events ORDER BY due_date ASC');
    return rows.map((r) => parseJsonRow<T>(r.data));
  }
  return Array.from(memoryStore.calendar_events.values()) as T[];
}

export async function dbSaveCalendarEvent(event: { id: string; title: string; dueDate: string; status: string; [key: string]: unknown }): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const jsonStr = JSON.stringify(event);

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_calendar_events (id, title, due_date, status, data, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        data = excluded.data,
        updated_at = datetime('now')
    `).run(event.id, event.title, event.dueDate, event.status, jsonStr);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_calendar_events (id, title, due_date, status, data)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [event.id, event.title, event.dueDate, event.status, jsonStr],
    );
  } else {
    memoryStore.calendar_events.set(event.id, event);
  }
}

export async function dbSaveCalendarEvents(events: { id: string; title: string; dueDate: string; status: string; [key: string]: unknown }[]): Promise<void> {
  for (const e of events) {
    await dbSaveCalendarEvent(e);
  }
}

// ---------------------------------------------------------------------------
// AUDIT LOGS CRUD
// ---------------------------------------------------------------------------
export async function dbGetAuditLogs<T = DbGenericRecord>(): Promise<T[]> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return [];
    const rows = db.prepare('SELECT data FROM nexora_audit_logs ORDER BY timestamp DESC').all();
    return rows.map((r) => parseJsonRow<T>(r.data));
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_audit_logs ORDER BY timestamp DESC');
    return rows.map((r) => parseJsonRow<T>(r.data));
  }
  return Array.from(memoryStore.audit_logs.values()) as T[];
}

export async function dbAddAuditLog(log: { id: string; timestamp: string; actor: string; action: string; [key: string]: unknown }): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();
  const jsonStr = JSON.stringify(log);

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_audit_logs (id, timestamp, actor, action, data)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data
    `).run(log.id, log.timestamp, log.actor, log.action, jsonStr);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO nexora_audit_logs (id, timestamp, actor, action, data)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [log.id, log.timestamp, log.actor, log.action, jsonStr],
    );
  } else {
    memoryStore.audit_logs.set(log.id, log);
  }
}

export async function dbSaveAuditLogs(logs: { id: string; timestamp: string; actor: string; action: string; [key: string]: unknown }[]): Promise<void> {
  for (const l of logs) {
    await dbAddAuditLog(l);
  }
}

// ---------------------------------------------------------------------------
// STUDIES CRUD
// ---------------------------------------------------------------------------
export async function dbGetStudies<T = DbGenericRecord>(): Promise<T[]> {
  await initDatabase();
  const engine = getDatabaseEngine();

  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return [];
    const rows = db.prepare('SELECT data FROM nexora_studies ORDER BY id ASC').all();
    return rows.map((r) => parseJsonRow<T>(r.data));
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM nexora_studies ORDER BY id ASC');
    return rows.map((r) => parseJsonRow<T>(r.data));
  }
  return Array.from(memoryStore.studies.values()) as T[];
}

export async function dbSaveStudies(studies: { id: string; title: string; category?: string; [key: string]: unknown }[]): Promise<void> {
  await initDatabase();
  const engine = getDatabaseEngine();

  for (const s of studies) {
    const jsonStr = JSON.stringify(s);
    if (engine === 'sqlite') {
      const db = getSqliteDb();
      if (!db) continue;
      db.prepare(`
        INSERT INTO nexora_studies (id, title, category, data)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data
      `).run(s.id, s.title, s.category || 'General', jsonStr);
    } else if (engine === 'mysql') {
      const pool = getMysqlPool();
      await pool.execute(
        `INSERT INTO nexora_studies (id, title, category, data)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [s.id, s.title, s.category || 'General', jsonStr],
      );
    } else {
      memoryStore.studies.set(s.id, s);
    }
  }
}

// ---------------------------------------------------------------------------
// APP STATE (key/value JSON — compliance workspace, preferences)
// ---------------------------------------------------------------------------
const APP_STATE_KEYS = new Set(['compliance', 'ledger', 'seedVersion']);
const CLIENT_WRITABLE_KEYS = new Set(['compliance', 'ledger']);

/** Keys the browser may write through /api/db/sync. */
export function isAllowedAppStateKey(key: string): boolean {
  return CLIENT_WRITABLE_KEYS.has(key);
}

export async function dbGetAppState<T = unknown>(key: string): Promise<T | null> {
  await initDatabase();
  const engine = getDatabaseEngine();
  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return null;
    const row = db.prepare('SELECT value FROM nexora_app_state WHERE key = ?').get(key);
    return row ? parseJsonRow<T>(row.value) : null;
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT `value` FROM nexora_app_state WHERE `key` = ?', [key]);
    return rows[0] ? parseJsonRow<T>(rows[0].value) : null;
  }
  return (memoryStore.app_state.get(key)?.value as T) ?? null;
}

export async function dbSetAppState(key: string, value: unknown): Promise<void> {
  if (!APP_STATE_KEYS.has(key)) throw new Error(`Unknown app state key: ${key}`);
  await initDatabase();
  const engine = getDatabaseEngine();
  const json = JSON.stringify(value);
  if (json.length > 2_000_000) throw new Error('App state too large');
  if (engine === 'sqlite') {
    const db = getSqliteDb();
    if (!db) return;
    db.prepare(`
      INSERT INTO nexora_app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, json);
  } else if (engine === 'mysql') {
    const pool = getMysqlPool();
    await pool.execute('INSERT INTO nexora_app_state (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, json]);
  } else {
    memoryStore.app_state.set(key, { value });
  }
}

// ---------------------------------------------------------------------------
// GET ALL UNIFIED DATA FOR PAGE HYDRATION
// ---------------------------------------------------------------------------
export async function dbGetAllUnifiedData(): Promise<{
  companies: DbGenericRecord[];
  calculations: DbGenericRecord | null;
  taxReturns: DbGenericRecord | null;
  payments: DbGenericRecord[];
  calendarEvents: DbGenericRecord[];
  auditLogs: DbGenericRecord[];
  studies: DbGenericRecord[];
  appState: { compliance: unknown; ledger: unknown };
  databaseStatus: {
    connected: boolean;
    engine: 'mysql' | 'sqlite' | 'memory';
    tables: Record<string, number>;
  };
}> {
  await initDatabase();
  const [companies, calculations, taxReturns, payments, calendarEvents, auditLogs, studies, compliance, ledger, status] = await Promise.all([
    dbGetCompanies(),
    dbGetCalculations(),
    dbGetTaxReturn('ENT-ID-001'),
    dbGetPayments(),
    dbGetCalendarEvents(),
    dbGetAuditLogs(),
    dbGetStudies(),
    dbGetAppState('compliance'),
    dbGetAppState('ledger'),
    getDatabaseStatus(),
  ]);

  return {
    companies,
    calculations,
    taxReturns,
    payments,
    calendarEvents,
    auditLogs,
    studies,
    appState: { compliance, ledger },
    databaseStatus: {
      connected: status.connected,
      engine: status.engine,
      tables: status.tables,
    },
  };
}
