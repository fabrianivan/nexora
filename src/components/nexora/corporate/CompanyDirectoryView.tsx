import React from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { StatCard } from '../primitives/StatCard';
import { CorporateEntity } from '@/types/nexora';

export interface CompanyDirectoryViewProps {
  companies: CorporateEntity[];
  filteredCompanies: CorporateEntity[];
  selectedEntityId: string;
  onSelectCompany: (comp: CorporateEntity) => void;
  onDeleteCompany: (compId: string, compName: string) => void;
  onStartAddNewCompany: () => void;
  companySearch: string;
  setCompanySearch: (val: string) => void;
  entityRoleFilter: 'ALL' | 'PARENT' | 'SUBSIDIARY';
  setEntityRoleFilter: (val: 'ALL' | 'PARENT' | 'SUBSIDIARY') => void;
}

export function CompanyDirectoryView({
  companies,
  filteredCompanies,
  selectedEntityId,
  onSelectCompany,
  onDeleteCompany,
  onStartAddNewCompany,
  companySearch,
  setCompanySearch,
  entityRoleFilter,
  setEntityRoleFilter,
}: CompanyDirectoryViewProps) {
  const activeCount = companies.filter((c) => c.status === 'ACTIVE').length;
  const pendingCount = companies.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Registered Companies"
          value={companies.length}
          helper="Consolidated group entities"
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          tone="brand"
        />
        <StatCard
          label="Active & Compliant"
          value={activeCount}
          helper="OECD & local tax compliant"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          tone="success"
        />
        <StatCard
          label="Review Required"
          value={pendingCount}
          helper="Pending statutory filings"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          tone="warning"
        />
      </div>

      {/* Directory Table Card */}
      <Card padding="none" className="overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Registered Corporate Entities</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredCompanies.length} of {companies.length} companies across 4 jurisdictions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'PARENT', label: 'Parent' },
                  { id: 'SUBSIDIARY', label: 'Subsidiaries' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEntityRoleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    entityRoleFilter === f.id
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs w-48 sm:w-56 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={onStartAddNewCompany}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Entity
            </Button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Registration / Tax ID</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Jurisdiction</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((comp) => {
                const isCurrent = comp.id === selectedEntityId;
                const isParent = comp.parentCompanyId === null;

                return (
                  <tr
                    key={comp.id}
                    onClick={() => onSelectCompany(comp)}
                    className={`transition-colors cursor-pointer ${
                      isCurrent ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {comp.legalName}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {comp.tradeName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                      <span className="font-semibold block text-slate-900">{comp.taxId}</span>
                      <span className="text-[10px] text-slate-400">{comp.registrationNumber}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isParent ? (
                          <Badge tone="info" size="sm">
                            Parent Holding
                          </Badge>
                        ) : (
                          <Badge tone="neutral" size="sm" className="font-mono tabular-nums">
                            {comp.ownershipByParent}% Subsidiary
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {comp.entityType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span className="text-base">{comp.flag}</span>
                        <span>{comp.jurisdictionName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {comp.taxAuthority.split('(')[0].trim()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        tone={comp.status === 'ACTIVE' ? 'success' : 'warning'}
                        dot
                        size="sm"
                      >
                        {comp.status === 'ACTIVE' ? 'Compliant' : 'Review'}
                      </Badge>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCompany(comp)}
                          className="text-xs"
                        >
                          Manage
                        </Button>
                        {!isParent && (
                          <button
                            type="button"
                            onClick={() => onDeleteCompany(comp.id, comp.legalName)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
