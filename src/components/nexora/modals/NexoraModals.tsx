import React from 'react';
import {
  X,
  ShieldCheck,
  Check,
  ShieldAlert,
  Lock,
  Crown,
  Globe2,
  GitBranch,
} from 'lucide-react';
import { CountryCode } from '@/data/multiCountryTaxData';
import {
  CorporateDocument,
  CorporateEntity,
  SubsidiaryNode,
  IndividualShareholder,
  UserPersona,
} from '@/types/nexora';

export function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: CorporateDocument | null;
  onClose: () => void;
}) {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-600">
              GOOGLE CLOUD DOCUMENT AI • EXTRACTED METADATA
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{doc.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-700">{doc.fileName}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Confidence: {doc.confidenceScore}%
            </span>
          </div>
          <p className="text-slate-600">{doc.extractedNote}</p>
        </div>

        <div className="space-y-2 text-xs">
          <span className="font-bold text-slate-700 block">
            Structured Key-Value Fields Extracted by Document AI:
          </span>
          {doc.extractedFields.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200"
            >
              <span className="text-slate-500 font-medium">{f.key}</span>
              <span className="font-mono font-bold text-slate-900">{f.val}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddSubsidiaryModal({
  isOpen,
  onClose,
  selectedEntity,
  structureModalTab,
  setStructureModalTab,
  newSubName,
  setNewSubName,
  newSubTradeName,
  setNewSubTradeName,
  newSubCountry,
  setNewSubCountry,
  newSubOwnership,
  setNewSubOwnership,
  newSubTaxId,
  setNewSubTaxId,
  newSubRegNo,
  setNewSubRegNo,
  newSubTpMethod,
  setNewSubTpMethod,
  newSubVolume,
  setNewSubVolume,
  newSubFlow,
  setNewSubFlow,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity: CorporateEntity;
  structureModalTab: 'general' | 'tp_tax' | 'individual_ubo';
  setStructureModalTab: (tab: 'general' | 'tp_tax' | 'individual_ubo') => void;
  newSubName: string;
  setNewSubName: (v: string) => void;
  newSubTradeName: string;
  setNewSubTradeName: (v: string) => void;
  newSubCountry: CountryCode;
  setNewSubCountry: (v: CountryCode) => void;
  newSubOwnership: string;
  setNewSubOwnership: (v: string) => void;
  newSubTaxId: string;
  setNewSubTaxId: (v: string) => void;
  newSubRegNo: string;
  setNewSubRegNo: (v: string) => void;
  newSubTpMethod: SubsidiaryNode['transferPricingMethod'];
  setNewSubTpMethod: (v: SubsidiaryNode['transferPricingMethod']) => void;
  newSubVolume: string;
  setNewSubVolume: (v: string) => void;
  newSubFlow: string;
  setNewSubFlow: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase text-blue-600">
              COMPANY STRUCTURE & MULTI-COUNTRY SUBSIDIARIES
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              Company Structure & Subsidiary Details — {selectedEntity.legalName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStructureModalTab('tp_tax')}
            className={`px-5 py-2.5 border-b-2 transition cursor-pointer ${
              structureModalTab === 'tp_tax'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Corporate Subsidiaries (`Company` — {selectedEntity.structureNodes.length})
          </button>
          <button
            type="button"
            onClick={() => setStructureModalTab('individual_ubo')}
            className={`px-5 py-2.5 border-b-2 transition cursor-pointer ${
              structureModalTab === 'individual_ubo'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Individual Shareholders & UBO (`Individual` — {selectedEntity.individualShareholders.length})
          </button>
          <button
            type="button"
            onClick={() => setStructureModalTab('general')}
            className={`px-5 py-2.5 border-b-2 transition cursor-pointer ${
              structureModalTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. + Add New Subsidiary
          </button>
        </div>

        {structureModalTab === 'tp_tax' ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-50 border-b border-blue-200 text-slate-800 font-bold">
                    <th className="py-3 px-4">Entity / Subsidiary</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Jurisdiction</th>
                    <th className="py-3 px-4">Direct / Effective</th>
                    <th className="py-3 px-4">TP Method & Volume</th>
                    <th className="py-3 px-4">WHT Treaty Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedEntity.structureNodes.map((n) => (
                    <tr key={n.id}>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {n.flag} {n.entityName}
                        <span className="block text-[10px] font-mono text-slate-500">{n.taxId}</span>
                      </td>
                      <td className="py-3 px-4 text-blue-600 font-semibold">{n.role}</td>
                      <td className="py-3 px-4">{n.jurisdiction}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {n.directOwnership}% / {n.effectiveOwnership}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block">{n.transferPricingMethod}</span>
                        <span className="text-[11px] text-slate-500">{n.annualIntercompanyVolume}</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">{n.whtTreatyRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : structureModalTab === 'individual_ubo' ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-50 border-b border-emerald-200 text-slate-800 font-bold">
                    <th className="py-3 px-4">Individual Name & Role</th>
                    <th className="py-3 px-4">Tax Residency</th>
                    <th className="py-3 px-4">Direct / UBO %</th>
                    <th className="py-3 px-4">Dividend Tax Regime</th>
                    <th className="py-3 px-4">KYC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedEntity.individualShareholders.map((ind) => (
                    <tr key={ind.id}>
                      <td className="py-3 px-4">
                        <strong className="block text-slate-900">{ind.fullName}</strong>
                        <span className="text-[11px] text-slate-500">{ind.roleTitle}</span>
                      </td>
                      <td className="py-3 px-4">{ind.taxResidency}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {ind.directSharePercent}% / {ind.effectiveSharePercent}%
                      </td>
                      <td className="py-3 px-4 text-[11px] max-w-xs">{ind.dividendTaxRegime}</td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">{ind.kycDocStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Subsidiary Legal Name *
              </label>
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Trade Name / Regional Function *
              </label>
              <input
                type="text"
                value={newSubTradeName}
                onChange={(e) => setNewSubTradeName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Country / Tax Jurisdiction *
              </label>
              <select
                value={newSubCountry}
                onChange={(e) => setNewSubCountry(e.target.value as CountryCode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="ID">🇮🇩 Indonesia (DJP Coretax)</option>
                <option value="SG">🇸🇬 Singapore (IRAS InvoiceNow)</option>
                <option value="MY">🇲🇾 Malaysia (LHDN MyInvois)</option>
                <option value="US">🇺🇸 United States (IRS MeF)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Direct Ownership % by Parent *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newSubOwnership}
                onChange={(e) => setNewSubOwnership(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tax ID (NPWP 16 / UEN / TIN / EIN) *
              </label>
              <input
                type="text"
                value={newSubTaxId}
                onChange={(e) => setNewSubTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Registration Number (NIB / ACRA / SSM / File No) *
              </label>
              <input
                type="text"
                value={newSubRegNo}
                onChange={(e) => setNewSubRegNo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                OECD Transfer Pricing Method *
              </label>
              <select
                value={newSubTpMethod}
                onChange={(e) =>
                  setNewSubTpMethod(e.target.value as SubsidiaryNode['transferPricingMethod'])
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="TNMM (Transactional Net Margin)">
                  TNMM (Transactional Net Margin)
                </option>
                <option value="CUP (Comparable Uncontrolled Price)">
                  CUP (Comparable Uncontrolled Price)
                </option>
                <option value="Cost Plus 8% Markup">Cost Plus 8% Markup</option>
                <option value="Profit Split Method">Profit Split Method</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Annual Intercompany Transaction Volume *
              </label>
              <input
                type="text"
                value={newSubVolume}
                onChange={(e) => setNewSubVolume(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Intercompany Nature (Royalti / Jasa Manajemen / Distribusi) *
              </label>
              <input
                type="text"
                value={newSubFlow}
                onChange={(e) => setNewSubFlow(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition"
              >
                Save Subsidiary to Company Structure
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function AddShareholderModal({
  isOpen,
  onClose,
  selectedEntity,
  shareholderInputMode,
  setShareholderInputMode,
  newShName,
  setNewShName,
  newShRegNo,
  setNewShRegNo,
  newShJurisdiction,
  setNewShJurisdiction,
  newShTaxId,
  setNewShTaxId,
  newShPercent,
  setNewShPercent,
  newShAddress,
  setNewShAddress,
  newShEmail,
  setNewShEmail,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity: CorporateEntity;
  shareholderInputMode: 'search_existing' | 'manual';
  setShareholderInputMode: (v: 'search_existing' | 'manual') => void;
  newShName: string;
  setNewShName: (v: string) => void;
  newShRegNo: string;
  setNewShRegNo: (v: string) => void;
  newShJurisdiction: string;
  setNewShJurisdiction: (v: string) => void;
  newShTaxId: string;
  setNewShTaxId: (v: string) => void;
  newShPercent: string;
  setNewShPercent: (v: string) => void;
  newShAddress: string;
  setNewShAddress: (v: string) => void;
  newShEmail: string;
  setNewShEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase text-blue-600">
              ADD INTERMEDIATE SHAREHOLDER (CORPORATE)
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Add / Edit Intermediate Shareholder — {selectedEntity.legalName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setShareholderInputMode('search_existing')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              shareholderInputMode === 'search_existing'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500'
            }`}
          >
            Search Existing Company
          </button>
          <button
            type="button"
            onClick={() => setShareholderInputMode('manual')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              shareholderInputMode === 'manual'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500'
            }`}
          >
            Manual Input
          </button>
        </div>

        {shareholderInputMode === 'search_existing' && (
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-2 text-xs">
            <span>Pilih dari entitas yang sudah terdaftar di Grup Nusantara untuk mengisi otomatis:</span>
            <button
              type="button"
              onClick={() => {
                setNewShName('Nusantara FinTech Pte. Ltd.');
                setNewShJurisdiction('🇸🇬 Singapore');
                setNewShTaxId('UEN-202319482K');
                setNewShRegNo('ACRA-202319482K');
                setShareholderInputMode('manual');
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold cursor-pointer shrink-0 hover:bg-blue-700 transition"
            >
              Auto-Fill SG Hub
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Shareholder Legal Name *
              </label>
              <input
                type="text"
                value={newShName}
                onChange={(e) => setNewShName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Registration Number (AHU / ACRA / SSM) *
              </label>
              <input
                type="text"
                value={newShRegNo}
                onChange={(e) => setNewShRegNo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tax Jurisdiction *
              </label>
              <input
                type="text"
                value={newShJurisdiction}
                onChange={(e) => setNewShJurisdiction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tax ID (NPWP / UEN / TIN / EIN) *
              </label>
              <input
                type="text"
                value={newShTaxId}
                onChange={(e) => setNewShTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Direct Shareholding (%) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newShPercent}
                onChange={(e) => setNewShPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                value={newShEmail}
                onChange={(e) => setNewShEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Registered Address
              </label>
              <input
                type="text"
                value={newShAddress}
                onChange={(e) => setNewShAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition"
            >
              Save Intermediate Shareholder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddIndividualModal({
  isOpen,
  onClose,
  selectedEntity,
  newIndName,
  setNewIndName,
  newIndType,
  setNewIndType,
  newIndRole,
  setNewIndRole,
  newIndNationality,
  setNewIndNationality,
  newIndResidency,
  setNewIndResidency,
  newIndNationalId,
  setNewIndNationalId,
  newIndTaxId,
  setNewIndTaxId,
  newIndDirectShare,
  setNewIndDirectShare,
  newIndEffectiveShare,
  setNewIndEffectiveShare,
  newIndDividendRegime,
  setNewIndDividendRegime,
  newIndAddress,
  setNewIndAddress,
  newIndEmail,
  setNewIndEmail,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity: CorporateEntity;
  newIndName: string;
  setNewIndName: (v: string) => void;
  newIndType: IndividualShareholder['type'];
  setNewIndType: (v: IndividualShareholder['type']) => void;
  newIndRole: string;
  setNewIndRole: (v: string) => void;
  newIndNationality: string;
  setNewIndNationality: (v: string) => void;
  newIndResidency: string;
  setNewIndResidency: (v: string) => void;
  newIndNationalId: string;
  setNewIndNationalId: (v: string) => void;
  newIndTaxId: string;
  setNewIndTaxId: (v: string) => void;
  newIndDirectShare: string;
  setNewIndDirectShare: (v: string) => void;
  newIndEffectiveShare: string;
  setNewIndEffectiveShare: (v: string) => void;
  newIndDividendRegime: string;
  setNewIndDividendRegime: (v: string) => void;
  newIndAddress: string;
  setNewIndAddress: (v: string) => void;
  newIndEmail: string;
  setNewIndEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase text-emerald-700">
              INDIVIDUAL SHAREHOLDER & BENEFICIAL OWNER (UBO) MANAGEMENT
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Add Individual Shareholder / UBO — {selectedEntity.legalName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={newIndName}
                onChange={(e) => setNewIndName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Shareholder Classification *
              </label>
              <select
                value={newIndType}
                onChange={(e) => setNewIndType(e.target.value as IndividualShareholder['type'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Individual Shareholder (UBO)">
                  Individual Shareholder (UBO)
                </option>
                <option value="Individual Founder / Director">
                  Individual Founder / Director
                </option>
                <option value="Individual Minority Investor">
                  Individual Minority Investor
                </option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Role / Corporate Title
              </label>
              <input
                type="text"
                value={newIndRole}
                onChange={(e) => setNewIndRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nationality
              </label>
              <input
                type="text"
                value={newIndNationality}
                onChange={(e) => setNewIndNationality(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tax Residency
              </label>
              <input
                type="text"
                value={newIndResidency}
                onChange={(e) => setNewIndResidency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Passport / National ID Number
              </label>
              <input
                type="text"
                value={newIndNationalId}
                onChange={(e) => setNewIndNationalId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Personal Tax Identification (TIN)
              </label>
              <input
                type="text"
                value={newIndTaxId}
                onChange={(e) => setNewIndTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Direct Shareholding (%) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newIndDirectShare}
                onChange={(e) => setNewIndDirectShare(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Effective UBO Control (%) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newIndEffectiveShare}
                onChange={(e) => setNewIndEffectiveShare(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={newIndEmail}
                onChange={(e) => setNewIndEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Individual Dividend Tax Regime
              </label>
              <input
                type="text"
                value={newIndDividendRegime}
                onChange={(e) => setNewIndDividendRegime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={newIndAddress}
                onChange={(e) => setNewIndAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition"
            >
              Save Individual UBO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RbacGovernanceModal({
  isOpen,
  onClose,
  personas,
  activePersonaId,
  onSelectPersona,
}: {
  isOpen: boolean;
  onClose: () => void;
  personas: UserPersona[];
  activePersonaId: string;
  onSelectPersona: (p: UserPersona) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3.5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Role-Based Access Control (RBAC) • ISO 27001 &amp; OECD Action 13
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Hak Akses &amp; Peran Karyawan Korporasi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuai standar tata kelola perusahaan internasional, karyawan dengan posisi CEO/setara dari <strong>Perusahaan Induk (Holding)</strong> memiliki visibilitas penuh ke seluruh entitas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {personas.map((persona) => {
            const isActive = persona.id === activePersonaId;
            const isParentExecutive = persona.canViewAll && persona.entityRole === 'PARENT';

            return (
              <div
                key={persona.id}
                onClick={() => onSelectPersona(persona)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isActive
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${persona.avatarBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs mt-0.5`}
                  >
                    {persona.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-extrabold text-slate-900">{persona.name}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isParentExecutive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {persona.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                      {persona.title} • <span className="text-slate-500">{persona.organization}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {persona.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-slate-400">
                      <span className="font-semibold text-slate-600">Izin Akses:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          isParentExecutive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {persona.governanceLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center self-center">
                  {isActive ? (
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">Pilih</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Standar Tata Kelola Perusahaan Internasional:</strong>
            <p className="text-slate-500 mt-0.5">
              Berdasarkan standar <em>OECD Action 13 (Country-by-Country Reporting)</em> dan <em>ISO/IEC 27001 Access Control</em>, data keuangan dan dokumen anak usaha terpisah secara yurisdiksi. Hanya pemegang wewenang eksekutif induk (CEO/CFO) yang diotorisasi mengonsolidasi seluruh anak usaha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RestrictedNoticeModal({
  entity,
  activePersona,
  onClose,
  onSwitchToCeo,
}: {
  entity: CorporateEntity | null;
  activePersona: UserPersona;
  onClose: () => void;
  onSwitchToCeo: () => void;
}) {
  if (!entity) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>

        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            Akses Terbatas • Standar Tata Kelola ISO 27001
          </span>
          <h3 className="text-base font-extrabold text-slate-900">
            Memerlukan Otorisasi CEO Perusahaan Induk
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Anda sedang masuk sebagai <strong className="text-slate-900">{activePersona.name} ({activePersona.title})</strong>. Sesuai standar tata kelola perusahaan internasional, akses ke entitas <strong>{entity.flag} {entity.legalName}</strong> hanya diberikan kepada karyawan dengan posisi <strong>CEO atau setara dari Perusahaan Induk (PT Nusantara Kreasi Digital Tbk)</strong>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Entitas Sasaran:</span>
            <span className="font-bold text-slate-900">{entity.legalName}</span>
          </div>
          <div className="flex justify-between">
            <span>Yurisdiksi:</span>
            <span className="font-semibold text-slate-800">{entity.jurisdictionName}</span>
          </div>
          <div className="flex justify-between">
            <span>Hak Akses Minimal:</span>
            <span className="font-bold text-blue-600">Group CEO / Holding C-Level</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onSwitchToCeo}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>Masuk sebagai Group CEO</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsolidationModal({
  isOpen,
  onClose,
  companies,
  onSelectEntity,
}: {
  isOpen: boolean;
  onClose: () => void;
  companies: CorporateEntity[];
  onSelectEntity: (c: CorporateEntity) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 border border-blue-200">
                Executive Consolidated Portal • OECD BEPS Action 13 CbCR
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                👑 Hak Akses Group CEO Aktif
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-blue-600" />
              Konsolidasi Seluruh Grup — PT Nusantara Kreasi Digital Tbk &amp; 3 Anak Usaha
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ikhtisar keuangan fiskal, kepatuhan multi-yurisdiksi, dan optimasi <em>Tax Treaty (P3B/DTA)</em> grup internasional.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Total Omzet Konsolidasi Grup
            </span>
            <span className="text-lg font-black text-slate-900 block font-mono">
              Rp 9.840.000.000
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
              ↑ 14.8% YoY (ID, SG, MY, US)
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Total Pajak Dibayar (YTD)
            </span>
            <span className="text-lg font-black text-slate-900 block font-mono">
              Rp 1.482.500.000
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Coretax, IRAS, LHDN &amp; IRS
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Penghematan Tax Treaty (DTA)
            </span>
            <span className="text-lg font-black text-blue-600 block font-mono">
              Rp 520.400.000
            </span>
            <span className="text-[10px] text-blue-700 font-semibold mt-1 block">
              ✓ Validasi e-SKD &amp; Form DGT
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Skor Kepatuhan Grup AI
            </span>
            <span className="text-lg font-black text-emerald-600 block">
              87.5 / 100
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
              ✓ Kategori Rendah Risiko Audit
            </span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800">
              Daftar Entitas Grup Terkonsolidasi (1 Induk + 3 Anak Usaha)
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              OECD Master File &amp; Local File Standard
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-3">Entitas</th>
                  <th className="py-2.5 px-3">Peran Korporasi</th>
                  <th className="py-2.5 px-3">Kepemilikan</th>
                  <th className="py-2.5 px-3">Tax ID &amp; Otoritas</th>
                  <th className="py-2.5 px-3">Mata Uang</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => {
                  const isParent = c.parentCompanyId === null;
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.flag}</span>
                          <div>
                            <span>{c.legalName}</span>
                            <span className="block text-[10px] font-normal text-slate-500">
                              {c.jurisdictionName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isParent ? (
                          <span className="px-2 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800">
                            Induk Holding HQ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            Anak Usaha ({c.ownershipByParent}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {isParent ? '100% Control' : `${c.ownershipByParent}% Saham Induk`}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {c.taxId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {c.functionalCurrency.split(' ')[0]}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEntity(c);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          Buka Entitas →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
          <h4 className="font-extrabold text-blue-600 flex items-center gap-1.5">
            <GitBranch className="w-4 h-4" />
            Matriks Transaksi Afiliasi Lintas Negara (Cross-Border Transfer Pricing)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <span className="font-bold text-slate-900 block">🇮🇩 ID ↔ 🇸🇬 SG (Royalti &amp; IP AI)</span>
              <p className="text-slate-600">
                Metode: <strong>CUP Method</strong>. Tarif P3B 10% (Normal 20%) didukung Form DGT &amp; COR IRAS.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <span className="font-bold text-slate-900 block">🇸🇬 SG ↔ 🇲🇾 MY (Distribusi SaaS)</span>
              <p className="text-slate-600">
                Metode: <strong>Cost Plus 8%</strong>. Alokasi laba terdistribusi sesuai fungsi operasional ASEAN.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <span className="font-bold text-slate-900 block">🇺🇸 US ↔ 🇮🇩 ID (Kontrak Cloud/AI)</span>
              <p className="text-slate-600">
                Metode: <strong>TNMM</strong>. Form W-8BEN-E &amp; IRC §482 verified, bebas backup withholding 24%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
