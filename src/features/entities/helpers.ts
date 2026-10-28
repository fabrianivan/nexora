import type {
  CorporateDocument,
  CorporateEntity,
  IndividualShareholder,
  IntermediateShareholder,
  SubsidiaryNode,
} from '@/data/entities';
import { MULTI_COUNTRY_DATA, type CountryCode } from '@/data/multiCountryTaxData';

export const COUNTRIES: CountryCode[] = ['ID', 'SG', 'MY', 'US'];

export const TAX_ID_LABEL: Record<CountryCode, string> = {
  ID: 'NPWP (16 digit)',
  SG: 'UEN',
  MY: 'TIN (LHDN)',
  US: 'EIN',
};

export const TAX_ID_PLACEHOLDER: Record<CountryCode, string> = {
  ID: '0013948214012000',
  SG: '202319482K',
  MY: 'C25849102090',
  US: '88-4920193',
};

const REQUIRED_DOCS: { category: string; label: string }[] = [
  { category: 'Deed of Establishment', label: 'Akta pendirian / Certificate of Incorporation' },
  { category: 'Shareholder Structure', label: 'Daftar pemegang saham & pemilik manfaat' },
  { category: 'Tax ID', label: 'Sertifikat identitas pajak' },
  { category: 'Transfer Pricing Local File', label: 'Dokumentasi transfer pricing (Local File)' },
];

export function blankDocuments(prefix: string): CorporateDocument[] {
  return REQUIRED_DOCS.map((d, i) => ({
    id: `${prefix}-DOC-${i + 1}`,
    category: d.category,
    label: d.label,
    fileName: '',
    fileSize: '',
    uploadedAt: '',
    status: 'Pending Review',
    confidenceScore: 0,
    extractedNote: 'Belum diunggah.',
    extractedFields: [],
  }));
}

export interface NewEntityInput {
  legalName: string;
  tradeName: string;
  country: CountryCode;
  taxId: string;
  registrationNumber: string;
  address: string;
  parentId: string | null;
  ownership: number;
}

export function createEntity(input: NewEntityInput, parent?: CorporateEntity): CorporateEntity {
  const meta = MULTI_COUNTRY_DATA[input.country];
  const id = `ENT-${input.country}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  return {
    id,
    legalName: input.legalName.trim(),
    tradeName: input.tradeName.trim() || input.legalName.trim(),
    parentCompanyId: input.parentId,
    parentCompanyName: parent ? parent.legalName : 'Ultimate Parent Entity (Induk Grup)',
    ownershipByParent: input.parentId ? input.ownership : 100,
    registrationNumber: input.registrationNumber.trim(),
    taxId: input.taxId.trim(),
    nitkuOrBranchId: '',
    incorporationDate: new Date().toISOString().slice(0, 10),
    entityType: input.parentId ? (input.country === 'ID' ? 'Subsidiary (Anak Perusahaan)' : 'Foreign Operating Subsidiary') : 'Parent Holding Company',
    countryCode: input.country,
    jurisdictionName: meta.name,
    flag: meta.flag,
    fiscalYearEnd: '31 December (Jan – Dec)',
    functionalCurrency: meta.currencyCode,
    paidUpCapital: '',
    taxOfficeName: '',
    address: input.address.trim(),
    cityAndPostal: '',
    authorizedTaxOfficer: '',
    officerPosition: '',
    contactEmail: '',
    contactPhone: '',
    businessClassification: '',
    taxAuthority: meta.authorityFull,
    vatOrGstStatus: meta.indirectTaxName,
    status: 'PENDING',
    aiComplianceScore: 60,
    intercompanyRole: parent ? `Anak usaha ${input.ownership}% ${parent.legalName}` : 'Induk grup',
    documents: blankDocuments(id),
    structureNodes: [],
    intermediateShareholders: [],
    individualShareholders: [],
  };
}

export function subsidiaryNodeFor(child: CorporateEntity, parent: CorporateEntity, extra: Partial<SubsidiaryNode> = {}): SubsidiaryNode {
  const meta = MULTI_COUNTRY_DATA[child.countryCode];
  return {
    id: `NODE-${child.id}`,
    entityName: child.legalName,
    tradeName: child.tradeName,
    role: 'Direct Subsidiary (Anak Perusahaan)',
    countryCode: child.countryCode,
    flag: child.flag,
    jurisdiction: `${meta.name} (${meta.authorityShort})`,
    taxId: child.taxId,
    registrationNo: child.registrationNumber,
    directOwnership: child.ownershipByParent,
    effectiveOwnership: Math.round(child.ownershipByParent * ((parent.ownershipByParent || 100) / 100)),
    functionalCurrency: meta.currencyCode,
    transferPricingMethod: 'TNMM (Transactional Net Margin)',
    intercompanyTransaction: 'Jasa manajemen & lisensi software',
    annualIntercompanyVolume: '-',
    whtDomesticRate: meta.crossBorderTreatyNote.standardWhtRate,
    whtTreatyRate: meta.crossBorderTreatyNote.treatyWhtRate,
    treatyFormStatus: 'Pending Renewal',
    complianceScore: 80,
    ...extra,
  };
}

export function emptyCorporateShareholder(): IntermediateShareholder {
  return {
    id: `SH-${Date.now().toString(36).toUpperCase()}`,
    type: 'Corporate Shareholder',
    name: '',
    registrationNo: '',
    jurisdiction: '🇸🇬 Singapore',
    taxId: '',
    sharePercent: 10,
    votingRightPercent: 10,
    effectiveDate: new Date().toISOString().slice(0, 10),
    status: 'Under Review',
    bepsRisk: 'Low (Substantial Activity)',
    address: '',
    contactEmail: '',
  };
}

export function emptyIndividual(): IndividualShareholder {
  return {
    id: `IND-${Date.now().toString(36).toUpperCase()}`,
    type: 'Individual Shareholder (UBO)',
    fullName: '',
    roleTitle: '',
    nationality: '🇮🇩 Indonesia',
    taxResidency: '🇮🇩 Indonesia',
    nationalIdOrPassport: '',
    personalTaxId: '',
    directSharePercent: 0,
    effectiveSharePercent: 0,
    votingRightPercent: 0,
    dividendTaxRegime: 'PPh Final 10% (Pasal 4 ayat 2) atau dikecualikan bila diinvestasikan kembali',
    pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
    kycDocStatus: 'Pending Review',
    status: 'Under Review',
    address: '',
    email: '',
  };
}

/** Light validation of a tax id by country (mirrors lib/domain patterns, tolerant of suffix text). */
export function validTaxId(country: CountryCode, raw: string): boolean {
  const v = raw.split('(')[0].replace(/[ .]/g, '').trim();
  const patterns: Record<CountryCode, RegExp> = {
    ID: /^\d{15,16}$/,
    SG: /^(?:\d{8,9}[A-Z]|[STFG]\d{7}[A-Z])$/i,
    MY: /^[A-Z]{1,2}\d{8,12}$/i,
    US: /^\d{2}-?\d{7}$/,
  };
  return patterns[country].test(v);
}

export function docStatusTone(status: CorporateDocument['status']): 'success' | 'warning' | 'danger' {
  return status === 'Verified by Document AI' ? 'success' : status === 'Anomaly Flagged' ? 'danger' : 'warning';
}

export function docStatusLabel(status: CorporateDocument['status']): string {
  return status === 'Verified by Document AI' ? 'Terverifikasi' : status === 'Anomaly Flagged' ? 'Anomali' : 'Perlu review';
}
