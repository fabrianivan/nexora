import type { CorporateEntity } from '@/data/entities';

/**
 * Pure multi-level ownership chain, reusable party directory, and signatory plan engine.
 * Models Figma's "Every shareholder resolves to a person" flow with cycle detection,
 * 100% allocation validation, effective ownership multiplication, and D9/D100/D101/D102 gating.
 */

export type PartyKind = 'individual' | 'corporate';
export type PartyStatus = 'Active' | 'Draft' | 'Expired';

export interface PartyProfile {
  id: string;
  kind: PartyKind;
  legalName: string;
  registrationOrIdNumber: string;
  idType: string;
  jurisdictionOrNationality: string;
  dateOfBirthOrIncorporation: string;
  gender?: 'M' | 'F';
  email: string;
  contactPhone?: string;
  address: string;
  status: PartyStatus;
  /** Individual profile IDs serving as directors of a corporate profile. */
  directorIds: string[];
}

export interface OwnershipLink {
  id: string;
  /** Target entity ID (either a CorporateEntity.id or a corporate PartyProfile.id). */
  targetId: string;
  /** Owner PartyProfile.id (individual or corporate). */
  ownerId: string;
  sharesHeld?: number;
  percent: number;
  shareClass?: string;
}

export interface CompanyOwnershipConfig {
  entityId: string;
  issuedShares: number;
  shareClass: string;
  consideration: string;
  directorIds: string[];
  /** Explicit confirmation when no individual reaches >25% effective ownership. */
  confirmedNoController?: boolean;
  /** Alternate controller profile ID when no one owns >25%. */
  otherControllerId?: string;
  controllerNote?: string;
  sentForSignatureAt?: string;
}

export interface OwnershipState {
  profiles: PartyProfile[];
  links: OwnershipLink[];
  companies: Record<string, CompanyOwnershipConfig>;
}

export interface OwnershipPathEntry {
  profileId: string;
  name: string;
  kind: PartyKind | 'untraced';
  /** Chain from direct owner down to leaf or vice versa; formatted leaf -> ... -> target. */
  pathNames: string[];
  pathIds: string[];
  effectivePercent: number;
  isUbo: boolean;
  reason?: string;
}

export interface OwnershipIndividualRow {
  profileId: string;
  name: string;
  kind: 'individual' | 'untraced';
  paths: string[];
  effectivePercent: number;
  isUbo: boolean;
  status: 'UBO' | 'Di bawah ambang' | 'Belum tertelusur';
  missingParentId?: string;
  missingParentName?: string;
}

export interface OwnershipChainNode {
  id: string;
  profileId: string;
  name: string;
  kind: 'target' | 'corporate' | 'intermediate' | 'individual' | 'untraced';
  directPercent: number;
  effectivePercent: number;
  isUbo: boolean;
  depth: number;
  parentNodeId?: string;
  untracedChildrenPercent?: number;
}

export interface OwnershipChainResult {
  entityId: string;
  entityName: string;
  tracedPercent: number;
  untracedPercent: number;
  directAllocatedPercent: number;
  uboCount: number;
  individualCount: number;
  hasUboAbove25: boolean;
  nodes: OwnershipChainNode[];
  edges: { fromId: string; toId: string; percent: number }[];
  individuals: OwnershipIndividualRow[];
  untracedLeaves: { companyId: string; companyName: string; missingPercent: number; effectiveMissingPercent: number }[];
}

export interface SignatoryItem {
  id: string;
  docCode: 'D9' | 'D100' | 'D101' | 'D102';
  entityId: string;
  entityName: string;
  entityRole: 'Target company' | 'Corporate shareholder' | 'Intermediate shareholder';
  signedByLabel: string;
  signatoryId: string | null;
  signatoryName: string | null;
  signatoryInitials: string | null;
  status: 'Ready' | 'Missing';
}

export interface SignatoryPlan {
  entityId: string;
  documents: ('D9' | 'D100' | 'D101' | 'D102')[];
  totalNeeded: number;
  assignedCount: number;
  missingCount: number;
  blocked: boolean;
  missingEntities: { id: string; name: string; role: string }[];
  items: SignatoryItem[];
}

export interface ProfileRoleSummary {
  companyName: string;
  companyId: string;
  role: 'Pemegang saham korporasi' | 'Pemegang saham perantara' | 'Pemilik manfaat / perorangan' | 'Direktur';
  percent?: number;
}

export const UBO_THRESHOLD_PERCENT = 25;

