import React from 'react';
import { Crown, Building2, ShieldCheck, Lock, Globe2 } from 'lucide-react';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';

export interface GroupSummaryEntity {
  id: string;
  flag: string;
  countryCode: string;
  jurisdictionName: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  taxAuthority: string;
  parentCompanyId: string | null;
  ownershipByParent: number;
  status: 'ACTIVE' | 'PENDING';
  aiComplianceScore: number;
}

export interface GroupSummaryCardsProps {
  companies: GroupSummaryEntity[];
  selectedEntityId: string;
  onSelectEntity: (comp: GroupSummaryEntity) => void;
  isGroupCeoOrParentExecutive: boolean;
  activePersonaTitle: string;
  canViewAll: boolean;
  accessibleEntityIds: string[];
  onOpenConsolidationModal: () => void;
  onSwitchToCeoMode?: () => void;
}

export function GroupSummaryCards({
  companies,
  selectedEntityId,
  onSelectEntity,
  isGroupCeoOrParentExecutive,
  activePersonaTitle,
  canViewAll,
  accessibleEntityIds,
  onOpenConsolidationModal,
  onSwitchToCeoMode,
}: GroupSummaryCardsProps) {
  return (
    <div className="space-y-3.5">
      {/* Top Header Row: Group Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              OECD Pillar Two &amp; ISO 27001 Access Governance
            </span>
            <Badge tone="success" dot size="sm">
              Multi-Entity Consolidated Control
            </Badge>
            <span className="text-[10px] font-mono tabular-nums text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              1 Parent + 3 Subsidiaries
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Group Entities &amp; Cross-Border Governance
          </h2>
          <p className="text-xs text-slate-500">
            Consolidated oversight across Indonesia, Singapore, Malaysia, and the United States.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenConsolidationModal}
            leftIcon={<Globe2 className="w-4 h-4 text-blue-600" />}
          >
            Consolidated Overview
          </Button>
        </div>
      </div>

      {/* Access Policy Notification Banner (Clean & Subtle) */}
      <div
        className={`px-3.5 py-2 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
          isGroupCeoOrParentExecutive
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            : 'bg-amber-50/70 border-amber-200 text-amber-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {isGroupCeoOrParentExecutive ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            {isGroupCeoOrParentExecutive ? (
              <>
                <strong className="font-semibold">Executive Access Verified:</strong> Group CEO scope grants 100% full visibility across holding and all multi-country subsidiaries.
              </>
            ) : (
              <>
                <strong className="font-semibold">Jurisdiction Segregation Active:</strong> Signed in as <span className="underline font-semibold">{activePersonaTitle}</span>. Other jurisdictions are restricted under ISO 27001.
              </>
            )}
          </span>
        </div>

        {!isGroupCeoOrParentExecutive && onSwitchToCeoMode && (
          <button
            type="button"
            onClick={onSwitchToCeoMode}
            className="text-[11px] font-semibold text-amber-900 hover:underline cursor-pointer"
          >
            Switch to Group CEO Mode →
          </button>
        )}
      </div>

      {/* 4 Multi-Country Entity Cards (Surface White) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {companies.map((comp) => {
          const isSelected = comp.id === selectedEntityId;
          const isAccessible = canViewAll || accessibleEntityIds.includes(comp.id);
          const isParent = comp.parentCompanyId === null;

          return (
            <Card
              key={comp.id}
              onClick={() => onSelectEntity(comp)}
              padding="sm"
              className={`relative cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                  : isAccessible
                  ? 'hover:border-slate-400 hover:shadow-xs'
                  : 'opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl leading-none">{comp.flag}</span>
                    <span className="text-xs font-bold text-slate-700 font-mono tracking-tight">
                      {comp.countryCode}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[80px]">
                      {comp.jurisdictionName}
                    </span>
                  </div>

                  {isParent ? (
                    <Badge tone="info" size="sm" className="font-bold">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Parent
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="sm" className="font-mono tabular-nums">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {comp.ownershipByParent}%
                    </Badge>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                  {comp.legalName}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                  {comp.tradeName}
                </p>

                <div className="space-y-1 mb-2.5 text-[10px]">
                  <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200/60 font-mono tabular-nums">
                    <span className="text-slate-400">Tax ID:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                      {comp.taxId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 px-0.5">
                    <span>Authority:</span>
                    <span className="truncate max-w-[140px]">
                      {comp.taxAuthority.split('(')[0].trim()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="text-slate-500">Score:</span>
                  <span className="font-bold text-slate-900">
                    {comp.aiComplianceScore}/100
                  </span>
                </div>

                <Badge
                  tone={comp.status === 'ACTIVE' ? 'success' : 'warning'}
                  dot
                  size="sm"
                >
                  {comp.status === 'ACTIVE' ? 'Compliant' : 'Review'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
