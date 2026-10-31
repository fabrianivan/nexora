'use client';

/**
 * WorkspaceProvider — single source of truth for the whole app.
 * Hydrates from /api/db/bootstrap (SQLite / MySQL / memory), falls back to the
 * pure sample dataset, and writes every mutation back through /api/db/sync.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CorporateEntity } from '@/data/entities';
import { PERSONAS, type UserPersona } from '@/data/personas';
import {
  SEED_AUDIT_LOGS,
  SEED_CALCULATIONS,
  SEED_CALENDAR_EVENTS,
  SEED_COMPANIES,
  SEED_PAYMENTS,
  SEED_STUDIES,
  SEED_TAX_RETURN,
} from '@/data/seed';
import {
  createInitialComplianceState,
  normalizeComplianceState,
  runRiskEngine,
  type Actor,
  type ComplianceState,
  type FindingReview,
  type RiskFinding,
} from '@/lib/compliance';
import { nowWib } from '@/lib/format';
import { MULTI_COUNTRY_DATA, type CountryCode } from '@/data/multiCountryTaxData';
import { DEFAULT_CREDITS } from '@/lib/cit';
import type {
  AuditLogRecord,
  CalculationState,
  CalendarEvent,
  DbEngine,
  LedgerState,
  PaymentLiability,
  StudyItem,
  TaxReturnState,
} from './types';

export interface Workspace {
  hydrated: boolean;
  dbEngine: DbEngine;
  lastSyncedAt: string | null;

  entities: CorporateEntity[];
  activeEntity: CorporateEntity;
  activeEntityId: string;
  country: CountryCode;
  selectEntity: (id: string) => boolean;
  saveEntity: (entity: CorporateEntity) => void;
  deleteEntity: (id: string) => void;

  persona: UserPersona;
  personas: UserPersona[];
  setPersonaId: (id: string) => void;
  actor: Actor;
  isParentExec: boolean;
  canAccess: (entityId: string) => boolean;
  accessibleEntities: CorporateEntity[];
  entityById: (id: string) => CorporateEntity | undefined;

  /** Fiscal reconciliation per entity. */
  calculationFor: (entityId: string) => CalculationState;
  setCalculation: (entityId: string, next: CalculationState) => void;
  /** Annual return workflow per entity. */
  returnFor: (entityId: string) => TaxReturnState;
  setReturn: (entityId: string, next: TaxReturnState) => void;
  payments: PaymentLiability[];
  setPayments: (next: PaymentLiability[]) => void;
  calendar: CalendarEvent[];
  setCalendar: (next: CalendarEvent[]) => void;
  studies: StudyItem[];
  auditLogs: AuditLogRecord[];
  logAudit: (action: string, target: string, details: string) => void;

  compliance: ComplianceState;
  updateCompliance: (fn: (s: ComplianceState) => ComplianceState) => void;
  findings: RiskFinding[];
  zScoreReady: boolean;
  reviewOf: (findingId: string) => FindingReview;

  resetSampleData: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<Workspace | null>(null);

const PERSONA_KEY = 'nexora.persona';
/** Writes flushed while a page unloads; the next page may read the server before they land. */
const HANDOFF_KEY = 'nexora.pending-writes';
type AppStateKey = 'compliance' | 'ledger';
type PendingWrites = Partial<Record<AppStateKey, unknown>>;

function takeHandoff(): PendingWrites {
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    window.sessionStorage.removeItem(HANDOFF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { at?: number; writes?: PendingWrites };
    return parsed.writes && typeof parsed.at === 'number' && Date.now() - parsed.at < 60_000 ? parsed.writes : {};
  } catch {
    return {};
  }
}

function readPersona(): string {
  try {
    return window.localStorage.getItem(PERSONA_KEY) || 'ceo_parent';
  } catch {
    return 'ceo_parent';
  }
}

function normalizeStudies(items: unknown[]): StudyItem[] {
  return items
    .filter((s): s is Partial<StudyItem> & { id: string; title: string } => Boolean(s && typeof s === 'object' && 'id' in s && 'title' in s))
    .map((s) => ({
      category: 'P3B / Tax Treaty',
      summary: '',
      source: '',
      simulationType: 'none',
      ...s,
      tags: Array.isArray(s.tags) ? s.tags : [],
      applicableJurisdictions: Array.isArray(s.applicableJurisdictions) ? s.applicableJurisdictions : [],
    })) as StudyItem[];
}

