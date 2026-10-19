import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  Upload,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { CountryCode } from '@/data/multiCountryTaxData';

export interface CorporateDocument {
  id: string;
  category: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'Verified by Document AI' | 'Pending Review' | 'Anomaly Flagged';
  confidenceScore: number;
  extractedNote: string;
  extractedFields: { key: string; val: string }[];
}

export interface CorporateFormEntity {
  id: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  registrationNumber: string;
  countryCode: CountryCode;
  jurisdictionName: string;
  flag: string;
  entityType: string;
  businessClassification: string;
  fiscalYearEnd: string;
  paidUpCapital: string;
  address: string;
  cityAndPostal: string;
  taxOfficeName: string;
  nitkuOrBranchId: string;
  authorizedTaxOfficer: string;
  documents: CorporateDocument[];
}

export interface CorporateFormAndDocsProps {
  selectedEntity: CorporateFormEntity;
  onUpdateField: (field: string, value: string) => void;
  onUpdateCountry: (code: CountryCode) => void;
  onRunDocAiVerification: () => void;
  isDocAiRunning: boolean;
  onPreviewDoc: (doc: CorporateDocument) => void;
  onSearchEntityByQuery: (query: string) => boolean;
}

export function CorporateFormAndDocs({
  selectedEntity,
  onUpdateField,
  onUpdateCountry,
  onRunDocAiVerification,
  isDocAiRunning,
  onPreviewDoc,
  onSearchEntityByQuery,
}: CorporateFormAndDocsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [inputMode, setInputMode] = useState<'search_existing' | 'manual'>('manual');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = onSearchEntityByQuery(searchQuery.trim());
    setSearchNotFound(!found);
  };

  return (
    <Card padding="md" className="space-y-6">
      {/* Search & Mode Switcher */}
      <div className="space-y-3 pb-4 border-b border-slate-200/80">
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              inputMode === 'manual'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct Input &amp; Registry Form
          </button>
          <button
            type="button"
            onClick={() => setInputMode('search_existing')}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              inputMode === 'search_existing'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Search Existing Registry
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchNotFound) setSearchNotFound(false);
              }}
              placeholder={`Search by Name or Tax ID (e.g. ${selectedEntity.taxId})...`}
              leftIcon={<Search className="w-4 h-4" />}
              isMono
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0"
            leftIcon={<Search className="w-4 h-4" />}
          >
            Search Registry
          </Button>
        </form>

        {searchNotFound && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              Company or Tax ID not found in current group entities registry. Please verify the number or input manually below.
            </span>
          </div>
        )}
      </div>

      {/* Corporate Information Section */}
      <div className="space-y-4">
        <CardHeader
          title="Corporate Information"
          subtitle="Mandatory legal registration data, jurisdiction tax office, and classification."
          action={
            <Badge tone="info" size="sm" className="font-semibold">
              {selectedEntity.flag} {selectedEntity.jurisdictionName} • {selectedEntity.entityType}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left Column (7 stacked fields) */}
          <div className="lg:col-span-6 space-y-3.5">
            <Input
              label="Legal Entity Name"
              value={selectedEntity.legalName}
              onChange={(e) => onUpdateField('legalName', e.target.value)}
            />

            <Input
              label="Trade Name / Brand"
              value={selectedEntity.tradeName}
              onChange={(e) => onUpdateField('tradeName', e.target.value)}
            />

            <Input
              label="Tax Identification Number (NPWP / UEN / TIN / EIN)"
              value={selectedEntity.taxId}
              onChange={(e) => onUpdateField('taxId', e.target.value)}
              isMono
            />

            <Input
              label="Business Registration Number (NIB / AHU / ACRA / SSM)"
              value={selectedEntity.registrationNumber}
              onChange={(e) => onUpdateField('registrationNumber', e.target.value)}
              isMono
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Country &amp; Tax Jurisdiction
              </label>
              <select
                value={selectedEntity.countryCode}
                onChange={(e) => onUpdateCountry(e.target.value as CountryCode)}
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-lg px-3.5 py-2 text-xs shadow-2xs transition outline-none font-medium text-slate-900 cursor-pointer"
              >
                <option value="ID">🇮🇩 Indonesia (DJP Coretax)</option>
                <option value="SG">🇸🇬 Singapore (IRAS InvoiceNow)</option>
                <option value="MY">🇲🇾 Malaysia (LHDN MyInvois)</option>
                <option value="US">🇺🇸 United States (IRS MeF)</option>
              </select>
            </div>

            <Input
              label="Business Classification (KBLI / KLU / SSIC / MSIC)"
              value={selectedEntity.businessClassification}
              onChange={(e) => onUpdateField('businessClassification', e.target.value)}
            />

            <Input
              label="Fiscal Year End &amp; Paid-Up Capital"
              value={`${selectedEntity.fiscalYearEnd} • ${selectedEntity.paidUpCapital}`}
              onChange={(e) => onUpdateField('fiscalYearEnd', e.target.value)}
            />
          </div>

          {/* Right Column (Address + Tax Office + Branch ID) */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Registered Company Address
              </label>
              <textarea
                rows={5}
                value={`${selectedEntity.address}\n${selectedEntity.cityAndPostal}`}
                onChange={(e) => onUpdateField('address', e.target.value)}
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-lg px-3.5 py-2.5 text-xs shadow-2xs transition outline-none text-slate-900 resize-none"
              />
            </div>

            <Input
              label="Designated Tax Office / Authority"
              value={selectedEntity.taxOfficeName}
              onChange={(e) => onUpdateField('taxOfficeName', e.target.value)}
            />

            <Input
              label="NITKU / Branch ID &amp; Authorized Tax Officer"
              value={`${selectedEntity.nitkuOrBranchId} • ${selectedEntity.authorizedTaxOfficer}`}
              onChange={(e) => onUpdateField('nitkuOrBranchId', e.target.value)}
              isMono
            />
          </div>
        </div>
      </div>

      {/* Upload Document Section */}
      <div className="pt-6 border-t border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Statutory Documents &amp; AI Verification
            </h3>
            <p className="text-xs text-slate-500">
              Deed of establishment, tax IDs, and residence certificates extracted via Google Cloud Document AI.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRunDocAiVerification}
            isLoading={isDocAiRunning}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isDocAiRunning ? 'animate-spin' : ''}`} />}
          >
            {isDocAiRunning ? 'Scanning Document AI...' : 'Verify All Documents'}
          </Button>
        </div>

        {/* Progress Bar during Scanning */}
        {isDocAiRunning && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Processing OCR &amp; Entity Matching via Document AI...
              </span>
              <span className="font-mono tabular-nums text-blue-700">92%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={92}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden"
            >
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300 w-[92%]" />
            </div>
          </div>
        )}

        {/* 2-Column Document Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedEntity.documents.map((doc, index) => {
            const isVerified = doc.status === 'Verified by Document AI';
            return (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {index + 1}. {doc.label}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                        {doc.fileName}
                      </p>
                    </div>
                  </div>

                  <Badge tone={isVerified ? 'success' : 'warning'} size="sm">
                    {isVerified ? `✓ ${doc.confidenceScore}% AI Verified` : doc.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-0.5">
                  <span>Size: {doc.fileSize}</span>
                  <span>Updated: {doc.uploadedAt}</span>
                </div>

                {/* Split Action Button [ View | Upload ↑ ] */}
                <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs divide-x divide-slate-200">
                  <button
                    type="button"
                    onClick={() => onPreviewDoc(doc)}
                    className="py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRunDocAiVerification}
                    className="py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                  >
                    <span>Upload</span>
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
