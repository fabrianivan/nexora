import type {
  CorporateEntity,
  FindingV2,
  Ownership,
  Shareholder,
} from './domain';

export interface OwnershipIssue {
  type:
    | 'total'
    | 'circular'
    | 'missing'
    | 'unidentified_ubo'
    | 'orphan'
    | 'high_risk_conduit';
  message: string;
  entityId?: string;
  severity?: 'critical' | 'high' | 'medium';
  ruleId?: string;
}

export function validateOwnership(
  entities: CorporateEntity[],
  links: Ownership[],
  shareholders: Shareholder[] = []
): OwnershipIssue[] {
  const ids = new Set(entities.map((entity) => entity.id));
  const issues: OwnershipIssue[] = [];

  for (const link of links) {
    if (!ids.has(link.ownerId) || !ids.has(link.ownedId)) {
      issues.push({
        type: 'missing',
        severity: 'high',
        ruleId: 'OWNERSHIP_MISSING_REF',
        message: 'Relasi merujuk entitas yang tidak tersedia.',
      });
    }
  }

  for (const entity of entities) {
    const incoming = links.filter((link) => link.ownedId === entity.id);
    if (incoming.length) {
      const total = incoming.reduce((sum, link) => sum + link.percentage, 0);
      if (Math.abs(total - 100) > 0.001) {
        issues.push({
          type: 'total',
          entityId: entity.id,
          severity: 'high',
          ruleId: 'OWNERSHIP_TOTAL_MISMATCH',
          message: `Total kepemilikan ${entity.name} adalah ${total}%, bukan 100%.`,
        });
      }
    }
  }

  // Detect circular ownership via DFS
  const graph = new Map<string, string[]>();
  links.forEach((link) =>
    graph.set(link.ownerId, [...(graph.get(link.ownerId) ?? []), link.ownedId])
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((graph.get(id) ?? []).some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (entities.some((entity) => visit(entity.id))) {
    issues.push({
      type: 'circular',
      severity: 'critical',
      ruleId: 'OWNERSHIP_CIRCULAR',
      message:
        'Circular ownership terdeteksi. Hapus relasi yang kembali ke pemilik sebelumnya.',
    });
  }

  // Additional checks when shareholders or multi-entity structures are provided
  if (shareholders.length > 0) {
    const connectedEntityIds = new Set<string>();
    links.forEach((l) => {
      connectedEntityIds.add(l.ownerId);
      connectedEntityIds.add(l.ownedId);
    });

    for (const entity of entities) {
      if (entities.length > 1 && !connectedEntityIds.has(entity.id)) {
        issues.push({
          type: 'orphan',
          entityId: entity.id,
          severity: 'medium',
          ruleId: 'OWNERSHIP_ORPHAN_ENTITY',
          message: `Entitas yatim (orphan): ${entity.name} tidak terhubung ke struktur induk maupun anak perusahaan.`,
        });
      }

      const entityShareholders = shareholders.filter((s) => s.entityId === entity.id);
      const hasConfirmedUbo = entityShareholders.some(
        (s) => s.isBeneficialOwner && s.beneficialOwnerConfirmed
      );
      if (entityShareholders.length > 0 && !hasConfirmedUbo) {
        issues.push({
          type: 'unidentified_ubo',
          entityId: entity.id,
          severity: 'high',
          ruleId: 'OWNERSHIP_UNIDENTIFIED_UBO',
          message: `Pemilik manfaat akhir (Ultimate Beneficial Owner / UBO) untuk ${entity.name} belum teridentifikasi atau belum terkonfirmasi.`,
        });
      }

      for (const sh of entityShareholders) {
        if (sh.highRiskJurisdiction) {
          issues.push({
            type: 'high_risk_conduit',
            entityId: entity.id,
            severity: 'high',
            ruleId: 'HIGH_RISK_JURISDICTION',
            message: `Pemegang saham perantara ${sh.name} (${sh.jurisdiction}) berada di yurisdiksi berisiko conduit / treaty shopping (BEPS Action 6).`,
          });
        }
      }
    }
  }

  return issues;
}

export function calculateEffectiveOwnership(
  rootEntityId: string,
  entities: CorporateEntity[],
  links: Ownership[]
): Record<string, number> {
  const effective: Record<string, number> = { [rootEntityId]: 100 };
  const queue: Array<{ id: string; pct: number; depth: number }> = [
    { id: rootEntityId, pct: 100, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth > entities.length + 1) continue; // prevent infinite loop on circular graph
    const outgoing = links.filter((l) => l.ownerId === current.id);
    for (const edge of outgoing) {
      const childPct = Number(((current.pct * edge.percentage) / 100).toFixed(2));
      effective[edge.ownedId] = Math.min(
        100,
        Number(((effective[edge.ownedId] ?? 0) + childPct).toFixed(2))
      );
      queue.push({ id: edge.ownedId, pct: childPct, depth: current.depth + 1 });
    }
  }

  return effective;
}

export function ownershipIssuesToFindings(
  issues: OwnershipIssue[],
  entities: CorporateEntity[],
  suppressedRules: string[] = []
): FindingV2[] {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const defaultEntity = entities[0];

  return issues.map((issue, idx) => {
    const targetEntity = (issue.entityId && entityMap.get(issue.entityId)) || defaultEntity;
    const ruleId = issue.ruleId ?? `OWNERSHIP_${issue.type.toUpperCase()}`;
    const suppressedPenalty = suppressedRules.includes(ruleId) ? 25 : 0;
    const baseRuleScore =
      issue.type === 'circular'
        ? 72
        : issue.type === 'high_risk_conduit'
          ? 64
          : issue.type === 'unidentified_ubo'
            ? 62
            : 54;
    const statScore = issue.type === 'circular' || issue.type === 'high_risk_conduit' ? 18 : 10;
    const totalScore = Math.max(15, Math.min(99, baseRuleScore + statScore - suppressedPenalty));

    return {
      id: `FIND-OWN-${idx + 1}-${targetEntity?.id ?? 'GRP'}`,
      entityId: targetEntity?.id ?? 'ENT-ID-001',
      country: targetEntity?.country ?? 'ID',
      ruleId,
      category: 'OWNERSHIP',
      title:
        issue.type === 'circular'
          ? 'Kepemilikan Melingkar (Circular Ownership) Terdeteksi'
          : issue.type === 'total'
            ? 'Total Persentase Kepemilikan Tidak Sama Dengan 100%'
            : issue.type === 'unidentified_ubo'
              ? 'Pemilik Manfaat Akhir (UBO) Belum Terkonfirmasi'
              : issue.type === 'orphan'
                ? 'Entitas Yatim (Orphan Entity) Tanpa Relasi Induk'
                : issue.type === 'high_risk_conduit'
                  ? 'Perusahaan Perantara di Yurisdiksi Berisiko (Conduit Risk)'
                  : 'Referensi Struktur Kepemilikan Tidak Lengkap',
      severity: issue.severity ?? 'high',
      score: totalScore,
      ruleScoreContribution: Math.max(10, baseRuleScore - suppressedPenalty),
      statScoreContribution: statScore,
      confidence: 0.96,
      reason: issue.message,
      evidence: [
        {
          field: 'ownershipGraph',
          location: `Grafik Struktur Kepemilikan • Entitas ${targetEntity?.name ?? 'Grup'}`,
          value: issue.message,
          expectedOrStatistic: 'Kepemilikan asiklik (DAG), total 100%, dan UBO teridentifikasi (Perpres 13/2018 & OECD Action 6)',
        },
      ],
      recommendation:
        issue.type === 'circular'
          ? 'Koreksi akta kepemilikan silang dan pastikan grafik kepemilikan berbentuk hirarki asiklik.'
          : issue.type === 'total'
            ? 'Cocokkan Daftar Pemegang Saham dengan Lampiran 1771-V agar total saham tepat 100%.'
            : issue.type === 'unidentified_ubo'
              ? 'Lengkapi deklarasi Beneficial Owner sesuai Perpres No. 13 Tahun 2018.'
              : 'Lakukan uji substansi ekonomi (Principal Purpose Test) atas entitas perantara.',
      status: 'Baru',
      isFalsePositive: false,
      computeLabel: 'Dihitung lokal (DFS Graph Validator)',
      timestamp: new Date().toISOString(),
    };
  });
}