export function initialsFromName(name: string): string {
  const cleaned = name
    .replace(/^(Ir\.|Dr\.|H\.|Hj\.)\s+/i, '')
    .replace(/,.*$/, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function createInitialOwnershipState(entities: CorporateEntity[]): OwnershipState {
  const profiles: PartyProfile[] = [
    // Individuals
    {
      id: 'PTY-IND-HENDRA',
      kind: 'individual',
      legalName: 'Dr. Hendra Kusuma, S.Kom., M.B.A.',
      registrationOrIdNumber: '3174011403800001',
      idType: 'NIK / KTP',
      jurisdictionOrNationality: 'Indonesia',
      dateOfBirthOrIncorporation: '1980-03-14',
      gender: 'M',
      email: 'hendra.kusuma@nusantaradigital.co.id',
      contactPhone: '+62 811 8800 101',
      address: 'Jl. Senopati Dalam No. 18, Kebayoran Baru, Jakarta Selatan 12190',
      status: 'Active',
      directorIds: [],
    },
    {
      id: 'PTY-IND-KARTIKA',
      kind: 'individual',
      legalName: 'Kartika Wijaya, S.E., Ak., CA.',
      registrationOrIdNumber: '3171045208850003',
      idType: 'NIK / KTP',
      jurisdictionOrNationality: 'Indonesia',
      dateOfBirthOrIncorporation: '1985-08-22',
      gender: 'F',
      email: 'kartika.wijaya@nusantaradigital.co.id',
      contactPhone: '+62 811 8800 202',
      address: 'Apartemen Pacific Place Residence Lt. 22, SCBD, Jakarta Selatan 12190',
      status: 'Active',
      directorIds: [],
    },
    {
      id: 'PTY-IND-MARCUS',
      kind: 'individual',
      legalName: 'Marcus Tan Wei Ming',
      registrationOrIdNumber: 'S8419283D',
      idType: 'Singapore NRIC',
      jurisdictionOrNationality: 'Singapore',
      dateOfBirthOrIncorporation: '1984-05-19',
      gender: 'M',
      email: 'marcus.tan@archipelagoventures.sg',
      contactPhone: '+65 9123 4401',
      address: '15 Nassim Road, #04-02 Nassim Park Residences, Singapore 258382',
      status: 'Active',
      directorIds: [],
    },
    {
      id: 'PTY-IND-BUDI',
      kind: 'individual',
      legalName: 'Budi Santoso, S.E., Ak., BKP',
      registrationOrIdNumber: '3173021004790009',
      idType: 'NIK / KTP',
      jurisdictionOrNationality: 'Indonesia',
      dateOfBirthOrIncorporation: '1979-04-10',
      gender: 'M',
      email: 'budi.santoso@nusantaradigital.co.id',
      contactPhone: '+62 21 5088 9910',
      address: 'District 8 SCBD Treasury Tower Lt. 28, Jakarta Selatan 12190',
      status: 'Active',
      directorIds: [],
    },
    {
      id: 'PTY-IND-AHMAD',
      kind: 'individual',
      legalName: 'Ahmad Razak, CA (M)',
      registrationOrIdNumber: '830914-10-5411',
      idType: 'MyKad',
      jurisdictionOrNationality: 'Malaysia',
      dateOfBirthOrIncorporation: '1983-09-14',
      gender: 'M',
      email: 'ahmad.razak@nusantara-my.com',
      address: 'Level 19, Menara Etiqa, Kuala Lumpur 50470',
      status: 'Active',
      directorIds: [],
    },
    {
      id: 'PTY-IND-SARAH',
      kind: 'individual',
      legalName: 'Sarah Jenkins, CPA',
      registrationOrIdNumber: 'US-PP-582910441',
      idType: 'Passport',
      jurisdictionOrNationality: 'United States',
      dateOfBirthOrIncorporation: '1987-02-11',
      gender: 'F',
      email: 'sarah.jenkins@nusantara-ai.com',
      address: '548 Market Street, San Francisco, CA 94104',
      status: 'Active',
      directorIds: [],
    },

    // Corporate & intermediate profiles
    {
      id: 'PTY-CORP-MERDEKA',
      kind: 'corporate',
      legalName: 'Merdeka Kapital Nusantara Tbk',
      registrationOrIdNumber: 'AHU-0019283.AH.01.01',
      idType: 'SK Kemenkumham / NIB',
      jurisdictionOrNationality: 'Indonesia',
      dateOfBirthOrIncorporation: '2016-02-10',
      email: 'legal@merdekakapital.co.id',
      contactPhone: '+62 21 5790 8811',
      address: 'Pacific Century Place Lt. 35, SCBD Lot 10, Jakarta Selatan 12190',
      status: 'Active',
      directorIds: ['PTY-IND-HENDRA'],
    },
    {
      id: 'PTY-CORP-ARCHIPELAGO',
      kind: 'corporate',
      legalName: 'Archipelago Ventures Holding Pte. Ltd.',
      registrationOrIdNumber: '202019283C',
      idType: 'ACRA UEN',
      jurisdictionOrNationality: 'Singapore',
      dateOfBirthOrIncorporation: '2020-06-15',
      email: 'corporate@archipelagoventures.sg',
      contactPhone: '+65 6812 9000',
      address: '8 Marina View, #42-01 Asia Square Tower 1, Singapore 018960',
      status: 'Active',
      directorIds: ['PTY-IND-MARCUS'],
    },
    {
      id: 'PTY-CORP-NUSACAP',
      kind: 'corporate',
      legalName: 'Nusantara Capital Management Pte. Ltd.',
      registrationOrIdNumber: '201911204M',
      idType: 'ACRA UEN',
      jurisdictionOrNationality: 'Singapore',
      dateOfBirthOrIncorporation: '2019-03-04',
      email: 'ops@nusacapital.sg',
      address: '10 Collyer Quay, #27-00 Ocean Financial Centre, Singapore 049315',
      status: 'Active',
      directorIds: ['PTY-IND-MARCUS'],
    },
    {
      id: 'PTY-CORP-BLUEHORIZON',
      kind: 'corporate',
      legalName: 'BlueHorizon Pacific Partners LP',
      registrationOrIdNumber: 'DE-LP-5910291',
      idType: 'Delaware File No.',
      jurisdictionOrNationality: 'United States',
      dateOfBirthOrIncorporation: '2022-11-01',
      email: 'tax@bluehorizonpartners.com',
      address: '200 Park Avenue, Suite 3900, New York, NY 10166, USA',
      status: 'Active',
      directorIds: [], // Intentionally missing director to showcase Signatories block
    },
    {
      id: 'PTY-CORP-PACIFICGP',
      kind: 'corporate',
      legalName: 'Pacific Coast Equity GP LLC',
      registrationOrIdNumber: 'DE-LLC-4410982',
      idType: 'Delaware File No.',
      jurisdictionOrNationality: 'United States',
      dateOfBirthOrIncorporation: '2021-07-19',
      email: 'gp@pacificcoast.vc',
      address: '200 Park Avenue, Suite 3900, New York, NY 10166, USA',
      status: 'Active',
      directorIds: ['PTY-IND-HENDRA'],
    },
    {
      id: 'PTY-CORP-FEEDER',
      kind: 'corporate',
      legalName: 'Pacific Horizon Feeder Ltd.',
      registrationOrIdNumber: 'BVI-2091844',
      idType: 'BVI Reg No.',
      jurisdictionOrNationality: 'British Virgin Islands',
      dateOfBirthOrIncorporation: '2021-09-12',
      email: 'admin@pacifichorizon.vg',
      address: 'Craigmuir Chambers, Road Town, Tortola VG1110, BVI',
      status: 'Draft',
      directorIds: [], // Intentionally untraced & missing director
    },
    // Group corporate entities as reusable party profiles
    {
      id: 'PTY-CORP-ENT-ID',
      kind: 'corporate',
      legalName: 'PT Nusantara Kreasi Digital Tbk',
      registrationOrIdNumber: 'NIB-9120301928371',
      idType: 'NIB / NPWP',
      jurisdictionOrNationality: 'Indonesia',
      dateOfBirthOrIncorporation: '2018-03-14',
      email: 'tax.compliance@nusantaradigital.co.id',
      address: 'Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta Selatan 12190',
      status: 'Active',
      directorIds: ['PTY-IND-KARTIKA', 'PTY-IND-BUDI'],
    },
    {
      id: 'PTY-CORP-ENT-SG',
      kind: 'corporate',
      legalName: 'Nusantara FinTech Pte. Ltd.',
      registrationOrIdNumber: '202319482K',
      idType: 'ACRA UEN',
      jurisdictionOrNationality: 'Singapore',
      dateOfBirthOrIncorporation: '2023-01-12',
      email: 'finance.sg@nusantara-sg.com',
      address: 'One Raffles Place #20-01, Singapore 048616',
      status: 'Active',
      directorIds: ['PTY-IND-MARCUS'],
    },
  ];

  const links: OwnershipLink[] = [
    // ENT-ID-001 direct shareholders (sum = 100%)
    { id: 'LNK-ID-1', targetId: 'ENT-ID-001', ownerId: 'PTY-CORP-MERDEKA', sharesHeld: 11250000, percent: 45, shareClass: 'Ordinary' },
    { id: 'LNK-ID-2', targetId: 'ENT-ID-001', ownerId: 'PTY-CORP-ARCHIPELAGO', sharesHeld: 8750000, percent: 35, shareClass: 'Ordinary' },
    { id: 'LNK-ID-3', targetId: 'ENT-ID-001', ownerId: 'PTY-CORP-BLUEHORIZON', sharesHeld: 5000000, percent: 20, shareClass: 'Ordinary' },

    // Merdeka Kapital Nusantara Tbk (45% of ID) -> Hendra 70% (31.5%) + Kartika 30% (13.5%)
    { id: 'LNK-MK-1', targetId: 'PTY-CORP-MERDEKA', ownerId: 'PTY-IND-HENDRA', percent: 70 },
    { id: 'LNK-MK-2', targetId: 'PTY-CORP-MERDEKA', ownerId: 'PTY-IND-KARTIKA', percent: 30 },

    // Archipelago Ventures Holding (35% of ID) -> Nusantara Capital Mgmt 55% (19.25%) + Kartika 45% (15.75%)
    { id: 'LNK-AR-1', targetId: 'PTY-CORP-ARCHIPELAGO', ownerId: 'PTY-CORP-NUSACAP', percent: 55 },
    { id: 'LNK-AR-2', targetId: 'PTY-CORP-ARCHIPELAGO', ownerId: 'PTY-IND-KARTIKA', percent: 45 },

    // Nusantara Capital Mgmt -> Marcus Tan 100% (19.25% effective)
    { id: 'LNK-NC-1', targetId: 'PTY-CORP-NUSACAP', ownerId: 'PTY-IND-MARCUS', percent: 100 },

    // BlueHorizon Pacific Partners LP (20% of ID) -> Pacific Coast GP 80% (16.0%) + Pacific Horizon Feeder 20% (4.0% untraced!)
    { id: 'LNK-BH-1', targetId: 'PTY-CORP-BLUEHORIZON', ownerId: 'PTY-CORP-PACIFICGP', percent: 80 },
    { id: 'LNK-BH-2', targetId: 'PTY-CORP-BLUEHORIZON', ownerId: 'PTY-CORP-FEEDER', percent: 20 },

    // Pacific Coast Equity GP LLC -> Hendra 100% (16.0% -> total Hendra 47.5%)
    { id: 'LNK-PG-1', targetId: 'PTY-CORP-PACIFICGP', ownerId: 'PTY-IND-HENDRA', percent: 100 },

    // Subsidiary chains
    { id: 'LNK-SG-1', targetId: 'ENT-SG-002', ownerId: 'PTY-CORP-ENT-ID', sharesHeld: 85000, percent: 85, shareClass: 'Ordinary' },
    { id: 'LNK-SG-2', targetId: 'ENT-SG-002', ownerId: 'PTY-IND-MARCUS', sharesHeld: 15000, percent: 15, shareClass: 'Ordinary' },
    { id: 'LNK-MY-1', targetId: 'ENT-MY-003', ownerId: 'PTY-CORP-ENT-SG', sharesHeld: 100000, percent: 100, shareClass: 'Ordinary' },
    { id: 'LNK-US-1', targetId: 'ENT-US-004', ownerId: 'PTY-CORP-ENT-ID', sharesHeld: 1000000, percent: 100, shareClass: 'Common Stock' },

    // PT Nusantara Kreasi Digital Tbk profile links back to ENT-ID-001 owners for subsidiary tracing
    { id: 'LNK-PID-1', targetId: 'PTY-CORP-ENT-ID', ownerId: 'PTY-IND-HENDRA', percent: 47.5 },
    { id: 'LNK-PID-2', targetId: 'PTY-CORP-ENT-ID', ownerId: 'PTY-IND-KARTIKA', percent: 29.25 },
    { id: 'LNK-PID-3', targetId: 'PTY-CORP-ENT-ID', ownerId: 'PTY-IND-MARCUS', percent: 19.25 },
    { id: 'LNK-PSG-1', targetId: 'PTY-CORP-ENT-SG', ownerId: 'PTY-CORP-ENT-ID', percent: 85 },
    { id: 'LNK-PSG-2', targetId: 'PTY-CORP-ENT-SG', ownerId: 'PTY-IND-MARCUS', percent: 15 },
  ];

  const companies: Record<string, CompanyOwnershipConfig> = {
    'ENT-ID-001': {
      entityId: 'ENT-ID-001',
      issuedShares: 25_000_000,
      shareClass: 'Saham Biasa (Ordinary)',
      consideration: 'Rp 25.000.000.000',
      directorIds: ['PTY-IND-KARTIKA', 'PTY-IND-BUDI'],
    },
    'ENT-SG-002': {
      entityId: 'ENT-SG-002',
      issuedShares: 100_000,
      shareClass: 'Ordinary',
      consideration: 'SGD 100,000.00',
      directorIds: ['PTY-IND-MARCUS', 'PTY-IND-KARTIKA'],
    },
    'ENT-MY-003': {
      entityId: 'ENT-MY-003',
      issuedShares: 100_000,
      shareClass: 'Ordinary',
      consideration: 'MYR 250,000.00',
      directorIds: ['PTY-IND-AHMAD'],
    },
    'ENT-US-004': {
      entityId: 'ENT-US-004',
      issuedShares: 1_000_000,
      shareClass: 'Common Stock',
      consideration: 'USD 500,000.00',
      directorIds: ['PTY-IND-SARAH'],
    },
  };

  for (const ent of entities) {
    if (!companies[ent.id]) {
      companies[ent.id] = {
        entityId: ent.id,
        issuedShares: 20_000,
        shareClass: 'Ordinary',
        consideration: ent.paidUpCapital || '—',
        directorIds: [],
      };
    }
  }

  return { profiles, links, companies };
}

export function normalizeOwnershipState(raw: unknown, entities: CorporateEntity[]): OwnershipState {
  const base = createInitialOwnershipState(entities);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<OwnershipState>;
  return {
    profiles: Array.isArray(r.profiles) && r.profiles.length > 0 ? r.profiles : base.profiles,
    links: Array.isArray(r.links) ? r.links : base.links,
    companies: r.companies && typeof r.companies === 'object' ? { ...base.companies, ...r.companies } : base.companies,
  };
}

/**
 * Returns remaining unrecorded ownership percentage (0..100) for a target entity/company.
 */
export function remainingOwnership(links: OwnershipLink[], targetId: string, excludeLinkId?: string): number {
  const used = links
    .filter((l) => l.targetId === targetId && l.id !== excludeLinkId)
    .reduce((sum, l) => sum + l.percent, 0);
  return Math.max(0, Number((100 - used).toFixed(2)));
}

/**
 * Prevents ownership cycles: returns true if linking `candidateOwnerId` as an owner of `targetId`
 * would allow `targetId` (or an ancestor) to end up owning itself.
 */
export function wouldCreateCycle(links: OwnershipLink[], targetId: string, candidateOwnerId: string): boolean {
  if (targetId === candidateOwnerId) return true;
  // Walk downwards (who owns `targetId` -> wait: `targetId` is owned by `candidateOwnerId`;
  // cycle occurs if `candidateOwnerId` already directly or transitively depends on `targetId`,
  // OR if `targetId` is already an ancestor owner of `candidateOwnerId`!).
  // Specifically: edge direction in ownership is owner -> target. Adding edge (candidateOwnerId -> targetId)
  // creates a cycle iff there is already a path from targetId to candidateOwnerId along (owner -> target),
  // i.e. walking `owner -> targets` starting at `targetId` reaches `candidateOwnerId`!
  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === candidateOwnerId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const l of links) {
      if (l.ownerId === cur && !visited.has(l.targetId)) {
        stack.push(l.targetId);
      }
    }
  }
  return false;
}