const PARENT_ID = 'ENT-ID-001';

function defaultCalculation(country: CountryCode): CalculationState {
  if (country === 'ID') return SEED_CALCULATIONS;
  return { fiscalYear: '2026', items: MULTI_COUNTRY_DATA[country].fiscalReconciliation, apply31EFacility: true, credits: DEFAULT_CREDITS[country] };
}

function defaultReturn(entityId: string): TaxReturnState {
  return entityId === PARENT_ID ? SEED_TAX_RETURN : { returnStatus: 'Draft', approver: null, history: [] };
}

function normalizeLedger(raw: unknown, legacyCalc?: CalculationState | null, legacyReturn?: TaxReturnState | null): LedgerState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<LedgerState>;
  const calculations = { ...(r.calculations ?? {}) };
  const returns = { ...(r.returns ?? {}) };
  if (!calculations[PARENT_ID] && legacyCalc && Array.isArray(legacyCalc.items)) calculations[PARENT_ID] = { ...legacyCalc, credits: legacyCalc.credits ?? DEFAULT_CREDITS.ID };
  if (!returns[PARENT_ID] && legacyReturn && typeof legacyReturn === 'object' && 'returnStatus' in legacyReturn) {
    returns[PARENT_ID] = { ...SEED_TAX_RETURN, returnStatus: legacyReturn.returnStatus, approver: legacyReturn.approver ?? null };
  }
  return { calculations, returns };
}

interface BootstrapPayload {
  companies?: CorporateEntity[];
  calculations?: CalculationState | null;
  taxReturns?: TaxReturnState | null;
  payments?: PaymentLiability[];
  calendarEvents?: CalendarEvent[];
  auditLogs?: AuditLogRecord[];
  studies?: StudyItem[];
  appState?: { compliance?: unknown; ledger?: unknown };
  databaseStatus?: { engine?: DbEngine };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [dbEngine, setDbEngine] = useState<DbEngine>('sqlite');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [entities, setEntities] = useState<CorporateEntity[]>(SEED_COMPANIES);
  const [activeEntityId, setActiveEntityId] = useState('ENT-ID-001');
  const [personaId, setPersonaIdState] = useState('ceo_parent');
  const [ledger, setLedger] = useState<LedgerState>({ calculations: {}, returns: {} });
  const [payments, setPaymentsState] = useState<PaymentLiability[]>(SEED_PAYMENTS);
  const [calendar, setCalendarState] = useState<CalendarEvent[]>(SEED_CALENDAR_EVENTS);
  const [studies, setStudies] = useState<StudyItem[]>(SEED_STUDIES);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(SEED_AUDIT_LOGS);
  const [compliance, setCompliance] = useState<ComplianceState>(() => createInitialComplianceState());

