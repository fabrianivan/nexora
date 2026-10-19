import React, { useState } from 'react';
import {
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { CountryCode } from '@/data/multiCountryTaxData';

export interface SubsidiaryNode {
  id: string;
  entityName: string;
  tradeName: string;
  role: string;
  countryCode: CountryCode;
  flag: string;
  jurisdiction: string;
  taxId: string;
  registrationNo: string;
  directOwnership: number;
  effectiveOwnership: number;
  functionalCurrency: string;
  transferPricingMethod: string;
  intercompanyTransaction: string;
  annualIntercompanyVolume: string;
  whtDomesticRate: string;
  whtTreatyRate: string;
  treatyFormStatus: string;
  complianceScore: number;
}

export interface IntermediateShareholder {
  id: string;
  type: string;
  name: string;
  registrationNo: string;
  jurisdiction: string;
  taxId: string;
  sharePercent: number;
  votingRightPercent: number;
  effectiveDate: string;
  status: 'Active' | 'Under Review';
  bepsRisk: string;
  address: string;
  contactEmail: string;
}

export interface IndividualShareholder {
  id: string;
  type: string;
  fullName: string;
  roleTitle: string;
  nationality: string;
  taxResidency: string;
  nationalIdOrPassport: string;
  personalTaxId: string;
  directSharePercent: number;
  effectiveSharePercent: number;
  votingRightPercent: number;
  dividendTaxRegime: string;
  pepAndSanctionStatus: string;
  kycDocStatus: string;
  status: 'Active' | 'Under Review';
  address: string;
  email: string;
}

export interface StructureEntity {
  id: string;
  legalName: string;
  flag: string;
  taxId: string;
  paidUpCapital: string;
  aiComplianceScore: number;
  structureNodes: SubsidiaryNode[];
  intermediateShareholders: IntermediateShareholder[];
  individualShareholders: IndividualShareholder[];
}

export interface CompanyStructureViewProps {
  entity: StructureEntity;
  onOpenAddSubsidiary: () => void;
  onOpenAddCorporateShareholder: () => void;
  onOpenAddIndividualShareholder: () => void;
  onNavigateToUboWorkspace: () => void;
  onDeleteIntermediateShareholder: (id: string) => void;
  onDeleteIndividualShareholder: (id: string) => void;
}

export function CompanyStructureView({
  entity,
  onOpenAddSubsidiary,
  onOpenAddCorporateShareholder,
  onOpenAddIndividualShareholder,
  onNavigateToUboWorkspace,
  onDeleteIntermediateShareholder,
  onDeleteIndividualShareholder,
}: CompanyStructureViewProps) {
  const [structureTab, setStructureTab] = useState<'chart' | 'tree' | 'shareholders'>('chart');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <Card padding="md" className="space-y-6">
      {/* Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Company Structure &amp; Ownership Network
            </h2>
            <Badge tone="info" size="sm">
              Multi-Tier
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upstream UBOs &amp; corporate shareholders → Parent holding → Cross-border operating subsidiaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            options={[
              { id: 'chart', label: 'Org Chart' },
              { id: 'tree', label: 'Hierarchical Tree' },
              { id: 'shareholders', label: 'Shareholders Table' },
            ]}
            value={structureTab}
            onChange={(val) => setStructureTab(val as typeof structureTab)}
          />

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAddIndividualShareholder}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              + Individual
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAddCorporateShareholder}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              + Corporate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddSubsidiary}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              + Subsidiary
            </Button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          VIEW 1: ORG CHART
         =================================================================== */}
      {structureTab === 'chart' && (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[920px] p-4 bg-slate-50/50 rounded-xl border border-slate-200/70 space-y-6">
            {/* TIER 1: UPSTREAM SHAREHOLDERS */}
            <div>
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs font-mono">
                  TIER 1 — UPSTREAM SHAREHOLDERS (UBO &amp; CORPORATE)
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {/* Individual Shareholders */}
                {entity.individualShareholders.slice(0, 3).map((ind) => (
                  <div
                    key={ind.id}
                    className="p-3 bg-white rounded-lg border border-emerald-300 shadow-2xs space-y-1.5 hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <Badge tone="success" size="sm">
                        Individual UBO
                      </Badge>
                      <span className="font-mono text-slate-400">{ind.id}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{ind.fullName}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{ind.roleTitle}</p>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-slate-500">Direct: {ind.directSharePercent}%</span>
                      <span className="font-bold text-emerald-700">UBO: {ind.effectiveSharePercent}%</span>
                    </div>
                  </div>
                ))}

                {/* Intermediate Corporate Shareholder */}
                {entity.intermediateShareholders.slice(0, 1).map((sh) => (
                  <div
                    key={sh.id}
                    className="p-3 bg-white rounded-lg border border-indigo-300 shadow-2xs space-y-1.5 hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <Badge tone="corporate" size="sm">
                        Corporate Shareholder
                      </Badge>
                      <span className="font-mono text-slate-400">{sh.id}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{sh.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{sh.jurisdiction}</p>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-slate-500">Voting: {sh.votingRightPercent}%</span>
                      <span className="font-bold text-indigo-700">Share: {sh.sharePercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONNECTOR & VOTING CONTROL PILL */}
            <div className="flex flex-col items-center justify-center my-1">
              <div className="w-0.5 h-4 bg-slate-300" />
              <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold shadow-2xs">
                ▼ 100% Consolidated Shareholding &amp; Voting Control
              </div>
              <div className="w-0.5 h-4 bg-slate-300" />
            </div>

            {/* PARENT COMPANY CARD */}
            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-900 text-white shadow-md border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="info" size="sm" className="font-bold uppercase tracking-wider">
                  Parent Holding Company
                </Badge>
                <span className="text-[11px] font-mono text-slate-400">{entity.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{entity.flag}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{entity.legalName}</h3>
                  <p className="text-[11px] font-mono text-slate-300">Tax ID: {entity.taxId}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300 font-mono tabular-nums">
                <span>Capital: {entity.paidUpCapital}</span>
                <span className="text-emerald-400 font-bold">Score: {entity.aiComplianceScore}/100</span>
              </div>
            </div>

            {/* CONNECTOR TO SUBSIDIARIES */}
            <div className="flex flex-col items-center justify-center my-1">
              <div className="w-0.5 h-4 bg-slate-300" />
              <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold shadow-2xs">
                ▼ Cross-Border Operating Subsidiaries ({entity.structureNodes.length})
              </div>
              <div className="w-0.5 h-4 bg-slate-300" />
            </div>

            {/* TIER 2: DOWNSTREAM SUBSIDIARIES */}
            <div className="grid grid-cols-3 gap-3.5">
              {entity.structureNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-blue-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                      <span>{node.flag}</span>
                      <span className="truncate max-w-[130px]">{node.entityName}</span>
                    </span>
                    <Badge tone="info" size="sm" className="font-mono tabular-nums">
                      {node.directOwnership}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{node.role}</p>

                  {/* Treaty Rate Chip */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-700 font-mono tabular-nums">
                      <span className="text-slate-500">WHT Relief:</span>
                      <span className="font-bold text-blue-700">
                        {node.whtDomesticRate} → {node.whtTreatyRate}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      ✓ {node.treatyFormStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 2: INDENTED HIERARCHICAL TREE
         =================================================================== */}
      {structureTab === 'tree' && (
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-500">
            <span>Entity &amp; Hierarchy Level</span>
            <span>Ownership &amp; Treaty Tags</span>
          </div>

          {/* Level 0: Parent Holding */}
          <div className="space-y-2">
            <div className="p-3 bg-white rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">
                  {entity.flag} {entity.legalName}
                </span>
                <Badge tone="info" size="sm">
                  Ultimate Parent
                </Badge>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">100% Group Control</span>
            </div>

            {/* Level 1: Intermediate Corporate */}
            <div className="pl-6 border-l-2 border-slate-200 space-y-2 ml-3">
              {entity.intermediateShareholders.map((sh) => (
                <div
                  key={sh.id}
                  className="p-2.5 bg-white rounded-lg border border-indigo-200 shadow-2xs flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-semibold text-slate-800">{sh.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({sh.jurisdiction})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums font-bold text-indigo-700">
                      {sh.sharePercent}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                      OECD BEPS Action 6 · Anti-Treaty Shopping
                    </span>
                  </div>
                </div>
              ))}

              {/* Level 2: Subsidiaries */}
              {entity.structureNodes.map((node) => {
                const isCollapsed = collapsedNodes[node.id];
                return (
                  <div key={node.id} className="pl-6 border-l-2 border-slate-200 space-y-1 ml-3">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleNode(node.id)}
                          aria-expanded={!isCollapsed}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>{node.flag}</span>
                        <span className="font-semibold text-slate-900">{node.entityName}</span>
                        <span className="text-[10px] text-slate-500">({node.role})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="font-bold text-slate-800">{node.directOwnership}%</span>
                        <Badge tone="info" size="sm">
                          WHT {node.whtTreatyRate}
                        </Badge>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="ml-6 p-2 rounded bg-slate-50 text-[11px] text-slate-600 border border-slate-200/60 font-mono space-y-0.5">
                        <div>Transfer Pricing: {node.transferPricingMethod}</div>
                        <div>Intercompany: {node.intercompanyTransaction}</div>
                        <div>Form Status: {node.treatyFormStatus}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 3: SHAREHOLDERS TABLE & UBO LINK
         =================================================================== */}
      {structureTab === 'shareholders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <span>
              Detailed UBO declarations, personal tax IDs, and individual dividend optimization are managed in the dedicated workspace.
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToUboWorkspace}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open UBO Workspace
            </Button>
          </div>

          {/* Intermediate Corporate Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Intermediate Corporate Shareholders
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Jurisdiction</th>
                  <th className="py-2.5 px-3">Share %</th>
                  <th className="py-2.5 px-3">BEPS Risk Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entity.intermediateShareholders.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sh.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{sh.jurisdiction}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-slate-800">
                      {sh.sharePercent}%
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        tone={sh.bepsRisk.includes('High') ? 'warning' : 'success'}
                        size="sm"
                      >
                        {sh.bepsRisk}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteIntermediateShareholder(sh.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Individual Shareholders Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Individual Shareholders &amp; UBOs
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Tax Residency</th>
                  <th className="py-2.5 px-3">Direct %</th>
                  <th className="py-2.5 px-3">Effective UBO %</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entity.individualShareholders.map((ind) => (
                  <tr key={ind.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{ind.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{ind.id}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]">
                      {ind.taxResidency}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                      {ind.directSharePercent}%
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-700">
                      {ind.effectiveSharePercent}%
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge tone="success" size="sm">
                        {ind.pepAndSanctionStatus.includes('Safe') ? 'FATF Clear' : 'Review'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteIndividualShareholder(ind.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