/**
 * Walks the ownership graph upward from `entityId`, multiplying percentages along each path,
 * aggregating multiple paths to the same individual, and detecting untraced corporate leaves.
 */
export function computeOwnershipChain(
  state: OwnershipState,
  entity: Pick<CorporateEntity, 'id' | 'legalName'>,
): OwnershipChainResult {
  const profileMap = new Map(state.profiles.map((p) => [p.id, p]));
  const nodes: OwnershipChainNode[] = [
    {
      id: `NODE-TARGET-${entity.id}`,
      profileId: entity.id,
      name: entity.legalName,
      kind: 'target',
      directPercent: 100,
      effectivePercent: 100,
      isUbo: false,
      depth: 0,
    },
  ];
  const edges: { fromId: string; toId: string; percent: number }[] = [];
  const pathEntries: OwnershipPathEntry[] = [];
  const untracedLeavesMap = new Map<string, { companyId: string; companyName: string; missingPercent: number; effectiveMissingPercent: number }>();

  const directLinks = state.links.filter((l) => l.targetId === entity.id);
  const directAllocatedPercent = Number(directLinks.reduce((s, l) => s + l.percent, 0).toFixed(2));

  function walk(
    targetId: string,
    childNodeId: string,
    depth: number,
    cumulativeRatio: number,
    chainNames: string[],
    chainIds: string[],
    ancestors: Set<string>,
  ) {
    const owners = state.links.filter((l) => l.targetId === targetId);
    const totalOwned = owners.reduce((s, l) => s + l.percent, 0);

    // If corporate entity has missing ownership (< 100%)
    if (depth > 0 && totalOwned < 99.99) {
      const missingPct = Number((100 - totalOwned).toFixed(2));
      const effMissing = Number((cumulativeRatio * missingPct).toFixed(2));
      const corp = profileMap.get(targetId);
      const corpName = corp?.legalName ?? targetId;
      const existing = untracedLeavesMap.get(targetId);
      if (existing) {
        existing.effectiveMissingPercent = Number((existing.effectiveMissingPercent + effMissing).toFixed(2));
      } else {
        untracedLeavesMap.set(targetId, {
          companyId: targetId,
          companyName: corpName,
          missingPercent: missingPct,
          effectiveMissingPercent: effMissing,
        });
      }
      const untracedNodeId = `NODE-UNTRACED-${targetId}-${depth}`;
      nodes.push({
        id: untracedNodeId,
        profileId: targetId,
        name: owners.length === 0 ? 'Belum tercatat' : `Sisa belum tercatat (${missingPct}%)`,
        kind: 'untraced',
        directPercent: missingPct,
        effectivePercent: effMissing,
        isUbo: false,
        depth,
        parentNodeId: childNodeId,
      });
      edges.push({ fromId: untracedNodeId, toId: childNodeId, percent: missingPct });
      pathEntries.push({
        profileId: `UNTRACED-${targetId}`,
        name: corpName,
        kind: 'untraced',
        pathNames: [...chainNames].reverse(),
        pathIds: [...chainIds].reverse(),
        effectivePercent: effMissing,
        isUbo: false,
        reason: owners.length === 0 ? 'Belum ada pemilik tercatat' : `${missingPct}% kepemilikan belum tercatat`,
      });
    }

    for (const link of owners) {
      const owner = profileMap.get(link.ownerId);
      if (!owner) continue;
      if (ancestors.has(owner.id)) continue;

      const nextRatio = cumulativeRatio * (link.percent / 100);
      const effPct = Number((nextRatio * 100).toFixed(2));
      const nodeId = `NODE-${owner.id}-${depth}-${link.id}`;

      if (owner.kind === 'individual') {
        nodes.push({
          id: nodeId,
          profileId: owner.id,
          name: owner.legalName,
          kind: 'individual',
          directPercent: link.percent,
          effectivePercent: effPct,
          isUbo: false, // updated after aggregating multi-paths
          depth,
          parentNodeId: childNodeId,
        });
        edges.push({ fromId: nodeId, toId: childNodeId, percent: link.percent });
        pathEntries.push({
          profileId: owner.id,
          name: owner.legalName,
          kind: 'individual',
          pathNames: depth === 1 ? ['Pemegang saham langsung'] : [...chainNames].reverse(),
          pathIds: [...chainIds].reverse(),
          effectivePercent: effPct,
          isUbo: false,
        });
      } else {
        const subOwners = state.links.filter((l) => l.targetId === owner.id);
        const subTotal = subOwners.reduce((s, l) => s + l.percent, 0);
        nodes.push({
          id: nodeId,
          profileId: owner.id,
          name: owner.legalName,
          kind: depth === 1 ? 'corporate' : 'intermediate',
          directPercent: link.percent,
          effectivePercent: effPct,
          isUbo: false,
          depth,
          parentNodeId: childNodeId,
          untracedChildrenPercent: subTotal < 99.99 ? Number((100 - subTotal).toFixed(2)) : 0,
        });
        edges.push({ fromId: nodeId, toId: childNodeId, percent: link.percent });

        const nextAncestors = new Set(ancestors);
        nextAncestors.add(owner.id);
        walk(
          owner.id,
          nodeId,
          depth + 1,
          nextRatio,
          [...chainNames, owner.legalName],
          [...chainIds, owner.id],
          nextAncestors,
        );
      }
    }
  }

  walk(entity.id, `NODE-TARGET-${entity.id}`, 1, 1, [], [entity.id], new Set([entity.id]));

  // Aggregate effective ownership across multiple paths to the same individual
  const indTotals = new Map<string, OwnershipIndividualRow>();
  for (const entry of pathEntries) {
    if (entry.kind === 'individual') {
      const cur = indTotals.get(entry.profileId);
      const pathStr = entry.pathNames.join(' → ');
      if (cur) {
        cur.effectivePercent = Number((cur.effectivePercent + entry.effectivePercent).toFixed(2));
        if (!cur.paths.includes(pathStr)) cur.paths.push(pathStr);
      } else {
        indTotals.set(entry.profileId, {
          profileId: entry.profileId,
          name: entry.name,
          kind: 'individual',
          paths: [pathStr],
          effectivePercent: entry.effectivePercent,
          isUbo: false,
          status: 'Di bawah ambang',
        });
      }
    }
  }

  for (const row of indTotals.values()) {
    row.isUbo = row.effectivePercent > UBO_THRESHOLD_PERCENT;
    row.status = row.isUbo ? 'UBO' : 'Di bawah ambang';
  }

  // Update UBO flags on individual nodes based on aggregated effective ownership
  for (const node of nodes) {
    if (node.kind === 'individual') {
      const agg = indTotals.get(node.profileId);
      if (agg) node.isUbo = agg.isUbo;
    }
  }

  const untracedLeaves = Array.from(untracedLeavesMap.values());
  const untracedFromLeaves = untracedLeaves.reduce((s, u) => s + u.effectiveMissingPercent, 0);
  const directUnassigned = Math.max(0, Number((100 - directAllocatedPercent).toFixed(2)));
  const tracedPercent = Number(
    Array.from(indTotals.values())
      .reduce((s, r) => s + r.effectivePercent, 0)
      .toFixed(1),
  );
  const untracedPercent = Number(Math.max(0, untracedFromLeaves + directUnassigned).toFixed(1));

  const individuals: OwnershipIndividualRow[] = [
    ...Array.from(indTotals.values()).sort((a, b) => b.effectivePercent - a.effectivePercent),
    ...untracedLeaves.map((u) => ({
      profileId: `UNTRACED-${u.companyId}`,
      name: 'Belum tercatat',
      kind: 'untraced' as const,
      paths: [`${u.companyName} → ${entity.legalName}`],
      effectivePercent: u.effectiveMissingPercent,
      isUbo: false,
      status: 'Belum tertelusur' as const,
      missingParentId: u.companyId,
      missingParentName: u.companyName,
    })),
  ];

  const uboCount = Array.from(indTotals.values()).filter((r) => r.isUbo).length;
  const individualCount = indTotals.size;

  return {
    entityId: entity.id,
    entityName: entity.legalName,
    tracedPercent,
    untracedPercent,
    directAllocatedPercent,
    uboCount,
    individualCount,
    hasUboAbove25: uboCount > 0,
    nodes,
    edges,
    individuals,
    untracedLeaves,
  };
}

