'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  FileCheck2,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { canApprove, entityRiskScore, isUnresolved, riskBand } from '@/lib/compliance';
import { daysUntil, dateShort, money, moneyCompact, relativeDays } from '@/lib/format';
import { FX_NOTE, toIdr } from '@/lib/fx';
import { paymentStatus } from '@/lib/schedule';
import { CYCLE } from '@/shell/nav';
import { useCycleStatus } from '@/shell/cycle';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ColumnChart,
  Meter,
  PageHeader,
  SERIES,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { SeverityBadge, shortMonth } from '../shared';

function ComplianceRing({ value, tone }: { value: number; tone: 'emerald' | 'amber' | 'rose' }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const stroke = { emerald: 'var(--color-success-500)', amber: 'var(--color-warning-500)', rose: 'var(--color-danger-500)' }[tone];
  return (
    <div className="relative size-[92px] shrink-0">
      <svg viewBox="0 0 96 96" className="size-full -rotate-90" role="img" aria-label={`Skor kepatuhan ${value} dari 100`}>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[25px] font-semibold leading-none tracking-tight num">{value}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-white/45">/ 100</span>
      </span>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
}

export function OverviewPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const cycle = useCycleStatus();
  const ids = useMemo(() => new Set(ws.accessibleEntities.map((e) => e.id)), [ws.accessibleEntities]);
  const entityCountry = (id: string) => ws.entityById(id)?.countryCode ?? 'ID';

  const findings = ws.findings.filter((f) => ids.has(f.entityId));
  const unresolved = findings.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
  const critical = unresolved.filter((f) => f.severity === 'critical');
  const exposure = unresolved.reduce((s, f) => s + toIdr(f.amountAtRisk, f.country), 0);
  const approvals = findings.filter((f) => canApprove(ws.reviewOf(f.id), ws.actor).ok);

  const unpaid = ws.payments.filter((p) => ids.has(p.entityId) && p.status !== 'Dibayar');
  const due30 = unpaid.filter((p) => daysUntil(p.dueDate) <= 30);
  const due30Idr = due30.reduce((s, p) => s + toIdr(p.amount, entityCountry(p.entityId)), 0);
  const overduePayments = unpaid.filter((p) => paymentStatus(p) === 'Terlambat');

  const scores = ws.accessibleEntities.map((e) => entityRiskScore(findings.filter((f) => f.entityId === e.id), ws.compliance.reviews));
  const groupScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
  const band = riskBand(groupScore);
  const jurisdictionCount = new Set(ws.accessibleEntities.map((e) => e.countryCode)).size;

  const upcoming = ws.calendar
    .filter((e) => ids.has(e.entityId) && e.status !== 'Completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const cfg = MULTI_COUNTRY_DATA[ws.country];
  const metrics = cfg.monthlyMetrics;

  // Action centre — the few things that need this person today.
  const actions: { key: string; icon: React.ReactNode; tone: string; title: string; body: string; cta: string; href: string }[] = [];
  if (approvals.length)
    actions.push({ key: 'approve', icon: <ListChecks />, tone: 'bg-warning-50 text-warning-600', title: `${approvals.length} usulan menunggu persetujuan Anda`, body: 'Anda checker untuk temuan ini. Setujui atau kembalikan ke maker.', cta: 'Tinjau', href: '/review?tab=proposed' });
  critical.slice(0, 2).forEach((f) =>
    actions.push({ key: f.id, icon: <ShieldAlert />, tone: 'bg-danger-50 text-danger-600', title: `${f.ruleName} — ${ws.entityById(f.entityId)?.legalName ?? ''}`, body: f.explanation, cta: 'Buka temuan', href: `/risk?f=${encodeURIComponent(f.id)}` }),
  );
  overduePayments.slice(0, 2).forEach((p) =>
    actions.push({ key: p.id, icon: <Wallet />, tone: 'bg-danger-50 text-danger-600', title: `${p.taxType} terlambat`, body: `${ws.entityById(p.entityId)?.legalName} · ${money(p.amount, entityCountry(p.entityId))} · jatuh tempo ${dateShort(p.dueDate)}`, cta: 'Bayar', href: '/payments' }),
  );
  const reviewReturns = ws.accessibleEntities.filter((e) => ws.returnFor(e.id).returnStatus === 'Review');
  if (reviewReturns.length)
    actions.push({ key: 'spt', icon: <FileCheck2 />, tone: 'bg-brand-50 text-brand-600', title: `${reviewReturns.length} SPT tahunan menunggu persetujuan`, body: `${reviewReturns.map((e) => e.legalName).join(', ')} — perlu sign-off Group CFO/CEO sebelum dilaporkan.`, cta: 'Buka SPT', href: '/tax-return' });

  const firstName = ws.persona.name.replace(/^(Ir\.|Dr\.)\s*/, '').split(/[ ,]/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        title={`${greeting()}, ${firstName}`}
        description={
          ws.isParentExec
            ? `Posisi pajak & risiko ${ws.entities.length} entitas Nusantara Group di 4 yurisdiksi.`
            : `Ringkasan untuk entitas dalam cakupan akses Anda.`
        }
        actions={
          <>
            <Button icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot('Ringkas risiko pajak terbesar grup kami minggu ini dan langkah yang harus diprioritaskan.')}>
              Ringkas dengan Copilot
            </Button>
            <Button variant="primary" iconRight={<ArrowRight />} onClick={() => router.push('/risk')}>
              Lihat temuan risiko
            </Button>
          </>
        }
      />

      <section aria-label="Posisi kepatuhan grup" className="relative overflow-hidden rounded-2xl border border-ink bg-ink text-white shadow-md">
        <div aria-hidden className="nx-grid pointer-events-none absolute inset-0 opacity-20" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative grid lg:grid-cols-[minmax(300px,360px)_1fr]">
          <div className="flex items-center gap-5 border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <ComplianceRing value={groupScore} tone={band.tone} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">Skor kepatuhan grup</p>
              <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold">
                <span className={cn('size-2 rounded-full', band.tone === 'rose' ? 'bg-danger-500' : band.tone === 'amber' ? 'bg-warning-500' : 'bg-success-500')} />
                Risiko {band.label.toLowerCase()}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-white/55">
                {ws.accessibleEntities.length} entitas · {jurisdictionCount} yurisdiksi
              </p>
            </div>
          </div>
          <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                label: 'Temuan terbuka',
                value: unresolved.length,
                detail: `${critical.length} kritis · ${approvals.length} menunggu checker`,
                icon: <ShieldAlert />,
                href: '/risk',
              },
              {
                label: 'Eksposur berisiko',
                value: moneyCompact(exposure),
                detail: 'Nilai dokumen dengan temuan terbuka',
                icon: <Wallet />,
                href: '/risk',
              },
              {
                label: 'Jatuh tempo ≤ 30 hari',
                value: moneyCompact(due30Idr),
                detail: `${due30.length} kewajiban${overduePayments.length ? ` · ${overduePayments.length} terlambat` : ''}`,
                icon: <CalendarClock />,
                href: '/payments',
              },
            ].map((metric) => (
              <Link
                key={metric.label}
                href={metric.href}
                className="group relative flex min-w-0 flex-col justify-center p-5 transition-colors hover:bg-white/[0.045] sm:p-6"
              >
                <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                  <span className="[&_svg]:size-3.5 text-white/60">{metric.icon}</span>
                  {metric.label}
                </span>
                <span className="mt-2 text-2xl font-semibold tracking-tight num">{metric.value}</span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-white/50">{metric.detail}</span>
                <ArrowUpRight className="absolute right-5 top-5 size-3.5 text-white/20 transition-colors group-hover:text-white/70" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Perlu perhatian" description="Diurutkan berdasarkan dampak & tenggat" />
          {actions.length === 0 ? (
            <CardBody>
              <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 text-[13px] text-success-700">
                <Check className="size-4" /> Tidak ada tindakan mendesak. Siklus kepatuhan berjalan lancar.
              </div>
            </CardBody>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {actions.slice(0, 5).map((a) => (
                <li key={a.key} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={cn('mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 [&_svg]:size-4', a.tone)}>{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="text-[13px] text-ink-3 line-clamp-1">{a.body}</div>
                  </div>
                  <Button size="sm" onClick={() => router.push(a.href)}>
                    {a.cta}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Siklus kepatuhan"
            description={
              <span>
                {ws.activeEntity.flag} {ws.activeEntity.legalName}
              </span>
            }
          />
          <CardBody className="pt-1">
            <ol className="relative space-y-0.5">
              {CYCLE.map((step, i) => {
                const st = cycle[step.href];
                return (
                  <li key={step.href}>
                    <Link href={step.href} className="flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-subtle">
                      <span className="relative flex flex-col items-center">
                        <span
                          className={cn(
                            'size-5 rounded-full text-[10px] font-semibold flex items-center justify-center num z-10',
                            st?.done ? 'bg-success-500 text-white' : 'bg-surface ring-1 ring-line-strong text-ink-3',
                          )}
                        >
                          {st?.done ? <Check className="size-3" strokeWidth={3} /> : step.step}
                        </span>
                        {i < CYCLE.length - 1 && <span className={cn('absolute top-5 h-[22px] w-px', st?.done ? 'bg-success-100' : 'bg-line')} />}
                      </span>
                      <span className="min-w-0 flex-1 -mt-px">
                        <span className="block text-[13px] font-medium text-ink">{step.label}</span>
                        <span className={cn('block text-xs truncate', st?.done ? 'text-ink-3' : st?.tone === 'danger' ? 'text-danger-600' : 'text-warning-700')}>{st?.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Entitas grup" description="Skor kepatuhan dihitung dari temuan yang belum diputuskan" actions={<Link href="/entities" className="text-[13px] text-brand-600 hover:text-brand-700 font-medium">Semua entitas</Link>} />
        <Table>
          <THead>
            <tr>
              <TH>Entitas</TH>
              <TH>Skor kepatuhan</TH>
              <TH align="right">Temuan terbuka</TH>
              <TH align="right">Belum disetor</TH>
              <TH>Tenggat berikutnya</TH>
            </tr>
          </THead>
          <tbody>
            {ws.accessibleEntities.map((e) => {
              const ef = findings.filter((f) => f.entityId === e.id);
              const open = ef.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
              const worst = open[0];
              const score = entityRiskScore(ef, ws.compliance.reviews);
              const b = riskBand(score);
              const owed = ws.payments.filter((p) => p.entityId === e.id && p.status !== 'Dibayar').reduce((s, p) => s + p.amount, 0);
              const next = ws.calendar.filter((c) => c.entityId === e.id && c.status !== 'Completed').sort((a, z) => a.dueDate.localeCompare(z.dueDate))[0];
              return (
                <TR
                  key={e.id}
                  selected={e.id === ws.activeEntityId}
                  onClick={() => {
                    ws.selectEntity(e.id);
                    router.push(`/entities/${e.id}`);
                  }}
                >
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{e.flag}</span>
                      <div className="min-w-0">
                        <div className="text-ink font-medium truncate">{e.legalName}</div>
                        <div className="text-xs text-ink-3">{e.parentCompanyId ? `Anak usaha · ${e.ownershipByParent}%` : 'Induk grup (UPE)'}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="min-w-[160px]">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-ink font-medium num">{score}</span>
                      <Meter value={score} tone={b.tone === 'rose' ? 'danger' : b.tone === 'amber' ? 'warning' : 'success'} className="w-24" label={`Skor ${score}`} />
                    </div>
                  </TD>
                  <TD align="right">
                    <div className="flex items-center justify-end gap-2">
                      {worst && <SeverityBadge severity={worst.severity} />}
                      <span className="text-ink font-medium">{open.length}</span>
                    </div>
                  </TD>
                  <TD align="right" className="text-ink">{owed ? money(owed, e.countryCode) : <span className="text-ink-4">—</span>}</TD>
                  <TD>
                    {next ? (
                      <div className="min-w-0">
                        <div className="text-ink truncate max-w-[240px]">{next.title}</div>
                        <div className={cn('text-xs', daysUntil(next.dueDate) < 0 ? 'text-danger-600' : 'text-ink-3')}>
                          {dateShort(next.dueDate)} · {relativeDays(next.dueDate)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-ink-4">—</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader
            title={`${cfg.indirectTaxName.split(' ')[0]} keluaran vs masukan`}
            description={`${ws.activeEntity.flag} ${ws.activeEntity.legalName} · 6 bulan terakhir`}
            actions={
              metrics.some((m) => m.anomalyCount > 2) ? (
                <Badge tone="warning">Lonjakan masukan {shortMonth(metrics.reduce((a, b) => (b.anomalyCount > a.anomalyCount ? b : a)).month)}</Badge>
              ) : undefined
            }
          />
          <CardBody>
            <ColumnChart
              title={`${cfg.indirectTaxName} keluaran dan masukan per bulan`}
              categories={metrics.map((m) => shortMonth(m.month))}
              series={[
                { name: 'Keluaran', color: SERIES[0], values: metrics.map((m) => m.ppnKeluaran) },
                { name: 'Masukan', color: SERIES[1], values: metrics.map((m) => m.ppnMasukan) },
              ]}
              format={(v) => moneyCompact(v, ws.country)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tenggat terdekat" actions={<Link href="/calendar" className="text-[13px] text-brand-600 hover:text-brand-700 font-medium">Kalender</Link>} />
          <ul className="divide-y divide-line border-t border-line">
            {upcoming.map((e) => {
              const d = daysUntil(e.dueDate);
              const late = d < 0;
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={cn('w-11 shrink-0 rounded-lg border text-center py-1', late ? 'border-danger-100 bg-danger-50' : 'border-line bg-subtle')}>
                    <div className={cn('text-[10px] uppercase', late ? 'text-danger-600' : 'text-ink-3')}>{dateShort(e.dueDate).split(' ')[1]}</div>
                    <div className={cn('text-sm font-semibold num leading-tight', late ? 'text-danger-700' : 'text-ink')}>{dateShort(e.dueDate).split(' ')[0]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-ink truncate">{e.title}</div>
                    <div className={cn('text-xs', late ? 'text-danger-600' : 'text-ink-3')}>
                      {ws.entityById(e.entityId)?.flag} {relativeDays(e.dueDate)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-ink-4">{FX_NOTE}. Total grup dikonversi ke Rupiah hanya untuk agregasi.</p>
    </div>
  );
}