  // ── persistence ────────────────────────────────────────────────────────
  const sync = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const body = JSON.stringify(payload);
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        // Survive navigation for small writes (browser keepalive limit is 64 KB).
        keepalive: body.length < 60_000,
      });
      if (res.ok) setLastSyncedAt(new Date().toISOString());
    } catch {
      /* offline — state stays in memory */
    }
  }, []);

  // Debounced writes keep typing snappy; anything pending is flushed when the page hides.
  const pending = useRef<PendingWrites>({});
  const timers = useRef<Record<string, number>>({});
  const persistKey = useCallback(
    (key: AppStateKey, value: unknown) => {
      pending.current[key] = value;
      if (timers.current[key]) window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(() => {
        delete pending.current[key];
        void sync({ appState: { key, value } });
      }, 250);
    },
    [sync],
  );
  useEffect(() => {
    const flush = () => {
      const writes = pending.current;
      if (!Object.keys(writes).length) return;
      // keepalive delivers the write, but not necessarily before the next page bootstraps —
      // hand it over through sessionStorage so a reload never shows stale data.
      try {
        window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ at: Date.now(), writes }));
      } catch {
        /* storage unavailable — keepalive alone */
      }
      for (const [key, value] of Object.entries(writes)) {
        window.clearTimeout(timers.current[key]);
        void sync({ appState: { key, value } });
      }
      pending.current = {};
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [sync]);

  const applyBootstrap = useCallback((data: BootstrapPayload) => {
    if (Array.isArray(data.companies) && data.companies.length) setEntities(data.companies);
    setLedger(normalizeLedger(data.appState?.ledger, data.calculations, data.taxReturns));
    if (Array.isArray(data.payments) && data.payments.length) setPaymentsState(data.payments.map((p) => ({ ...p, entityId: p.entityId || 'ENT-ID-001' })));
    if (Array.isArray(data.calendarEvents) && data.calendarEvents.length) setCalendarState(data.calendarEvents.map((e) => ({ ...e, entityId: e.entityId || 'ENT-ID-001' })));
    if (Array.isArray(data.auditLogs) && data.auditLogs.length) setAuditLogs(data.auditLogs);
    if (Array.isArray(data.studies) && data.studies.length) setStudies(normalizeStudies(data.studies));
    setCompliance(normalizeComplianceState(data.appState?.compliance));
    if (data.databaseStatus?.engine) setDbEngine(data.databaseStatus.engine);
    setLastSyncedAt(new Date().toISOString());
  }, []);

  // Writes the previous page flushed on unload. They win over bootstrap reads until the
  // server has acknowledged them (StrictMode may bootstrap twice in development).
  const handoff = useRef<PendingWrites | null>(null);
  const refresh = useCallback(async () => {
    if (handoff.current === null) {
      const taken = takeHandoff();
      handoff.current = taken;
      const entries = Object.entries(taken);
      if (entries.length) {
        void Promise.all(entries.map(([key, value]) => sync({ appState: { key, value } }))).then(() => {
          handoff.current = {};
        });
      }
    }
    const overlay = handoff.current;
    try {
      const res = await fetch('/api/db/bootstrap', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as BootstrapPayload;
        if (Object.keys(overlay).length) data.appState = { ...data.appState, ...overlay };
        applyBootstrap(data);
      }
    } catch {
      /* keep sample data */
    } finally {
      setHydrated(true);
    }
  }, [applyBootstrap, sync]);

  useEffect(() => {
    setPersonaIdState(readPersona());
    void refresh();
  }, [refresh]);

  // ── RBAC ───────────────────────────────────────────────────────────────
  const persona = useMemo(() => PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0], [personaId]);
  const isParentExec = persona.canViewAll && persona.entityRole === 'PARENT';
  const canAccess = useCallback(
    (entityId: string) => isParentExec || persona.accessibleEntityIds.includes(entityId),
    [isParentExec, persona],
  );
  const accessibleEntities = useMemo(() => entities.filter((e) => canAccess(e.id)), [entities, canAccess]);
  const actor: Actor = useMemo(
    () => ({ id: persona.id, name: persona.name, role: persona.badge.replace(/^[^\p{L}]+/u, '').trim() || persona.title, isParentExecutive: isParentExec }),
    [persona, isParentExec],
  );

  const setPersonaId = useCallback(
    (id: string) => {
      setPersonaIdState(id);
      try {
        window.localStorage.setItem(PERSONA_KEY, id);
      } catch {
        /* ignore */
      }
      const next = PERSONAS.find((p) => p.id === id);
      if (next && !(next.canViewAll && next.entityRole === 'PARENT') && next.accessibleEntityIds[0]) {
        setActiveEntityId((cur) => (next.accessibleEntityIds.includes(cur) ? cur : next.accessibleEntityIds[0]));
      }
    },
    [],
  );

  // Keep the active entity inside the persona's scope.
  useEffect(() => {
    if (!canAccess(activeEntityId) && accessibleEntities[0]) setActiveEntityId(accessibleEntities[0].id);
  }, [activeEntityId, canAccess, accessibleEntities]);

  const activeEntity = useMemo(() => entities.find((e) => e.id === activeEntityId) ?? entities[0], [entities, activeEntityId]);

  // ── audit ──────────────────────────────────────────────────────────────
  const logAudit = useCallback(
    (action: string, target: string, details: string) => {
      const record: AuditLogRecord = {
        id: `LOG-${Date.now().toString(36).toUpperCase()}`,
        timestamp: nowWib(),
        actor: persona.name,
        role: actor.role,
        action,
        target,
        details,
      };
      setAuditLogs((prev) => [record, ...prev]);
      void sync({ auditLog: record });
    },
    [persona.name, actor.role, sync],
  );

  // ── entity mutations ───────────────────────────────────────────────────
  const selectEntity = useCallback(
    (id: string) => {
      if (!canAccess(id)) return false;
      setActiveEntityId(id);
      return true;
    },
    [canAccess],
  );

  const saveEntity = useCallback(
    (entity: CorporateEntity) => {
      setEntities((prev) => {
        const exists = prev.some((e) => e.id === entity.id);
        return exists ? prev.map((e) => (e.id === entity.id ? entity : e)) : [...prev, entity];
      });
      void sync({ company: entity });
    },
    [sync],
  );

  const deleteEntity = useCallback(
    (id: string) => {
      setEntities((prev) => prev.filter((e) => e.id !== id));
      void sync({ deleteCompanyId: id });
    },
    [sync],
  );

  // ── module state setters (persisted) ───────────────────────────────────
  const persistLedger = useCallback((next: LedgerState) => persistKey('ledger', next), [persistKey]);

  const calculationFor = useCallback(
    (entityId: string) => ledger.calculations[entityId] ?? defaultCalculation((entities.find((e) => e.id === entityId)?.countryCode ?? 'ID') as CountryCode),
    [ledger.calculations, entities],
  );
  const returnFor = useCallback((entityId: string) => ledger.returns[entityId] ?? defaultReturn(entityId), [ledger.returns]);

  const setCalculation = useCallback(
    (entityId: string, next: CalculationState) => {
      setLedger((prev) => {
        const l = { ...prev, calculations: { ...prev.calculations, [entityId]: next } };
        persistLedger(l);
        return l;
      });
      // Keep the legacy calculations table in sync for the parent entity.
      if (entityId === PARENT_ID) void sync({ calculations: { fiscalYear: '2026', ...next } });
    },
    [persistLedger, sync],
  );

  const setReturn = useCallback(
    (entityId: string, next: TaxReturnState) => {
      setLedger((prev) => {
        const l = { ...prev, returns: { ...prev.returns, [entityId]: next } };
        persistLedger(l);
        return l;
      });
      if (entityId === PARENT_ID) void sync({ taxReturn: next, entityId });
    },
    [persistLedger, sync],
  );

  const setPayments = useCallback((next: PaymentLiability[]) => {
    setPaymentsState(next);
    void sync({ payments: next });
  }, [sync]);

  const setCalendar = useCallback((next: CalendarEvent[]) => {
    setCalendarState(next);
    void sync({ calendarEvents: next });
  }, [sync]);

  // ── compliance (debounced persistence) ─────────────────────────────────
  const updateCompliance = useCallback(
    (fn: (s: ComplianceState) => ComplianceState) => {
      setCompliance((prev) => {
        const next = fn(prev);
        persistKey('compliance', next);
        return next;
      });
    },
    [persistKey],
  );

  const engineEntities = useMemo(
    () => entities.map((e) => ({ id: e.id, legalName: e.legalName, countryCode: e.countryCode, taxId: e.taxId })),
    [entities],
  );
  const { findings, zScoreReady } = useMemo(() => runRiskEngine(compliance.documents, engineEntities), [compliance.documents, engineEntities]);
  const reviewOf = useCallback((id: string) => compliance.reviews[id] ?? { status: 'open' as const, history: [] }, [compliance.reviews]);

  // ── reset ──────────────────────────────────────────────────────────────
  const resetSampleData = useCallback(async () => {
    // Drop queued writes so they cannot overwrite the fresh sample data.
    for (const t of Object.values(timers.current)) window.clearTimeout(t);
    pending.current = {};
    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.data) applyBootstrap(json.data);
      setCompliance(createInitialComplianceState());
      setLedger({ calculations: {}, returns: {} });
      return true;
    } catch {
      return false;
    }
  }, [applyBootstrap]);

  const value: Workspace = {
    hydrated,
    dbEngine,
    lastSyncedAt,
    entities,
    activeEntity,
    activeEntityId: activeEntity?.id ?? activeEntityId,
    country: (activeEntity?.countryCode ?? 'ID') as CountryCode,
    selectEntity,
    saveEntity,
    deleteEntity,
    persona,
    personas: PERSONAS,
    setPersonaId,
    actor,
    isParentExec,
    canAccess,
    accessibleEntities,
    entityById: (id: string) => entities.find((e) => e.id === id),
    calculationFor,
    setCalculation,
    returnFor,
    setReturn,
    payments,
    setPayments,
    calendar,
    setCalendar,
    studies,
    auditLogs,
    logAudit,
    compliance,
    updateCompliance,
    findings,
    zScoreReady,
    reviewOf,
    resetSampleData,
    refresh,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