/**
 * Derives the signing plan (D9, D100, D101, D102) from the company's ownership chain.
 * Saving entities without directors is allowed, but sending documents is blocked until every
 * corporate and intermediate entity in the chain has a director on record.
 */
export function computeSignatoryPlan(
  state: OwnershipState,
  entity: Pick<CorporateEntity, 'id' | 'legalName'>,
  chain?: OwnershipChainResult,
): SignatoryPlan {
  const c = chain ?? computeOwnershipChain(state, entity);
  const profileMap = new Map(state.profiles.map((p) => [p.id, p]));
  const config = state.companies[entity.id];
  const items: SignatoryItem[] = [];
  const seenCorpD9 = new Set<string>();
  const seenCorpD100 = new Set<string>();
  const missingMap = new Map<string, { id: string; name: string; role: string }>();

  const corpNodes = c.nodes.filter((n) => n.kind === 'corporate' || n.kind === 'intermediate');

  // D9: A director of each corporate and intermediate shareholder
  for (const node of corpNodes) {
    if (seenCorpD9.has(node.profileId)) continue;
    seenCorpD9.add(node.profileId);
    const corp = profileMap.get(node.profileId);
    const dirId = corp?.directorIds[0] ?? null;
    const dir = dirId ? profileMap.get(dirId) : undefined;
    const roleLabel = node.kind === 'corporate' ? 'Corporate shareholder' : 'Intermediate shareholder';
    if (!dir) {
      missingMap.set(node.profileId, { id: node.profileId, name: node.name, role: roleLabel });
    }
    items.push({
      id: `SIG-D9-${node.profileId}`,
      docCode: 'D9',
      entityId: node.profileId,
      entityName: node.name,
      entityRole: roleLabel,
      signedByLabel: node.kind === 'corporate' ? 'Direktur pemegang saham korporasi' : 'Direktur pemegang saham perantara',
      signatoryId: dir?.id ?? null,
      signatoryName: dir?.legalName ?? null,
      signatoryInitials: dir ? initialsFromName(dir.legalName) : null,
      status: dir ? 'Ready' : 'Missing',
    });
  }

  // D100: A director of each direct corporate shareholder
  for (const node of corpNodes.filter((n) => n.kind === 'corporate')) {
    if (seenCorpD100.has(node.profileId)) continue;
    seenCorpD100.add(node.profileId);
    const corp = profileMap.get(node.profileId);
    const dirId = corp?.directorIds[0] ?? null;
    const dir = dirId ? profileMap.get(dirId) : undefined;
    if (!dir) {
      missingMap.set(node.profileId, { id: node.profileId, name: node.name, role: 'Corporate shareholder' });
    }
    items.push({
      id: `SIG-D100-${node.profileId}`,
      docCode: 'D100',
      entityId: node.profileId,
      entityName: node.name,
      entityRole: 'Corporate shareholder',
      signedByLabel: 'Direktur pemegang saham korporasi',
      signatoryId: dir?.id ?? null,
      signatoryName: dir?.legalName ?? null,
      signatoryInitials: dir ? initialsFromName(dir.legalName) : null,
      status: dir ? 'Ready' : 'Missing',
    });
  }

  // D101 & D102: Directors of the target company
  const targetDirs = config?.directorIds ?? [];
  const d101Dir = targetDirs[0] ? profileMap.get(targetDirs[0]) : undefined;
  const d102Dir = (targetDirs[1] ?? targetDirs[0]) ? profileMap.get(targetDirs[1] ?? targetDirs[0]) : undefined;
  if (!d101Dir) {
    missingMap.set(entity.id, { id: entity.id, name: entity.legalName, role: 'Target company' });
  }
  items.push(
    {
      id: `SIG-D101-${entity.id}`,
      docCode: 'D101',
      entityId: entity.id,
      entityName: entity.legalName,
      entityRole: 'Target company',
      signedByLabel: 'Direktur perusahaan target',
      signatoryId: d101Dir?.id ?? null,
      signatoryName: d101Dir?.legalName ?? null,
      signatoryInitials: d101Dir ? initialsFromName(d101Dir.legalName) : null,
      status: d101Dir ? 'Ready' : 'Missing',
    },
    {
      id: `SIG-D102-${entity.id}`,
      docCode: 'D102',
      entityId: entity.id,
      entityName: entity.legalName,
      entityRole: 'Target company',
      signedByLabel: 'Direktur perusahaan target',
      signatoryId: d102Dir?.id ?? null,
      signatoryName: d102Dir?.legalName ?? null,
      signatoryInitials: d102Dir ? initialsFromName(d102Dir.legalName) : null,
      status: d102Dir ? 'Ready' : 'Missing',
    },
  );

  const docsUsed = Array.from(new Set(items.map((i) => i.docCode)));
  const assignedCount = items.filter((i) => i.status === 'Ready').length;
  const missingCount = items.length - assignedCount;

  return {
    entityId: entity.id,
    documents: docsUsed,
    totalNeeded: items.length,
    assignedCount,
    missingCount,
    blocked: missingCount > 0,
    missingEntities: Array.from(missingMap.values()),
    items,
  };
}

