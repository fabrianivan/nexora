'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { canApprove, entityRiskScore, groupRiskScore, isUnresolved, riskBand } from '@/lib/compliance';
import { daysUntil, dateShort, money, moneyCompact, relativeDays } from '@/lib/format';
import { FX_NOTE, toIdr } from '@/lib/fx';
import { paymentStatus } from '@/lib/schedule';
import { CycleRibbon } from '@/shell/CycleRibbon';
import {
  Badge,
  BandLead,
  Button,
  ColumnChart,
  ComplianceRing,
  Meter,
  MetricBand,
  PageHeader,
  SERIES,
  Section,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { SeverityBadge, shortMonth } from '../shared';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
}

export function OverviewPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
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

  const groupScore = groupRiskScore(findings, ws.accessibleEntities.map((e) => e.id), ws.compliance.reviews);
  const band = riskBand(groupScore);
  const jurisdictionCount = new Set(ws.accessibleEntities.map((e) => e.countryCode)).size;

  const upcoming = ws.calendar
    .filter((e) => ids.has(e.entityId) && e.status !== 'Completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const cfg = MULTI_COUNTRY_DATA[ws.country];
  const metrics = cfg.monthlyMetrics;

  // The few things that need this person today, most consequential first.
  const actions: { key: string; kind: string; title: string; body: string; cta: string; href: string; tone: 'danger' | 'warning' | 'brand' }[] = [];
  critical.slice(0, 2).forEach((f) =>
    actions.push({ key: f.id, kind: 'Kasus kritis', tone: 'danger', title: `${f.ruleName} · ${ws.entityById(f.entityId)?.legalName ?? ''}`, body: f.explanation, cta: 'Buka kasus', href: `/cases?f=${encodeURIComponent(f.id)}` }),
  );
  if (approvals.length)
    actions.push({ key: 'approve', kind: 'Persetujuan', tone: 'warning', title: `${approvals.length} usulan menunggu persetujuan Anda`, body: 'Anda checker untuk usulan ini. Setujui atau kembalikan ke maker.', cta: 'Tinjau', href: '/cases?tab=proposed' });
  overduePayments.slice(0, 2).forEach((p) =>
    actions.push({ key: p.id, kind: 'Terlambat', tone: 'danger', title: `${p.taxType}`, body: `${ws.entityById(p.entityId)?.legalName} · ${money(p.amount, entityCountry(p.entityId))} · jatuh tempo ${dateShort(p.dueDate)}`, cta: 'Bayar', href: '/payments' }),
  );
  const reviewReturns = ws.accessibleEntities.filter((e) => ws.returnFor(e.id).returnStatus === 'Review');
  if (reviewReturns.length)
    actions.push({ key: 'spt', kind: 'SPT', tone: 'brand', title: `${reviewReturns.length} SPT tahunan menunggu persetujuan`, body: `${reviewReturns.map((e) => e.legalName).join(', ')} perlu sign-off Group CFO/CEO.`, cta: 'Buka SPT', href: '/tax-return' });

  const firstName = ws.persona.name.replace(/^(Ir\.|Dr\.)\s*/, '').split(/[ ,]/)[0];
  const overdueIdr = overduePayments.reduce((s, p) => s + toIdr(p.amount, entityCountry(p.entityId)), 0);

  // The front-page headline: the single most consequential fact, with its next move.
  const headline = critical.length
    ? { mark: `${critical.length} kasus kritis`, rest: ' perlu diputuskan sebelum SPT grup bisa disetujui.', cta: 'Buka kasus kritis', href: `/cases?f=${encodeURIComponent(critical[0].id)}` }
    : approvals.length
      ? { mark: `${approvals.length} usulan`, rest: ' menunggu persetujuan Anda sebagai checker.', cta: 'Tinjau usulan', href: '/cases?tab=proposed' }
      : overduePayments.length
        ? { mark: `${overduePayments.length} kewajiban pajak`, rest: ' sudah lewat tenggat.', cta: 'Buka pembayaran', href: '/payments' }
        : reviewReturns.length
          ? { mark: `${reviewReturns.length} SPT tahunan`, rest: ' menunggu persetujuan.', cta: 'Buka SPT', href: '/tax-return' }
          : unresolved.length
            ? { mark: `${unresolved.length} kasus`, rest: ' masih terbuka, tanpa yang kritis.', cta: 'Buka Kasus', href: '/cases' }
            : { mark: 'Semua siklus', rest: ' berjalan sesuai jadwal.', cta: 'Lihat laporan', href: '/reports' };

  const lede = [
    `${unresolved.length} kasus terbuka dengan nilai dokumen ${moneyCompact(exposure)}`,
    overduePayments.length ? `${overduePayments.length} kewajiban terlambat senilai ${moneyCompact(overdueIdr)}` : `${due30.length} kewajiban jatuh tempo dalam 30 hari`,
  ].join(', dan ');
  const startWith = critical[0] ? ` Mulai dari ${critical[0].ruleName} di ${(ws.entityById(critical[0].entityId)?.legalName ?? '').replace(/\.$/, '')}.` : '';

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={
          <span>
            {greeting()}, {firstName} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        }
        title={
          <span className="block text-[44px] sm:text-[52px] leading-[1.04]">
            <span className="mark mark-sweep">{headline.mark}</span>
            {headline.rest}
          </span>
        }
        description={ws.isParentExec ? `${lede}.${startWith}` : `Ringkasan untuk entitas dalam cakupan akses Anda: ${lede}.`}
        actions={
          <>
            <Button variant="ghost" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot('Ringkas risiko pajak terbesar grup kami minggu ini dan langkah yang harus diprioritaskan.')}>
              Ringkas dengan Copilot
            </Button>
            <Button variant="primary" size="lg" iconRight={<ArrowRight />} onClick={() => router.push(headline.href)}>
              {headline.cta}
            </Button>
          </>
        }
        className="mb-0"
      />

      <MetricBand
        label="Posisi kepatuhan grup"
        lead={
          <BandLead
            eyebrow="Skor kepatuhan grup"
            title={`Risiko ${band.label.toLowerCase()}`}
            detail={`${ws.accessibleEntities.length} entitas · ${jurisdictionCount} yurisdiksi`}
            tone={band.tone === 'rose' ? 'danger' : band.tone === 'amber' ? 'warning' : 'success'}
            visual={<ComplianceRing value={groupScore} tone={band.tone} label={`Skor kepatuhan ${groupScore} dari 100`} />}
          />
        }
        metrics={[
          { label: 'Kasus terbuka', value: unresolved.length, detail: `${critical.length} kritis · ${approvals.length} menunggu checker`, href: '/cases', tone: critical.length ? 'danger' : undefined },
          { label: 'Nilai dokumen berisiko', value: moneyCompact(exposure), detail: 'Dokumen dengan kasus terbuka (≈ IDR)', href: '/cases' },
          { label: 'Jatuh tempo ≤ 30 hari', value: moneyCompact(due30Idr), detail: `${due30.length} kewajiban${overduePayments.length ? ` · ${overduePayments.length} terlambat` : ''}`, href: '/payments', tone: overduePayments.length ? 'warning' : undefined },
        ]}
      />

      <Section title="Siklus kepatuhan" description={`${ws.activeEntity.flag} ${ws.activeEntity.legalName}: enam langkah dari dokumen sampai setoran.`}>
        <CycleRibbon />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-x-12 gap-y-12">
        <Section title="Perlu keputusan Anda" description="Diurutkan dari dampak terbesar.">
          {actions.length === 0 ? (
            <p className="flex items-center gap-2 text-[14px] text-success-700">
              <Check className="size-4" /> Tidak ada tindakan mendesak. Siklus berjalan lancar.
            </p>
          ) : (
            <ol className="divide-y divide-line">
              {actions.slice(0, 4).map((a, i) => (
                <li key={a.key} className="flex items-start gap-4 py-4 first:pt-1">
                  <span className="figure text-[22px] leading-7 text-ink-4 w-6 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn('eyebrow !text-[10.5px]', a.tone === 'danger' ? '!text-danger-600' : a.tone === 'warning' ? '!text-warning-700' : '!text-brand-600')}>{a.kind}</div>
                    <div className="mt-0.5 text-[15px] font-medium text-ink">{a.title}</div>
                    <div className="mt-0.5 text-[13px] text-ink-3 line-clamp-2">{a.body}</div>
                  </div>
                  <Link href={a.href} className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900 shrink-0">
                    {a.cta} <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Tenggat terdekat" actions={<Link href="/calendar" className="text-[13px] text-brand-700 hover:text-brand-900 font-medium">Kalender</Link>}>
          <ul className="divide-y divide-line">
            {upcoming.map((e) => {
              const d = daysUntil(e.dueDate);
              const late = d < 0;
              const [day, month] = dateShort(e.dueDate).split(' ');
              return (
                <li key={e.id} className="flex items-center gap-4 py-3 first:pt-1">
                  <div className="w-10 shrink-0 text-center">
                    <div className={cn('figure text-[24px] leading-none', late ? 'text-danger-600' : 'text-ink')}>{day}</div>
                    <div className={cn('eyebrow !text-[9.5px] mt-0.5', late && '!text-danger-600')}>{month}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink truncate">{e.title}</div>
                    <div className={cn('text-xs', late ? 'text-danger-600' : 'text-ink-3')}>
                      {ws.entityById(e.entityId)?.flag} {relativeDays(e.dueDate)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <Section title="Entitas grup" description="Skor kepatuhan: 100 berarti tidak ada kasus terbuka." actions={<Link href="/entities" className="text-[13px] text-brand-700 hover:text-brand-900 font-medium">Semua entitas</Link>}>
        <Table className="-mx-5">
          <THead>
            <tr>
              <TH>Entitas</TH>
              <TH>Skor kepatuhan</TH>
              <TH align="right">Kasus terbuka</TH>
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
                      <span className="figure w-8 text-[20px] text-ink">{score}</span>
                      <Meter value={score} tone={b.tone === 'rose' ? 'danger' : b.tone === 'amber' ? 'warning' : 'success'} className="w-20" label={`Skor ${score}`} />
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
      </Section>

      <Section
        title={`${cfg.indirectTaxName.split(' ')[0]} keluaran vs masukan`}
        description={`${ws.activeEntity.flag} ${ws.activeEntity.legalName} · 6 bulan terakhir`}
        actions={
          metrics.some((m) => m.anomalyCount > 2) ? (
            <Badge tone="warning">Lonjakan masukan {shortMonth(metrics.reduce((a, b) => (b.anomalyCount > a.anomalyCount ? b : a)).month)}</Badge>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-x-12 gap-y-8 items-start">
          <ColumnChart
            title={`${cfg.indirectTaxName} keluaran dan masukan per bulan`}
            categories={metrics.map((m) => shortMonth(m.month))}
            series={[
              { name: 'Keluaran', color: SERIES[0], values: metrics.map((m) => m.ppnKeluaran) },
              { name: 'Masukan', color: SERIES[1], values: metrics.map((m) => m.ppnMasukan) },
            ]}
            format={(v) => moneyCompact(v, ws.country)}
          />
          {(() => {
            const last = metrics[metrics.length - 1];
            const net = last.ppnKeluaran - last.ppnMasukan;
            return (
              <dl className="divide-y divide-line border-t border-line">
                {[
                  { label: `Keluaran ${shortMonth(last.month)}`, value: moneyCompact(last.ppnKeluaran, ws.country) },
                  { label: `Masukan ${shortMonth(last.month)}`, value: moneyCompact(last.ppnMasukan, ws.country) },
                  { label: net >= 0 ? 'Kurang bayar (sebelum blokir)' : 'Lebih bayar', value: moneyCompact(Math.abs(net), ws.country) },
                ].map((x) => (
                  <div key={x.label} className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-[13px] text-ink-3">{x.label}</dt>
                    <dd className="figure text-[24px] text-ink">{x.value}</dd>
                  </div>
                ))}
                <div className="py-3 text-[13px] text-ink-2">
                  Masukan yang terkait kasus terbuka diblokir di halaman Rekonsiliasi sampai kasusnya diputuskan.{' '}
                  <Link href="/calculation" className="text-brand-700 hover:text-brand-900 font-medium">Buka rekap PPN</Link>
                </div>
              </dl>
            );
          })()}
        </div>
      </Section>

      <p className="text-xs text-ink-4">{FX_NOTE}. Total grup dikonversi ke Rupiah hanya untuk agregasi.</p>
    </div>
  );
}
