import { CountryCode } from '@/data/multiCountryTaxData';

export type PrimaryNav = 'companies' | 'calculation' | 'tax_return' | 'payment';
export type SubNav = 'corporate' | 'individual' | 'studies' | 'calendar' | 'reports';
export type CorporateViewTab =
  | 'all_in_one'
  | 'directory'
  | 'corporate_form'
  | 'subsidiaries_tree'
  | 'shareholders'
  | 'individual_shareholders';

export interface UserPersona {
  id: string;
  name: string;
  title: string;
  entityRole: 'PARENT' | 'SUBSIDIARY';
  organization: string;
  avatarInitials: string;
  avatarBg: string;
  badge: string;
  canViewAll: boolean;
  accessibleEntityIds: string[];
  governanceLevel: string;
  description: string;
}

export interface IndividualShareholder {
  id: string;
  type: 'Individual Shareholder (UBO)' | 'Individual Founder / Director' | 'Individual Minority Investor';
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
  pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)' | 'Enhanced Due Diligence (PEP)';
  kycDocStatus: 'Verified by Document AI' | 'Pending Review';
  status: 'Active' | 'Under Review';
  address: string;
  email: string;
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
  bepsRisk: 'Low (Substantial Activity)' | 'High (Conduit / Treaty Shopping Risk)';
  address: string;
  contactEmail: string;
}

export interface SubsidiaryNode {
  id: string;
  entityName: string;
  tradeName: string;
  role: 'Ultimate Parent' | 'Direct Subsidiary (Anak Perusahaan)' | 'Tier-2 Subsidiary (Cucu Perusahaan)' | 'Regional IP Hub';
  countryCode: CountryCode;
  flag: string;
  jurisdiction: string;
  taxId: string;
  registrationNo: string;
  directOwnership: number;
  effectiveOwnership: number;
  functionalCurrency: string;
  transferPricingMethod: 'TNMM (Transactional Net Margin)' | 'CUP (Comparable Uncontrolled Price)' | 'Cost Plus 8% Markup' | 'Profit Split Method';
  intercompanyTransaction: string;
  annualIntercompanyVolume: string;
  whtDomesticRate: string;
  whtTreatyRate: string;
  treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)' | 'Pending Renewal';
  complianceScore: number;
}

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

export interface CorporateEntity {
  id: string;
  legalName: string;
  tradeName: string;
  parentCompanyId: string | null;
  parentCompanyName: string;
  ownershipByParent: number;
  registrationNumber: string;
  taxId: string;
  nitkuOrBranchId: string;
  incorporationDate: string;
  entityType: 'Parent Holding Company' | 'Subsidiary (Anak Perusahaan)' | 'Regional Hub Subsidiary' | 'Foreign Operating Subsidiary';
  countryCode: CountryCode;
  jurisdictionName: string;
  flag: string;
  fiscalYearEnd: string;
  functionalCurrency: string;
  paidUpCapital: string;
  businessClassification: string;
  taxOfficeName: string;
  address: string;
  cityAndPostal: string;
  authorizedTaxOfficer: string;
  intercompanyRole: string;
  taxAuthority: string;
  status: 'ACTIVE' | 'PENDING';
  aiComplianceScore: number;
  documents: CorporateDocument[];
  structureNodes: SubsidiaryNode[];
  intermediateShareholders: IntermediateShareholder[];
  individualShareholders: IndividualShareholder[];
}