/**
 * Lists every role a reusable PartyProfile plays across all companies & intermediate chains
 * (supports Figma 09 Edge state: "One profile, two roles").
 */
export function rolesForProfile(
  state: OwnershipState,
  entities: CorporateEntity[],
  profileId: string,
): ProfileRoleSummary[] {
  const results: ProfileRoleSummary[] = [];
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const profileMap = new Map(state.profiles.map((p) => [p.id, p]));

  for (const link of state.links) {
    if (link.ownerId !== profileId) continue;
    const targetEnt = entityMap.get(link.targetId);
    if (targetEnt) {
      const owner = profileMap.get(profileId);
      results.push({
        companyId: targetEnt.id,
        companyName: targetEnt.legalName,
        role: owner?.kind === 'corporate' ? 'Pemegang saham korporasi' : 'Pemilik manfaat / perorangan',
        percent: link.percent,
      });
    } else {
      const targetCorp = profileMap.get(link.targetId);
      results.push({
        companyId: link.targetId,
        companyName: targetCorp?.legalName ?? link.targetId,
        role: 'Pemegang saham perantara',
        percent: link.percent,
      });
    }
  }

  for (const cfg of Object.values(state.companies)) {
    if (cfg.directorIds.includes(profileId)) {
      const ent = entityMap.get(cfg.entityId);
      results.push({
        companyId: cfg.entityId,
        companyName: ent?.legalName ?? cfg.entityId,
        role: 'Direktur',
      });
    }
  }

  for (const p of state.profiles) {
    if (p.kind === 'corporate' && p.directorIds.includes(profileId)) {
      results.push({
        companyId: p.id,
        companyName: p.legalName,
        role: 'Direktur',
      });
    }
  }

  return results;
}
