import 'server-only';
import {
  SEED_COMPANIES,
  SEED_CALCULATIONS,
  SEED_TAX_RETURN,
  SEED_PAYMENTS,
  SEED_CALENDAR_EVENTS,
  SEED_AUDIT_LOGS,
  SEED_STUDIES,
  SEED_VERSION,
} from '@/data/seed';
import { 
  dbGetCompanies, 
  dbSaveCompanies, 
  dbSaveCalculations, 
  dbSaveTaxReturn, 
  dbSavePayments, 
  dbSaveCalendarEvents, 
  dbSaveAuditLogs, 
  dbSaveStudies,
  dbGetAppState,
  dbSetAppState,
  initDatabase
} from './database';

// Row helpers accept loose records; spread through Record<string, unknown> for the index signature.
const plain = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r }) as T & Record<string, unknown>);

async function seedAll(): Promise<void> {
  await dbSaveCompanies(plain(SEED_COMPANIES));
  await dbSaveCalculations({ ...SEED_CALCULATIONS });
  await dbSaveTaxReturn('ENT-ID-001', { ...SEED_TAX_RETURN });
  await dbSavePayments(plain(SEED_PAYMENTS));
  await dbSaveCalendarEvents(plain(SEED_CALENDAR_EVENTS));
  await dbSaveAuditLogs(plain(SEED_AUDIT_LOGS));
  await dbSaveStudies(plain(SEED_STUDIES));
  await dbSetAppState('seedVersion', SEED_VERSION);
}

/**
 * Seeds an empty database, and re-seeds a database created by an older sample
 * dataset (SEED_VERSION) so every module has consistent demo data.
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  await initDatabase();
  const existingCompanies = await dbGetCompanies();
  const version = Number((await dbGetAppState<number>('seedVersion')) ?? 0);
  if (!existingCompanies || existingCompanies.length === 0) {
    await seedAll();
  } else if (version < SEED_VERSION) {
    await initDatabase(true);
    await seedAll();
  }
}
