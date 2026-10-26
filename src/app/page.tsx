'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  BookOpen,
  X,
  Bot,
  Send,
  RefreshCw,
  ShieldCheck,
  Globe2,
  Trash2,
  Minimize2,
  Maximize2,
  Check,
  UserCheck,
  GitBranch,
  Lock,
  Crown,
  ShieldAlert,
  ChevronDown,
  ArrowLeft,
  Bell,
} from 'lucide-react';
import {
  MULTI_COUNTRY_DATA,
  CountryCode,
} from '@/data/multiCountryTaxData';
import { parseBlockMarkdown, renderInlines } from '@/lib/chatMarkdown';
import { HeroStepper } from '@/components/HeroStepper';
import { CalculationTab } from '@/components/CalculationTab';
import { TaxReturnTab } from '@/components/TaxReturnTab';
import { PaymentTab } from '@/components/PaymentTab';
import { IndividualShareholdersTab } from '@/components/IndividualShareholdersTab';
import { StudiesTab } from '@/components/StudiesTab';
import { TaxCalendarTab } from '@/components/TaxCalendarTab';
import { ReportsTab } from '@/components/ReportsTab';
import { CommandPalette } from '@/components/CommandPalette';
import { NotificationCenter } from '@/components/NotificationCenter';
import { DataPersistenceControl } from '@/components/DataPersistenceControl';

type PrimaryNav = 'companies' | 'calculation' | 'tax_return' | 'payment';
type SubNav = 'corporate' | 'individual' | 'studies' | 'calendar' | 'reports';
type CorporateViewTab =
  | 'all_in_one'
  | 'directory'
  | 'corporate_form'
  | 'subsidiaries_tree'
  | 'shareholders'
  | 'individual_shareholders';

// =====================================================================
// INTERNATIONAL STANDARD RBAC & MULTI-ENTITY ACCESS GOVERNANCE
// Sesuai standar tata kelola korporasi internasional (ISO 27001 & OECD Pillar Two CbCR):
// Posisi CEO/C-Level dari Perusahaan Induk memiliki hak akses universal ke seluruh entitas.
// Karyawan anak perusahaan dibatasi pada yurisdiksi masing-masing.
// =====================================================================
interface UserPersona {
  id: string;
  name: string;
  title: string;
  entityRole: 'PARENT' | 'SUBSIDIARY';
  organization: string;
  email: string;
  jurisdiction: string;
  avatarInitials: string;
  avatarBg: string;
  badge: string;
  canViewAll: boolean;
  accessibleEntityIds: string[];
  governanceLevel: string;
  description: string;
  complianceStatus: string;
}

const USER_PERSONAS: UserPersona[] = [
  {
    id: 'ceo_parent',
    name: 'Ir. Aditya Pratama, M.Sc.',
    title: 'Group Chief Executive Officer (CEO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    email: 'aditya.pratama@nusantara-holding.com',
    jurisdiction: '🇮🇩 Indonesia (Ultimate Parent Entity - UPE)',
    avatarInitials: 'AP',
    avatarBg: 'bg-emerald-600',
    badge: '👑 Group CEO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Unrestricted Multinational Holding Scope)',
    description: 'CEO Perusahaan Induk — Memiliki hak akses universal (Global Scope) sesuai standar enterprise internasional untuk mengaudit, mengonsolidasi, dan melihat seluruh data Induk & 3 Anak Usaha (ID, SG, MY, US).',
    complianceStatus: 'ISO 27001 Annex A.9 Compliant • OECD Action 13 UPE Master Authority',
  },
  {
    id: 'cfo_parent',
    name: 'Sri Mulyani Dewi, S.E., Ak., CA',
    title: 'Group Chief Financial Officer (CFO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    email: 'sri.mulyani@nusantara-holding.com',
    jurisdiction: '🇮🇩 Indonesia (Ultimate Parent Entity - UPE)',
    avatarInitials: 'SM',
    avatarBg: 'bg-blue-600',
    badge: '💼 Group CFO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Group Fiscal & BEPS Consolidation)',
    description: 'CFO Perusahaan Induk — Setara dengan CEO dalam pengawasan keuangan fiskal konsolidasi, transfer pricing lintas negara, dan kepatuhan audit grup.',
    complianceStatus: 'OECD Action 13 CbCR Lead • ISO 27001 Financial Auditor',
  },
  {
    id: 'md_sg',
    name: 'Marcus Tan, CFA',
    title: 'Managing Director — Singapore Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara FinTech Pte. Ltd. (Singapura)',
    email: 'marcus.tan@nusantara-sg.com',
    jurisdiction: '🇸🇬 Singapura (Constituent Entity)',
    avatarInitials: 'MT',
    avatarBg: 'bg-purple-600',
    badge: '🇸🇬 Director SG (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-SG-002'],
    governanceLevel: 'Level 2 (Single Entity — Singapore IRAS Only)',
    description: 'Karyawan Anak Usaha Singapura — Hanya memiliki hak akses internal Nusantara FinTech Pte. Ltd. Entitas lain dikunci sesuai segregasi tugas ISO 27001.',
    complianceStatus: 'ISO 27001 Segregated Scope • Singapore IRAS Constituent',
  },
  {
    id: 'dir_my',
    name: 'Ahmad Razak, CA (M)',
    title: 'Country Director — Malaysia Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara Digital Solutions Sdn. Bhd. (Malaysia)',
    email: 'ahmad.razak@nusantara-my.com',
    jurisdiction: '🇲🇾 Malaysia (Constituent Entity)',
    avatarInitials: 'AR',
    avatarBg: 'bg-amber-600',
    badge: '🇲🇾 Director MY (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-MY-003'],
    governanceLevel: 'Level 2 (Single Entity — Malaysia LHDN Only)',
    description: 'Karyawan Anak Usaha Malaysia — Akses dibatasi pada entitas lokal Malaysia.',
    complianceStatus: 'ISO 27001 Segregated Scope • Malaysia LHDN Constituent',
  },
  {
    id: 'ctrl_us',
    name: 'Sarah Jenkins, CPA',
    title: 'VP Finance & Controller — US Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara AI Technologies, Inc. (Amerika Serikat)',
    email: 'sarah.jenkins@nusantara-ai.com',
    jurisdiction: '🇺🇸 Amerika Serikat (Constituent Entity)',
    avatarInitials: 'SJ',
    avatarBg: 'bg-rose-600',
    badge: '🇺🇸 Controller US (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-US-004'],
    governanceLevel: 'Level 2 (Single Entity — US IRS Only)',
    description: 'Karyawan Anak Usaha Amerika Serikat — Akses dibatasi pada entitas lokal AS.',
    complianceStatus: 'ISO 27001 Segregated Scope • US IRS Constituent',
  },
];

interface IndividualShareholder {
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

interface IntermediateShareholder {
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

interface SubsidiaryNode {
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

interface CorporateDocument {
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

interface CorporateEntity {
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
  taxOfficeName: string;
  address: string;
  cityAndPostal: string;
  authorizedTaxOfficer: string;
  officerPosition: string;
  contactEmail: string;
  contactPhone: string;
  businessClassification: string;
  taxAuthority: string;
  vatOrGstStatus: string;
  status: 'ACTIVE' | 'PENDING';
  aiComplianceScore: number;
  intercompanyRole: string;
  documents: CorporateDocument[];
  structureNodes: SubsidiaryNode[];
  intermediateShareholders: IntermediateShareholder[];
  individualShareholders: IndividualShareholder[];
}

const INITIAL_COMPANIES: CorporateEntity[] = [
  {
    id: 'ENT-ID-001',
    legalName: 'PT Nusantara Kreasi Digital Tbk',
    tradeName: 'Nusantara Group HQ (Parent Holding)',
    parentCompanyId: null,
    parentCompanyName: 'Ultimate Parent Entity (Induk Grup)',
    ownershipByParent: 100,
    registrationNumber: 'NIB-9120301928371 / AHU-0049182.AH.01.01',
    taxId: '0013948214012000 (NPWP 16 Digit)',
    nitkuOrBranchId: '0013948214012000000000 (NITKU 22 Digit)',
    incorporationDate: '2018-03-14',
    entityType: 'Parent Holding Company',
    countryCode: 'ID',
    jurisdictionName: 'Indonesia',
    flag: '🇮🇩',
    fiscalYearEnd: '31 December (Jan – Dec)',
    functionalCurrency: 'IDR (Indonesian Rupiah)',
    paidUpCapital: 'Rp 25.000.000.000',
    taxOfficeName: 'KPP Madya Jakarta Selatan I (Coretax DJP)',
    address: 'Jl. Jend. Sudirman Kav. 52-53, District 8 SCBD Treasury Tower Lt. 28',
    cityAndPostal: 'Jakarta Selatan, DKI Jakarta 12190, Indonesia',
    authorizedTaxOfficer: 'Budi Santoso, S.E., Ak., CA., BKP',
    officerPosition: 'VP of Global Tax & Fiscal Compliance (Kuasa Wajib Pajak)',
    contactEmail: 'tax.compliance@nusantaradigital.co.id',
    contactPhone: '+62 21 5088 9910',
    businessClassification: 'KLU 62019 — Aktivitas Pemrograman Komputer, AI & Holding FinTech',
    taxAuthority: 'Direktorat Jenderal Pajak (Coretax DJP)',
    vatOrGstStatus: 'PKP Aktif (PPN 11% • e-Faktur 4.0 Coretax)',
    status: 'ACTIVE',
    aiComplianceScore: 88,
    intercompanyRole: 'Induk Grup (Ultimate Parent) • Mengonsolidasi 3 Anak Perusahaan di Singapura, Malaysia, dan AS',
    documents: [
      {
        id: 'DOC-1',
        category: 'Deed of Establishment',
        label: 'Deed of Establishment (Akta Pendirian & SK Kemenkumham RI)',
        fileName: 'akta_pendirian_pt_nkd_ahu_2026.pdf',
        fileSize: '4.2 MB',
        uploadedAt: '12 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.6,
        extractedNote: 'SK AHU-0049182.AH.01.01 Valid • Modal Ditempatkan Rp 25 Miliar • Susunan Direksi Sesuai',
        extractedFields: [
          { key: 'Nomor SK AHU', val: 'AHU-0049182.AH.01.01.Tahun 2026' },
          { key: 'Notaris', val: 'Dr. Hendra Wijaya, S.H., M.Kn. (Jakarta Selatan)' },
          { key: 'Modal Dasar / Disetor', val: 'Rp 100.000.000.000 / Rp 25.000.000.000' },
          { key: 'KBLI / KLU Utama', val: '62019 — Aktivitas Pemrograman Komputer Lainnya' },
        ],
      },
      {
        id: 'DOC-2',
        category: 'Shareholder Structure',
        label: 'Shareholder Structure & Beneficial Ownership (Daftar Pemegang Saham & BO)',
        fileName: 'daftar_pemegang_saham_bo_kemenkumham.pdf',
        fileSize: '2.8 MB',
        uploadedAt: '14 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.1,
        extractedNote: '3 Intermediate Shareholders Terdaftar • Pelaporan Beneficial Owner Perpres 13/2018 Patuh',
        extractedFields: [
          { key: 'Pemegang Saham 1', val: 'Merdeka Kapital Nusantara Tbk (45% — Indonesia)' },
          { key: 'Pemegang Saham 2', val: 'Archipelago Ventures Holding Pte. Ltd. (35% — Singapura)' },
          { key: 'Pemegang Saham 3', val: 'BlueHorizon Pacific Partners LP (20% — Amerika Serikat)' },
          { key: 'Ultimate Beneficial Owner', val: 'Terverifikasi (Tidak Ada Entitas Blacklist FATF)' },
        ],
      },
      {
        id: 'DOC-3',
        category: 'Financial Statement',
        label: 'Audited Consolidated Financial Statement & Fiscal Trial Balance',
        fileName: 'audited_fs_consolidated_nkd_fy2026.pdf',
        fileSize: '8.5 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.4,
        extractedNote: 'KAP Tanudiredja • Omzet Domestik Rp 4,65 Miliar • Laba Fiskal Rp 963,35 Juta (Wajar Tanpa Pengecualian)',
        extractedFields: [
          { key: 'Pendapatan Usaha (Komersial)', val: 'Rp 4.650.000.000' },
          { key: 'Laba Bersih Komersial', val: 'Rp 1.077.500.000' },
          { key: 'Koreksi Fiskal Positif / Negatif', val: '+Rp 250.850.000 / -Rp 365.000.000' },
          { key: 'Penghasilan Kena Pajak (Laba Fiskal)', val: 'Rp 963.350.000' },
        ],
      },
      {
        id: 'DOC-4',
        category: 'Previous Year Tax Return',
        label: 'Previous Year Tax Return & Transfer Pricing Doc (SPT Tahunan PPh Badan 1771 & TP Doc)',
        fileName: 'spt_1771_tp_local_master_file_pmk172.pdf',
        fileSize: '6.1 MB',
        uploadedAt: '17 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 98.9,
        extractedNote: 'BPE Coretax Valid • Ikhtisar Dokumen Induk & Lokal PMK 172/2023 Lengkap • Form DGT Anak Usaha SG Aktif',
        extractedFields: [
          { key: 'Nomor BPE SPT Tahunan', val: 'NTTE-88291049182736192831' },
          { key: 'Status SPT', val: 'Nihil (Kredit Pajak PPh 22/23/25 Sesuai)' },
          { key: 'Dokumen Transfer Pricing', val: 'Master File, Local File & CbCR (PMK 172 Tahun 2023)' },
          { key: 'e-SKD / Form DGT Lawan Transaksi', val: 'SKD-SG-2026-009182 (Tarif PPh 26 Royalti 10%)' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'STR-1',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        tradeName: 'Nusantara Group HQ',
        role: 'Ultimate Parent',
        countryCode: 'ID',
        flag: '🇮🇩',
        jurisdiction: 'Indonesia (DJP Coretax)',
        taxId: '0013948214012000',
        registrationNo: 'NIB-9120301928371',
        directOwnership: 100,
        effectiveOwnership: 100,
        functionalCurrency: 'IDR',
        transferPricingMethod: 'TNMM (Transactional Net Margin)',
        intercompanyTransaction: 'Entitas Induk Pengendali & Pusat Pengembangan Produk Domestik',
        annualIntercompanyVolume: 'Rp 4.650.000.000 (Omzet Utama)',
        whtDomesticRate: '15% (PPh 23)',
        whtTreatyRate: 'N/A (Domestik)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 88,
      },
      {
        id: 'STR-2',
        entityName: 'Nusantara FinTech Pte. Ltd.',
        tradeName: 'Nusantara SG Treasury & IP Hub',
        role: 'Regional IP Hub',
        countryCode: 'SG',
        flag: '🇸🇬',
        jurisdiction: 'Singapore (IRAS InvoiceNow)',
        taxId: '202319482K (UEN)',
        registrationNo: 'ACRA-202319482K',
        directOwnership: 85,
        effectiveOwnership: 85,
        functionalCurrency: 'SGD',
        transferPricingMethod: 'CUP (Comparable Uncontrolled Price)',
        intercompanyTransaction: 'Lisensi IP & Royalti Algoritma AI dari Anak Usaha SG ke Induk ID',
        annualIntercompanyVolume: 'S$ 38,000 / Rp 450.000.000',
        whtDomesticRate: '20% (PPh Pasal 26)',
        whtTreatyRate: '10% (P3B Indonesia–Singapura Pasal 12)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 91,
      },
      {
        id: 'STR-3',
        entityName: 'Nusantara Digital Solutions Sdn. Bhd.',
        tradeName: 'Nusantara Malaysia Ops',
        role: 'Tier-2 Subsidiary (Cucu Perusahaan)',
        countryCode: 'MY',
        flag: '🇲🇾',
        jurisdiction: 'Malaysia (LHDN MyInvois)',
        taxId: 'C25849102090 (TIN)',
        registrationNo: 'SSM-202201039481',
        directOwnership: 100,
        effectiveOwnership: 85,
        functionalCurrency: 'MYR',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'Distribusi SaaS Pasar Malaysia & Jasa Dukungan Teknis Regional',
        annualIntercompanyVolume: 'RM 240,000 / tahun',
        whtDomesticRate: '10% (Section 109B ITA)',
        whtTreatyRate: '8% / 10% (DTA MY–SG / MY–ID)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 86,
      },
      {
        id: 'STR-4',
        entityName: 'Nusantara AI Technologies, Inc.',
        tradeName: 'Nusantara US Delaware Corp',
        role: 'Direct Subsidiary (Anak Perusahaan)',
        countryCode: 'US',
        flag: '🇺🇸',
        jurisdiction: 'United States (IRS MeF)',
        taxId: '88-4920193 (Federal EIN)',
        registrationNo: 'DE-FILE-7492018',
        directOwnership: 100,
        effectiveOwnership: 100,
        functionalCurrency: 'USD',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'R&D Cloud AI Infrastructure & Penjualan Enterprise Amerika Utara',
        annualIntercompanyVolume: 'US$ 120,000 / tahun',
        whtDomesticRate: '30% (IRC §1442 FDAP)',
        whtTreatyRate: '10% (US–Indonesia Tax Treaty Article 13)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 84,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00001',
        type: 'Intermediate Shareholder',
        name: 'Archipelago Ventures Holding Pte. Ltd.',
        registrationNo: 'ACRA-202019283C',
        jurisdiction: '🇸🇬 Singapore',
        taxId: 'UEN-202019283C',
        sharePercent: 35,
        votingRightPercent: 35,
        effectiveDate: '2020-06-15',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: '8 Marina View, #42-01 Asia Square Tower 1, Singapore 018960',
        contactEmail: 'corporate@archipelagoventures.sg',
      },
      {
        id: 'INT-00002',
        type: 'Intermediate Shareholder',
        name: 'Merdeka Kapital Nusantara Tbk',
        registrationNo: 'AHU-0019283.AH.01.01',
        jurisdiction: '🇮🇩 Indonesia',
        taxId: '0029182736011000',
        sharePercent: 45,
        votingRightPercent: 45,
        effectiveDate: '2018-03-14',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: 'Pacific Century Place Lt. 35, SCBD Lot 10, Jakarta Selatan 12190',
        contactEmail: 'legal@merdekakapital.co.id',
      },
      {
        id: 'INT-00003',
        type: 'Intermediate Shareholder',
        name: 'BlueHorizon Pacific Partners LP',
        registrationNo: 'DE-LP-5910291',
        jurisdiction: '🇺🇸 United States',
        taxId: 'EIN-84-9910291',
        sharePercent: 20,
        votingRightPercent: 20,
        effectiveDate: '2022-11-01',
        status: 'Under Review',
        bepsRisk: 'High (Conduit / Treaty Shopping Risk)',
        address: '200 Park Avenue, Suite 3900, New York, NY 10166, USA',
        contactEmail: 'tax@bluehorizonpartners.com',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00001',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Dr. Hendra Kusuma, S.Kom., M.B.A.',
        roleTitle: 'Founder & President Commissioner (Ultimate Beneficial Owner)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Kebayoran Baru Satu)',
        nationalIdOrPassport: 'NIK: 3174011403800001',
        personalTaxId: '3174011403800001 (NPWP 16 Digit NIK)',
        directSharePercent: 25,
        effectiveSharePercent: 48.5,
        votingRightPercent: 48.5,
        dividendTaxRegime: '0% Bebas PPh Dividen (Diinvestasikan di NKRI min. 3 Tahun — UU HPP Pasal 4 ayat (3) huruf f & PMK 18/2021)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Senopati Dalam No. 18, Kebayoran Baru, Jakarta Selatan 12190',
        email: 'hendra.kusuma@nusantaradigital.co.id',
      },
      {
        id: 'IND-00002',
        type: 'Individual Founder / Director',
        fullName: 'Kartika Wijaya, S.E., Ak., CA.',
        roleTitle: 'Co-Founder & Chief Executive Officer (Direktur Utama)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Setiabudi)',
        nationalIdOrPassport: 'NIK: 3171045208850003',
        personalTaxId: '3171045208850003 (NPWP 16 Digit NIK)',
        directSharePercent: 15,
        effectiveSharePercent: 28.0,
        votingRightPercent: 28.0,
        dividendTaxRegime: '10% PPh Final Pasal 17 ayat (2c) (Dividen Kas Tanpa Komitmen Reinvestasi)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Apartemen Pacific Place Residence Lt. 22, SCBD, Jakarta Selatan 12190',
        email: 'kartika.wijaya@nusantaradigital.co.id',
      },
      {
        id: 'IND-00003',
        type: 'Individual Minority Investor',
        fullName: 'Marcus Tan Wei Ming',
        roleTitle: 'Non-Resident Individual Angel Investor (WPLN)',
        nationality: '🇸🇬 Singapore',
        taxResidency: '🇸🇬 Singapore (SPLN — IRAS Certificate of Residence Verified)',
        nationalIdOrPassport: 'Passport: K8192031Z / NRIC: S8419283D',
        personalTaxId: 'SG-NRIC-S8419283D',
        directSharePercent: 5,
        effectiveSharePercent: 19.0,
        votingRightPercent: 19.0,
        dividendTaxRegime: '15% PPh Pasal 26 (Tarif P3B Indonesia–Singapura Pasal 10 dengan e-SKD Aktif; Tarif Normal 20%)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: '15 Nassim Road, #04-02 Nassim Park Residences, Singapore 258382',
        email: 'marcus.tan@archipelagoventures.sg',
      },
    ],
  },
  {
    id: 'ENT-SG-002',
    legalName: 'Nusantara FinTech Pte. Ltd.',
    tradeName: 'Anak Perusahaan Singapura (SG IP & Treasury Hub)',
    parentCompanyId: 'ENT-ID-001',
    parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (🇮🇩 Indonesia)',
    ownershipByParent: 85,
    registrationNumber: 'ACRA-202319482K',
    taxId: '202319482K (UEN / GST M9-1928371-K)',
    nitkuOrBranchId: 'PEPPOL: 0195:SGUEN202319482K',
    incorporationDate: '2021-05-20',
    entityType: 'Regional Hub Subsidiary',
    countryCode: 'SG',
    jurisdictionName: 'Singapore',
    flag: '🇸🇬',
    fiscalYearEnd: '31 December (YA 2027)',
    functionalCurrency: 'SGD (Singapore Dollar)',
    paidUpCapital: 'S$ 1,500,000',
    taxOfficeName: 'Inland Revenue Authority of Singapore (IRAS Revenue House)',
    address: '10 Marina Boulevard, #39-01 Marina Bay Financial Centre Tower 2',
    cityAndPostal: 'Singapore 018983',
    authorizedTaxOfficer: 'Lim Wei Ling, SCTP (Accredited Tax Advisor)',
    officerPosition: 'Regional Tax Director — APAC',
    contactEmail: 'sg.tax@nusantarafintech.sg',
    contactPhone: '+65 6812 4910',
    businessClassification: 'SSIC 62019 — Software Publishing, FinTech IP & Treasury Center',
    taxAuthority: 'Inland Revenue Authority of Singapore (IRAS)',
    vatOrGstStatus: 'GST Registered (9% Prevailing Rate • IMDA InvoiceNow Active)',
    status: 'ACTIVE',
    aiComplianceScore: 91,
    intercompanyRole: 'Anak Perusahaan Regional (85% dimiliki Induk ID) • Pemegang IP Regional & Induk Langsung Anak Usaha MY',
    documents: [
      {
        id: 'SG-DOC-1',
        category: 'Deed of Establishment',
        label: 'ACRA BizFile Certificate of Incorporation & Constitution',
        fileName: 'acra_bizfile_202319482K_constitution.pdf',
        fileSize: '3.1 MB',
        uploadedAt: '10 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.7,
        extractedNote: 'UEN 202319482K Active • Paid-up Capital S$ 1,500,000 • 85% Owned by Indonesian Parent',
        extractedFields: [
          { key: 'Unique Entity Number (UEN)', val: '202319482K' },
          { key: 'Company Type', val: 'Exempt Private Company Limited by Shares' },
          { key: 'Issued Share Capital', val: 'S$ 1,500,000 (1,500,000 Ordinary Shares)' },
          { key: 'Resident Directors', val: '2 Singapore Citizen/PR Directors Verified' },
        ],
      },
      {
        id: 'SG-DOC-2',
        category: 'Shareholder Structure',
        label: 'ACRA Register of Registrable Controllers (RORC) & Shareholding Ledger',
        fileName: 'acra_rorc_controllers_2026.pdf',
        fileSize: '1.9 MB',
        uploadedAt: '11 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.3,
        extractedNote: 'PT Nusantara Kreasi Digital Tbk (85%) & Temasek FinTech Seed (15%) Verified',
        extractedFields: [
          { key: 'Immediate Holding Company', val: 'PT Nusantara Kreasi Digital Tbk (85%)' },
          { key: 'Minority Institutional Partner', val: 'Temasek FinTech Seed Holdings Pte. Ltd. (15%)' },
          { key: 'Downstream Subsidiary', val: 'Nusantara Digital Solutions Sdn. Bhd. (100% — Malaysia)' },
        ],
      },
      {
        id: 'SG-DOC-3',
        category: 'Financial Statement',
        label: 'Audited SFRS(I) Financial Statements & IRAS Tax Computation',
        fileName: 'sfrsi_audited_fs_ya2027_nfp.pdf',
        fileSize: '5.4 MB',
        uploadedAt: '15 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.5,
        extractedNote: 'Revenue S$ 1,850,000 • Chargeable Income S$ 341,500 • Eligible for PTE & EIS 400% Deduction',
        extractedFields: [
          { key: 'Gross Revenue', val: 'S$ 1,850,000' },
          { key: 'Chargeable Income (Before PTE)', val: 'S$ 341,500' },
          { key: 'Partial Tax Exemption (PTE)', val: 'S$ 102,500 Exempted' },
          { key: 'Net Tax Payable (After PTE)', val: 'S$ 40,630 (11.9% Effective Rate)' },
        ],
      },
      {
        id: 'SG-DOC-4',
        category: 'Previous Year Tax Return',
        label: 'IRAS Form C-S Notice of Assessment & Certificate of Residence (COR)',
        fileName: 'iras_noa_form_cs_cor_2026.pdf',
        fileSize: '2.2 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.8,
        extractedNote: 'IRAS COR Approved for Indonesia–Singapore DTA Relief (10% Reduced WHT)',
        extractedFields: [
          { key: 'IRAS COR Reference', val: 'COR-2026-SG-9918273' },
          { key: 'Treaty Partner', val: 'Republic of Indonesia (DJP)' },
          { key: 'Economic Substance Check', val: 'Passed (18 Full-Time Employees in Marina Bay Office)' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'SG-STR-1',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        tradeName: 'Induk Indonesia',
        role: 'Ultimate Parent',
        countryCode: 'ID',
        flag: '🇮🇩',
        jurisdiction: 'Indonesia (DJP)',
        taxId: '0013948214012000',
        registrationNo: 'NIB-9120301928371',
        directOwnership: 85,
        effectiveOwnership: 85,
        functionalCurrency: 'IDR',
        transferPricingMethod: 'CUP (Comparable Uncontrolled Price)',
        intercompanyTransaction: 'Pembayaran Royalti Lisensi IP dari Induk ID ke Anak Usaha SG',
        annualIntercompanyVolume: 'S$ 38,000 / tahun',
        whtDomesticRate: '20%',
        whtTreatyRate: '10% (P3B ID–SG)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 88,
      },
      {
        id: 'SG-STR-2',
        entityName: 'Nusantara FinTech Pte. Ltd.',
        tradeName: 'Anak Perusahaan SG (Selected)',
        role: 'Regional IP Hub',
        countryCode: 'SG',
        flag: '🇸🇬',
        jurisdiction: 'Singapore (IRAS)',
        taxId: '202319482K',
        registrationNo: 'ACRA-202319482K',
        directOwnership: 85,
        effectiveOwnership: 85,
        functionalCurrency: 'SGD',
        transferPricingMethod: 'TNMM (Transactional Net Margin)',
        intercompanyTransaction: 'Pusat Lisensi IP Regional & Sub-Holding ASEAN',
        annualIntercompanyVolume: 'S$ 1,850,000 (Total Revenue)',
        whtDomesticRate: '17% CIT',
        whtTreatyRate: '11.9% Effective CIT (PTE)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 91,
      },
      {
        id: 'SG-STR-3',
        entityName: 'Nusantara Digital Solutions Sdn. Bhd.',
        tradeName: 'Anak Perusahaan MY',
        role: 'Direct Subsidiary (Anak Perusahaan)',
        countryCode: 'MY',
        flag: '🇲🇾',
        jurisdiction: 'Malaysia (LHDN)',
        taxId: 'C25849102090',
        registrationNo: 'SSM-202201039481',
        directOwnership: 100,
        effectiveOwnership: 85,
        functionalCurrency: 'MYR',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'Sub-Lisensi Perangkat Lunak ke Anak Usaha Malaysia',
        annualIntercompanyVolume: 'RM 240,000 / tahun',
        whtDomesticRate: '10%',
        whtTreatyRate: '8% (SG–MY DTA)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 86,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00004',
        type: 'Parent Holding Shareholder',
        name: 'PT Nusantara Kreasi Digital Tbk',
        registrationNo: 'NIB-9120301928371',
        jurisdiction: '🇮🇩 Indonesia',
        taxId: '0013948214012000',
        sharePercent: 85,
        votingRightPercent: 85,
        effectiveDate: '2021-05-20',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: 'SCBD Lot 11, Jakarta Selatan 12190, Indonesia',
        contactEmail: 'tax.compliance@nusantaradigital.co.id',
      },
      {
        id: 'INT-00005',
        type: 'Minority Institutional Shareholder',
        name: 'Temasek FinTech Seed Holdings Pte. Ltd.',
        registrationNo: 'ACRA-202109482Z',
        jurisdiction: '🇸🇬 Singapore',
        taxId: '202109482Z',
        sharePercent: 15,
        votingRightPercent: 15,
        effectiveDate: '2022-01-10',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: '60B Orchard Road, #06-18 The Atrium@Orchard, Singapore 238891',
        contactEmail: 'investments@temasekseed.sg',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00004',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Dr. Hendra Kusuma, S.Kom., M.B.A.',
        roleTitle: 'Registrable Controller (ACRA RORC — Ultimate Beneficial Owner)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN)',
        nationalIdOrPassport: 'Passport: C9182731',
        personalTaxId: '3174011403800001',
        directSharePercent: 0,
        effectiveSharePercent: 41.2,
        votingRightPercent: 41.2,
        dividendTaxRegime: '0% Singapore One-Tier Corporate Tax System (Section 13(1)(za) ITA — No Dividend WHT)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Senopati Dalam No. 18, Jakarta Selatan 12190, Indonesia',
        email: 'hendra.kusuma@nusantaradigital.co.id',
      },
      {
        id: 'IND-00005',
        type: 'Individual Founder / Director',
        fullName: 'Lim Wei Ling, SCTP',
        roleTitle: 'Singapore Resident Director & ESOP Individual Shareholder',
        nationality: '🇸🇬 Singapore',
        taxResidency: '🇸🇬 Singapore (IRAS Tax Resident)',
        nationalIdOrPassport: 'NRIC: S8829104G',
        personalTaxId: 'SG-NRIC-S8829104G',
        directSharePercent: 5,
        effectiveSharePercent: 5.0,
        votingRightPercent: 5.0,
        dividendTaxRegime: '0% One-Tier Tax-Exempt Dividend (Exempt in Hands of Individual Shareholder)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: '18 Marina Gardens Drive, #28-04 Marina One Residences, Singapore 018953',
        email: 'weiling.lim@nusantarafintech.sg',
      },
    ],
  },
  {
    id: 'ENT-MY-003',
    legalName: 'Nusantara Digital Solutions Sdn. Bhd.',
    tradeName: 'Anak Perusahaan Malaysia (MY Commercial Ops)',
    parentCompanyId: 'ENT-ID-001',
    parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (via SG Hub)',
    ownershipByParent: 100,
    registrationNumber: 'SSM-202201039481 (1485178-X)',
    taxId: 'C25849102090 (LHDN TIN)',
    nitkuOrBranchId: 'SST No: W10-2401-32000192',
    incorporationDate: '2022-08-12',
    entityType: 'Subsidiary (Anak Perusahaan)',
    countryCode: 'MY',
    jurisdictionName: 'Malaysia',
    flag: '🇲🇾',
    fiscalYearEnd: '31 December (YA 2026)',
    functionalCurrency: 'MYR (Malaysian Ringgit)',
    paidUpCapital: 'RM 1,500,000',
    taxOfficeName: 'LHDN Cawangan Kuala Lumpur Bandar (MyTax / MyInvois)',
    address: 'Level 25, Menara Maxis, Kuala Lumpur City Centre (KLCC)',
    cityAndPostal: '50088 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    authorizedTaxOfficer: 'Ahmad Faiz bin Razak, CTIM',
    officerPosition: 'Head of Malaysia Tax & MyInvois Compliance',
    contactEmail: 'my.tax@nusantaradigital.my',
    contactPhone: '+60 3 2380 1190',
    businessClassification: 'MSIC 62010 — Computer Programming & Enterprise SaaS Distribution',
    taxAuthority: 'Lembaga Hasil Dalam Negeri Malaysia (LHDN MyInvois)',
    vatOrGstStatus: 'RMCD SST Registered (8% Service Tax • Mandatory MyInvois e-Invoice)',
    status: 'ACTIVE',
    aiComplianceScore: 86,
    intercompanyRole: 'Anak Perusahaan Operasional Malaysia • Distribusi SaaS & Pembayar Sub-Lisensi ke SG Hub',
    documents: [
      {
        id: 'MY-DOC-1',
        category: 'Deed of Establishment',
        label: 'SSM Section 17 Notice of Registration & Section 14 Superform',
        fileName: 'ssm_sec17_incorporation_1485178X.pdf',
        fileSize: '2.9 MB',
        uploadedAt: '09 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.4,
        extractedNote: 'SSM No. 202201039481 Active • Paid-up Capital RM 1,500,000 (SME Tiered Tax Eligible)',
        extractedFields: [
          { key: 'SSM Registration No.', val: '202201039481 (1485178-X)' },
          { key: 'Paid-Up Ordinary Capital', val: 'RM 1,500,000 (<= RM 2.5M SME Threshold)' },
          { key: 'LHDN Tax Identification No.', val: 'C25849102090' },
        ],
      },
      {
        id: 'MY-DOC-2',
        category: 'Shareholder Structure',
        label: 'SSM Section 51 Register of Members & Beneficial Ownership',
        fileName: 'ssm_register_of_members_bo_2026.pdf',
        fileSize: '2.1 MB',
        uploadedAt: '11 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.0,
        extractedNote: '100% Owned by Nusantara FinTech Pte. Ltd. (SG) • Ultimate Parent: PT Nusantara Kreasi Digital Tbk',
        extractedFields: [
          { key: 'Immediate Shareholder', val: 'Nusantara FinTech Pte. Ltd. (100%)' },
          { key: 'Ultimate Holding Company', val: 'PT Nusantara Kreasi Digital Tbk (Indonesia)' },
        ],
      },
      {
        id: 'MY-DOC-3',
        category: 'Financial Statement',
        label: 'Audited MFRS Financial Statement & LHDN Form C Draft',
        fileName: 'mfrs_audited_fs_form_c_ya2026.pdf',
        fileSize: '6.0 MB',
        uploadedAt: '15 Oct 2026',
        status: 'Anomaly Flagged',
        confidenceScore: 96.8,
        extractedNote: '1 Supplier Invoice (RM 65,000 — Klang Valley Enterprise) Missing LHDN MyInvois UUID',
        extractedFields: [
          { key: 'Gross Business Income', val: 'RM 3,200,000' },
          { key: 'Chargeable Income', val: 'RM 709,000' },
          { key: 'MyInvois Validation Alert', val: '1 Expense Claim (RM 65,000) Lacks Validated UUID' },
        ],
      },
      {
        id: 'MY-DOC-4',
        category: 'Previous Year Tax Return',
        label: 'LHDN Form C Acknowledgement & Minimum Transfer Pricing Doc',
        fileName: 'lhdn_form_c_tp_doc_pua165_2026.pdf',
        fileSize: '4.3 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.2,
        extractedNote: 'Compliant with Income Tax (Transfer Pricing) Rules 2023 P.U.(A) 165',
        extractedFields: [
          { key: 'Form C Filing Status', val: 'Submitted via e-Filing MyTax (e-C)' },
          { key: 'CP204 Instalment Compliance', val: 'On-Schedule (Within 85% Estimate Margin)' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'MY-STR-1',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        tradeName: 'Induk Indonesia',
        role: 'Ultimate Parent',
        countryCode: 'ID',
        flag: '🇮🇩',
        jurisdiction: 'Indonesia (DJP)',
        taxId: '0013948214012000',
        registrationNo: 'NIB-9120301928371',
        directOwnership: 85,
        effectiveOwnership: 85,
        functionalCurrency: 'IDR',
        transferPricingMethod: 'TNMM (Transactional Net Margin)',
        intercompanyTransaction: 'Ultimate Holding & Dukungan Engineering Lintas Negara',
        annualIntercompanyVolume: 'RM 180,000 / tahun',
        whtDomesticRate: '10%',
        whtTreatyRate: '10% (P3B ID–MY)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 88,
      },
      {
        id: 'MY-STR-2',
        entityName: 'NusantaraDigital Solutions Sdn. Bhd.',
        tradeName: 'Anak Perusahaan MY (Selected)',
        role: 'Tier-2 Subsidiary (Cucu Perusahaan)',
        countryCode: 'MY',
        flag: '🇲🇾',
        jurisdiction: 'Malaysia (LHDN)',
        taxId: 'C25849102090',
        registrationNo: 'SSM-202201039481',
        directOwnership: 100,
        effectiveOwnership: 85,
        functionalCurrency: 'MYR',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'Entitas Distribusi Komersial Malaysia',
        annualIntercompanyVolume: 'RM 3,200,000 (Omzet Lokal)',
        whtDomesticRate: '24% Normal CIT',
        whtTreatyRate: '15% / 17% SME Tiered CIT',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 86,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00006',
        type: 'Immediate Holding Shareholder',
        name: 'Nusantara FinTech Pte. Ltd.',
        registrationNo: 'ACRA-202319482K',
        jurisdiction: '🇸🇬 Singapore',
        taxId: '202319482K',
        sharePercent: 100,
        votingRightPercent: 100,
        effectiveDate: '2022-08-12',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: '10 Marina Boulevard, #39-01 MBFC Tower 2, Singapore 018983',
        contactEmail: 'sg.tax@nusantarafintech.sg',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00006',
        type: 'Individual Founder / Director',
        fullName: 'Ahmad Faiz bin Razak, CTIM',
        roleTitle: 'Malaysia Resident Director & Minority Individual Shareholder',
        nationality: '🇲🇾 Malaysia',
        taxResidency: '🇲🇾 Malaysia (LHDN Resident Individual)',
        nationalIdOrPassport: 'MyKad: 890412-14-5521',
        personalTaxId: 'IG-890412145521 (LHDN TIN)',
        directSharePercent: 5,
        effectiveSharePercent: 5.0,
        votingRightPercent: 5.0,
        dividendTaxRegime: '2% Malaysia Dividend Tax on Individual Dividend > RM 100,000 (Budget 2025 / YA 2026)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jalan Ampang Hilir No. 24, 55000 Kuala Lumpur, Malaysia',
        email: 'ahmad.faiz@nusantaradigital.my',
      },
      {
        id: 'IND-00007',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Dr. Hendra Kusuma, S.Kom., M.B.A.',
        roleTitle: 'Ultimate Beneficial Owner (SSM Section 56 BO Register)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN)',
        nationalIdOrPassport: 'Passport: C9182731',
        personalTaxId: '3174011403800001',
        directSharePercent: 0,
        effectiveSharePercent: 41.2,
        votingRightPercent: 41.2,
        dividendTaxRegime: '0% Malaysia Single-Tier Dividend WHT + P3B Indonesia–Malaysia',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Senopati Dalam No. 18, Jakarta Selatan 12190, Indonesia',
        email: 'hendra.kusuma@nusantaradigital.co.id',
      },
    ],
  },
  {
    id: 'ENT-US-004',
    legalName: 'Nusantara AI Technologies, Inc.',
    tradeName: 'Anak Perusahaan AS (US Delaware C-Corp)',
    parentCompanyId: 'ENT-ID-001',
    parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (🇮🇩 Indonesia)',
    ownershipByParent: 100,
    registrationNumber: 'DE-FILE-7492018 (Delaware Secretary of State)',
    taxId: '88-4920193 (Federal EIN)',
    nitkuOrBranchId: 'CA Corp ID: C4829102 (California FTB)',
    incorporationDate: '2023-02-01',
    entityType: 'Foreign Operating Subsidiary',
    countryCode: 'US',
    jurisdictionName: 'United States',
    flag: '🇺🇸',
    fiscalYearEnd: '31 December (Calendar Tax Year)',
    functionalCurrency: 'USD (United States Dollar)',
    paidUpCapital: 'US$ 2,000,000',
    taxOfficeName: 'Internal Revenue Service (Ogden UT International & Corporate Center)',
    address: '548 Market St, Suite 49102, Financial District',
    cityAndPostal: 'San Francisco, CA 94104, United States',
    authorizedTaxOfficer: 'Michael Chen, CPA, MST',
    officerPosition: 'Head of US Tax & IRS Compliance',
    contactEmail: 'us.tax@nusantara-ai.com',
    contactPhone: '+1 (415) 890-4412',
    businessClassification: 'NAICS 541511 — Custom Computer Programming & AI Cloud Services',
    taxAuthority: 'Internal Revenue Service (IRS MeF & State Nexus)',
    vatOrGstStatus: 'Multi-State Economic Sales Tax Nexus (CA, NY, TX • Wayfair Compliant)',
    status: 'PENDING',
    aiComplianceScore: 84,
    intercompanyRole: 'Anak Perusahaan AS (100% dimiliki Induk ID) • Kontrak Enterprise Amerika Utara & R&D AI',
    documents: [
      {
        id: 'US-DOC-1',
        category: 'Deed of Establishment',
        label: 'Delaware Certificate of Incorporation & Corporate Bylaws',
        fileName: 'delaware_cert_inc_7492018.pdf',
        fileSize: '2.5 MB',
        uploadedAt: '08 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.6,
        extractedNote: 'Delaware C-Corporation Active • 100% Voting Common Stock Held by Indonesian Parent',
        extractedFields: [
          { key: 'Delaware File Number', val: '7492018' },
          { key: 'Entity Classification', val: 'Domestic C-Corporation (Form 1120 Filer)' },
          { key: 'Authorized Shares', val: '10,000,000 Common Shares ($0.0001 Par Value)' },
        ],
      },
      {
        id: 'US-DOC-2',
        category: 'Shareholder Structure',
        label: 'IRS Form 5472 (25% Foreign-Owned US Corporation Disclosure)',
        fileName: 'irs_form5472_foreign_parent_disclosure.pdf',
        fileSize: '3.4 MB',
        uploadedAt: '12 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.2,
        extractedNote: '100% Foreign Owner: PT Nusantara Kreasi Digital Tbk • Protects Against $25,000 IRC §6038A Penalty',
        extractedFields: [
          { key: 'Direct 25%+ Foreign Shareholder', val: 'PT Nusantara Kreasi Digital Tbk (100% — Indonesia)' },
          { key: 'Reportable Intercompany Transactions', val: 'Part IV Cost-Sharing & R&D Service Fee ($120,000)' },
        ],
      },
      {
        id: 'US-DOC-3',
        category: 'Financial Statement',
        label: 'US GAAP Audited Financial Statement & Schedule M-1 Trial Balance',
        fileName: 'us_gaap_fs_schedule_m1_2026.pdf',
        fileSize: '6.8 MB',
        uploadedAt: '15 Oct 2026',
        status: 'Anomaly Flagged',
        confidenceScore: 97.1,
        extractedNote: '1 Contractor ($62,000 — Apex Growth Partners) Missing Validated Form W-9 (24% Backup WHT Risk)',
        extractedFields: [
          { key: 'Gross Receipts', val: 'US$ 2,450,000' },
          { key: 'Schedule M-1 Add-Back (IRC §274)', val: '+US$ 19,000 (Disallowed Entertainment & 50% Meals)' },
          { key: 'Backup Withholding Alert', val: 'US$ 62,000 Unverified TIN Requires 24% WHT ($14,880)' },
        ],
      },
      {
        id: 'US-DOC-4',
        category: 'Previous Year Tax Return',
        label: 'IRS Form 1120 & Form W-8BEN-E Cross-Border Treaty File',
        fileName: 'irs_form1120_w8bene_treaty_2026.pdf',
        fileSize: '5.1 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.3,
        extractedNote: 'Form W-8BEN-E Active for US–Indonesia Tax Treaty Article 13 (10% Reduced WHT)',
        extractedFields: [
          { key: 'Federal Corporate Tax Rate', val: '21% Flat Rate (IRC §11)' },
          { key: 'FDII Deduction Claimed (IRC §250)', val: 'US$ 42,000 Foreign-Derived Intangible Income' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'US-STR-1',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        tradeName: 'Induk Indonesia',
        role: 'Ultimate Parent',
        countryCode: 'ID',
        flag: '🇮🇩',
        jurisdiction: 'Indonesia (DJP)',
        taxId: '0013948214012000',
        registrationNo: 'NIB-9120301928371',
        directOwnership: 100,
        effectiveOwnership: 100,
        functionalCurrency: 'IDR',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: '100% Foreign Parent • Form 5472 & W-8BEN-E Treaty Partner',
        annualIntercompanyVolume: 'US$ 120,000 / tahun',
        whtDomesticRate: '30% (IRC §1442)',
        whtTreatyRate: '10% (US–ID Tax Treaty)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 88,
      },
      {
        id: 'US-STR-2',
        entityName: 'Nusantara AI Technologies, Inc.',
        tradeName: 'Anak Perusahaan US (Selected)',
        role: 'Direct Subsidiary (Anak Perusahaan)',
        countryCode: 'US',
        flag: '🇺🇸',
        jurisdiction: 'United States (IRS)',
        taxId: '88-4920193',
        registrationNo: 'DE-FILE-7492018',
        directOwnership: 100,
        effectiveOwnership: 100,
        functionalCurrency: 'USD',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'Operasional Komersial & Cloud R&D Amerika Serikat',
        annualIntercompanyVolume: 'US$ 2,450,000 (Gross Receipts)',
        whtDomesticRate: '21% Federal CIT',
        whtTreatyRate: '17.4% Effective (FDII)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 84,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00007',
        type: 'Direct Foreign Parent Shareholder',
        name: 'PT Nusantara Kreasi Digital Tbk',
        registrationNo: 'NIB-9120301928371',
        jurisdiction: '🇮🇩 Indonesia',
        taxId: '0013948214012000',
        sharePercent: 100,
        votingRightPercent: 100,
        effectiveDate: '2023-02-01',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: 'SCBD Lot 11, Jakarta Selatan 12190, Indonesia',
        contactEmail: 'tax.compliance@nusantaradigital.co.id',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00008',
        type: 'Individual Founder / Director',
        fullName: 'Michael Chen, CPA, MST',
        roleTitle: 'US Resident Officer & Section 83(b) Restricted Stock Shareholder',
        nationality: '🇺🇸 United States',
        taxResidency: '🇺🇸 United States (IRS Form 1040 Resident)',
        nationalIdOrPassport: 'US Passport: 549182731',
        personalTaxId: 'SSN: ***-**-4918 (Form W-9 Verified)',
        directSharePercent: 5,
        effectiveSharePercent: 5.0,
        votingRightPercent: 5.0,
        dividendTaxRegime: '15% / 20% Qualified Dividend Rate + 3.8% Net Investment Income Tax (IRC §1(h)(11) & Form 1099-DIV)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: '425 California St, Apt 18B, San Francisco, CA 94104, USA',
        email: 'm.chen@nusantara-ai.com',
      },
      {
        id: 'IND-00009',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Dr. Hendra Kusuma, S.Kom., M.B.A.',
        roleTitle: 'FinCEN BOI Registered Ultimate Beneficial Owner',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (Non-Resident Alien — Form W-8BEN)',
        nationalIdOrPassport: 'Passport: C9182731',
        personalTaxId: 'Foreign TIN: 3174011403800001 (Form W-8BEN)',
        directSharePercent: 0,
        effectiveSharePercent: 48.5,
        votingRightPercent: 48.5,
        dividendTaxRegime: '15% US–Indonesia Tax Treaty Article 11(2) Dividend Rate (Statutory 30% IRC §1441)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Senopati Dalam No. 18, Jakarta Selatan 12190, Indonesia',
        email: 'hendra.kusuma@nusantaradigital.co.id',
      },
    ],
  },
];


// Pure AST markdown renderer for chat bubbles (**bold**, *italic*, `code`, ### headers, bullets, formulas, NPWP badges)
function renderChatMessage(text: string, isUserMessage = false): React.ReactNode {
  const blocks = parseBlockMarkdown(text);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((b, bIdx) => {
        if (b.type === 'h2') {
          return (
            <h3
              key={bIdx}
              className={`font-extrabold text-sm mt-2 mb-1 ${
                isUserMessage ? 'text-white' : 'text-slate-900'
              }`}
            >
              {renderInlines(b.inlines, isUserMessage)}
            </h3>
          );
        }
        if (b.type === 'h3' || b.type === 'h4') {
          return (
            <h4
              key={bIdx}
              className={`font-bold text-xs mt-1.5 mb-0.5 ${
                isUserMessage ? 'text-white' : 'text-slate-900'
              }`}
            >
              {renderInlines(b.inlines, isUserMessage)}
            </h4>
          );
        }
        if (b.type === 'divider') {
          return (
            <hr
              key={bIdx}
              className={`my-2 ${
                isUserMessage ? 'border-blue-400/40' : 'border-slate-200'
              }`}
            />
          );
        }
        if (b.type === 'formula') {
          return (
            <div
              key={bIdx}
              className={`my-1.5 p-2.5 rounded-lg font-mono tabular-nums text-[11px] font-semibold border ${
                isUserMessage
                  ? 'bg-blue-800/80 border-blue-400/40 text-white'
                  : 'bg-slate-100 border-slate-200/90 text-slate-900'
              }`}
            >
              {renderInlines(b.inlines, isUserMessage)}
            </div>
          );
        }
        if (b.type === 'bullet') {
          return (
            <div key={bIdx} className="flex items-start gap-1.5 ml-1">
              <span
                className={`font-bold ${
                  isUserMessage ? 'text-white' : 'text-[#2563EB]'
                }`}
              >
                •
              </span>
              <div className="flex-1">{renderInlines(b.inlines, isUserMessage)}</div>
            </div>
          );
        }
        if (b.type === 'ordered') {
          return (
            <div key={bIdx} className="flex items-start gap-1.5 ml-1 font-mono">
              <span
                className={`font-bold text-[11px] ${
                  isUserMessage ? 'text-white' : 'text-[#2563EB]'
                }`}
              >
                {b.order}.
              </span>
              <div className="flex-1 font-sans">
                {renderInlines(b.inlines, isUserMessage)}
              </div>
            </div>
          );
        }
        return (
          <p key={bIdx} className="leading-relaxed">
            {renderInlines(b.inlines, isUserMessage)}
          </p>
        );
      })}
    </div>
  );
}

export default function NexoraApp() {
  // Primary & Sub Navigation matching Figma Prototype (`Companies | Calculation | Tax Return | Payment` + `Corporate | Individual | Studies | Tax Calendar | Reports`)
  const [primaryNav, setPrimaryNav] = useState<PrimaryNav>('companies');
  const [subNav, setSubNav] = useState<SubNav>('corporate');
  const [corpViewTab, setCorpViewTab] = useState<CorporateViewTab>('directory');

  // Companies & Multi-Country Subsidiaries State
  const [companies, setCompanies] = useState<CorporateEntity[]>(INITIAL_COMPANIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('ENT-ID-001');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [entityRoleFilter, setEntityRoleFilter] = useState<'ALL' | 'PARENT' | 'SUBSIDIARY'>('ALL');

  // Figma 1 5-Screen Corporate Management State
  const [inputMode, setInputMode] = useState<'search_existing' | 'manual'>('manual');
  const [registryLookupQuery, setRegistryLookupQuery] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<CorporateDocument | null>(null);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [structureModalTab, setStructureModalTab] = useState<'general' | 'tp_tax' | 'individual_ubo'>('tp_tax');
  const [showShareholderModal, setShowShareholderModal] = useState<boolean>(false);
  const [shareholderInputMode, setShareholderInputMode] = useState<'search_existing' | 'manual'>('manual');
  const [showIndividualModal, setShowIndividualModal] = useState<boolean>(false);
  const [indInputMode, setIndInputMode] = useState<'search_existing' | 'manual'>('manual');
  const [isDocAiRunning, setIsDocAiRunning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [currentHeroStep, setCurrentHeroStep] = useState(1);

  const handleHeroStepSelect = (step: number) => {
    setCurrentHeroStep(step);
    if (step === 1) {
      setPrimaryNav('companies');
      setSubNav('corporate');
      setCorpViewTab('directory');
    } else if (step === 2) {
      setPrimaryNav('companies');
      setSubNav('corporate');
      setCorpViewTab('corporate_form');
    } else if (step === 3) {
      setPrimaryNav('companies');
      setSubNav('studies');
    } else if (step === 4) {
      setPrimaryNav('companies');
      setSubNav('corporate');
      setCorpViewTab('all_in_one');
    } else if (step === 5) {
      setPrimaryNav('calculation');
    } else if (step === 6) {
      setPrimaryNav('tax_return');
    } else if (step === 7) {
      setPrimaryNav('payment');
    }
  };

  const handleResetSampleData = () => {
    setCompanies(INITIAL_COMPANIES);
    setSelectedEntityId('ENT-ID-001');
    setPrimaryNav('companies');
    setSubNav('corporate');
    setCorpViewTab('directory');
    triggerToast('Dataset contoh lengkap multi-entitas (ID, SG, MY, US) berhasil dimuat ulang!');
  };

  // Add Subsidiary Form fields (inside Frame 3 Company Structure Modal)
  const [newSubName, setNewSubName] = useState<string>('Nusantara Pacific Pty. Ltd.');
  const [newSubTradeName, setNewSubTradeName] = useState<string>('Nusantara APAC Subsidiary');
  const [newSubCountry, setNewSubCountry] = useState<CountryCode>('SG');
  const [newSubTaxId, setNewSubTaxId] = useState<string>('202688192M (UEN)');
  const [newSubRegNo, setNewSubRegNo] = useState<string>('ACRA-202688192M');
  const [newSubOwnership, setNewSubOwnership] = useState<string>('100');
  const [newSubTpMethod, setNewSubTpMethod] = useState<SubsidiaryNode['transferPricingMethod']>('TNMM (Transactional Net Margin)');
  const [newSubFlow, setNewSubFlow] = useState<string>('Lisensi Software Regional & Jasa Manajemen');
  const [newSubVolume, setNewSubVolume] = useState<string>('S$ 150,000 / tahun');

  // Add Intermediate Shareholder Form fields (Frame 4 & Frame 5 of Figma 1)
  const [editingShId, setEditingShId] = useState<string | null>(null);
  const [newShName, setNewShName] = useState<string>('Global Horizon Holdings Pte. Ltd.');
  const [newShRegNo, setNewShRegNo] = useState<string>('ACRA-202499182K');
  const [newShJurisdiction, setNewShJurisdiction] = useState<string>('🇸🇬 Singapore');
  const [newShTaxId, setNewShTaxId] = useState<string>('UEN-202499182K');
  const [newShPercent, setNewShPercent] = useState<string>('15');
  const [newShAddress, setNewShAddress] = useState<string>('1 Raffles Place, #20-61 One Raffles Place, Singapore 048616');
  const [newShEmail, setNewShEmail] = useState<string>('legal@globalhorizon.sg');

  // Add Individual Shareholder Form fields (Pemegang Saham Perorangan / UBO)
  const [newIndName, setNewIndName] = useState<string>('Ir. Aditya Pratama, M.Sc.');
  const [newIndType, setNewIndType] = useState<IndividualShareholder['type']>('Individual Shareholder (UBO)');
  const [newIndRole, setNewIndRole] = useState<string>('Co-Founder & Chief Technology Officer (UBO)');
  const [newIndNationality, setNewIndNationality] = useState<string>('🇮🇩 Indonesia');
  const [newIndResidency, setNewIndResidency] = useState<string>('🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Selatan)');
  const [newIndNationalId, setNewIndNationalId] = useState<string>('NIK: 3174051908840002');
  const [newIndTaxId, setNewIndTaxId] = useState<string>('3174051908840002 (NPWP 16 Digit NIK)');
  const [newIndDirectShare, setNewIndDirectShare] = useState<string>('10');
  const [newIndEffectiveShare, setNewIndEffectiveShare] = useState<string>('18.5');
  const [newIndDividendRegime, setNewIndDividendRegime] = useState<string>(
    '0% Bebas PPh Dividen (Diinvestasikan di NKRI min. 3 Tahun — UU HPP Pasal 4 ayat (3) huruf f & PMK 18/2021)'
  );
  const [newIndAddress, setNewIndAddress] = useState<string>('Jl. Wijaya II No. 44, Kebayoran Baru, Jakarta Selatan 12160');
  const [newIndEmail, setNewIndEmail] = useState<string>('aditya.pratama@nusantaradigital.co.id');

  // Multi-Entity & RBAC Access Control States (International Standard)
  const [activePersonaId, setActivePersonaId] = useState<string>('ceo_parent');
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showRbacModal, setShowRbacModal] = useState<boolean>(false);
  const [showEntityQuickSelect, setShowEntityQuickSelect] = useState<boolean>(false);
  const [rbacModalTab, setRbacModalTab] = useState<'personas' | 'matrix' | 'standards'>('personas');
  const [showConsolidationModal, setShowConsolidationModal] = useState<boolean>(false);
  const [restrictedNoticeEntity, setRestrictedNoticeEntity] = useState<CorporateEntity | null>(null);

  const activePersona = useMemo(
    () => USER_PERSONAS.find((p) => p.id === activePersonaId) || USER_PERSONAS[0],
    [activePersonaId]
  );
  const isGroupCeoOrParentExecutive =
    activePersona.canViewAll && activePersona.entityRole === 'PARENT';

  // Floating Right-Edge AI Tax & Subsidiary Chatbot State ("analisis chat bot melayang saja di pinggir kanan")
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);


  // Close floating chatbot with Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string; citations?: string[]; entityLabel?: string }[]
  >([
    {
      role: 'assistant',
      entityLabel: '🇮🇩 PT Nusantara Kreasi Digital Tbk (Induk) & 3 Anak Perusahaan',
      text: 'Halo! Saya **Nexora AI Tax & Subsidiary Copilot** yang siap membantu Anda menganalisis pajak induk & seluruh anak perusahaan (**🇮🇩 Indonesia, 🇸🇬 Singapura, 🇲🇾 Malaysia, 🇺🇸 Amerika Serikat**). Klik tombol cepat di bawah atau pilih perusahaan di halaman untuk mengaudit dokumen, mendeteksi faktur fiktif, dan mengoptimalkan *Tax Treaty (P3B/DTA)*.',
      citations: [
        'UU HPP & Coretax DJP (Induk ID)',
        'IRAS InvoiceNow & ITA (Anak Usaha SG)',
        'LHDN MyInvois & ITA 1967 (Anak Usaha MY)',
        'IRS Form 1120 & Form 5472 (Anak Usaha US)',
      ],
    },
  ]);

  // Active Entity & Jurisdiction Config
  const selectedEntity = useMemo(
    () => companies.find((c) => c.id === selectedEntityId) || companies[0],
    [companies, selectedEntityId]
  );

  const activeCountry: CountryCode = selectedEntity.countryCode;
  const cfg = MULTI_COUNTRY_DATA[activeCountry];

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchRole =
        entityRoleFilter === 'ALL' ||
        (entityRoleFilter === 'PARENT' && c.parentCompanyId === null) ||
        (entityRoleFilter === 'SUBSIDIARY' && c.parentCompanyId !== null);
      const matchSearch =
        c.legalName.toLowerCase().includes(companySearch.toLowerCase()) ||
        c.taxId.toLowerCase().includes(companySearch.toLowerCase()) ||
        c.jurisdictionName.toLowerCase().includes(companySearch.toLowerCase()) ||
        c.intercompanyRole.toLowerCase().includes(companySearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [companies, entityRoleFilter, companySearch]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  }

  function handleSelectEntity(comp: CorporateEntity) {
    const isAllowed =
      activePersona.canViewAll ||
      activePersona.accessibleEntityIds.includes(comp.id);
    if (!isAllowed) {
      setRestrictedNoticeEntity(comp);
      return;
    }
    setSelectedEntityId(comp.id);
  }

  function handleUpdateCompanyField(field: keyof CorporateEntity, value: string) {
    setCompanies((prev) =>
      prev.map((c) => (c.id === selectedEntity.id ? { ...c, [field]: value } : c))
    );
  }

  function handleStartAddNewCompany() {
    const newId = `ENT-SG-00${companies.length + 1}`;
    const newEntity: CorporateEntity = {
      ...INITIAL_COMPANIES[1],
      id: newId,
      legalName: 'Nusantara Global Expansion Pte. Ltd.',
      tradeName: 'Anak Perusahaan Baru (Draft)',
      parentCompanyId: 'ENT-ID-001',
      parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (🇮🇩 Indonesia)',
      ownershipByParent: 100,
      registrationNumber: `REG-2026-00${companies.length + 1}`,
      taxId: `20260019${companies.length}K (UEN)`,
      status: 'PENDING',
      aiComplianceScore: 90,
    };
    setCompanies((prev) => [newEntity, ...prev]);
    setSelectedEntityId(newId);
    setCorpViewTab('corporate_form');
    setInputMode('search_existing');
    triggerToast(
      'Entitas anak perusahaan baru dibuat! Silakan lengkapi form Corporate Information, Upload Document, Company Structure & Intermediate Shareholders di bawah.'
    );
  }

  function handleRunDocAiVerification() {
    setIsDocAiRunning(true);
    setTimeout(() => {
      setIsDocAiRunning(false);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedEntity.id
            ? {
                ...c,
                status: 'ACTIVE',
                aiComplianceScore: Math.min(99, c.aiComplianceScore + 5),
                documents: c.documents.map((d) => ({
                  ...d,
                  status: 'Verified by Document AI',
                })),
              }
            : c
        )
      );
      triggerToast(
        `Google Cloud Document AI berhasil mengekstrak & memvalidasi ke-4 dokumen korporasi untuk ${selectedEntity.legalName}!`
      );
    }, 750);
  }

  function handleAddSubsidiaryNode(e: React.FormEvent) {
    e.preventDefault();
    const countryMeta = MULTI_COUNTRY_DATA[newSubCountry];
    const newNode: SubsidiaryNode = {
      id: `STR-SUB-${Date.now().toString().slice(-4)}`,
      entityName: newSubName,
      tradeName: newSubTradeName,
      role: 'Direct Subsidiary (Anak Perusahaan)',
      countryCode: newSubCountry,
      flag: countryMeta.flag,
      jurisdiction: `${countryMeta.name} (${countryMeta.authorityShort})`,
      taxId: newSubTaxId,
      registrationNo: newSubRegNo,
      directOwnership: Number(newSubOwnership) || 100,
      effectiveOwnership: Number(newSubOwnership) || 100,
      functionalCurrency: countryMeta.currencyCode,
      transferPricingMethod: newSubTpMethod,
      intercompanyTransaction: newSubFlow,
      annualIntercompanyVolume: newSubVolume,
      whtDomesticRate: countryMeta.crossBorderTreatyNote.standardWhtRate,
      whtTreatyRate: countryMeta.crossBorderTreatyNote.treatyWhtRate,
      treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
      complianceScore: 92,
    };

    // Also add as a full entity in Companies list so it can be managed and analyzed
    const newEntityId = `ENT-${newSubCountry}-00${companies.length + 1}`;
    const newCorpEntity: CorporateEntity = {
      ...INITIAL_COMPANIES[1],
      id: newEntityId,
      legalName: newSubName,
      tradeName: newSubTradeName,
      parentCompanyId: selectedEntity.id,
      parentCompanyName: `${selectedEntity.legalName} (${selectedEntity.flag})`,
      ownershipByParent: Number(newSubOwnership) || 100,
      registrationNumber: newSubRegNo,
      taxId: newSubTaxId,
      entityType: 'Subsidiary (Anak Perusahaan)',
      countryCode: newSubCountry,
      jurisdictionName: countryMeta.name,
      flag: countryMeta.flag,
      functionalCurrency: countryMeta.currencyCode,
      taxAuthority: countryMeta.authorityFull,
      intercompanyRole: `Anak Perusahaan (${newSubOwnership}% dimiliki ${selectedEntity.legalName}) • ${newSubFlow}`,
      status: 'ACTIVE',
      aiComplianceScore: 92,
    };

    setCompanies((prev) => [
      ...prev.map((c) =>
        c.id === selectedEntity.id
          ? { ...c, structureNodes: [...c.structureNodes, newNode] }
          : c
      ),
      newCorpEntity,
    ]);
    setShowStructureModal(false);
    triggerToast(
      `Anak perusahaan "${newSubName}" (${countryMeta.flag} ${countryMeta.name}) berhasil ditambahkan ke Company Structure & daftar Companies!`
    );
  }

  function handleOpenAddShareholder() {
    setEditingShId(null);
    setNewShName('');
    setNewShRegNo('');
    setNewShJurisdiction('🇸🇬 Singapore');
    setNewShTaxId('');
    setNewShPercent('15');
    setNewShAddress('');
    setNewShEmail('');
    setShowShareholderModal(true);
  }

  function handleOpenEditShareholder(sh: IntermediateShareholder) {
    setEditingShId(sh.id);
    setNewShName(sh.name);
    setNewShRegNo(sh.registrationNo);
    setNewShJurisdiction(sh.jurisdiction);
    setNewShTaxId(sh.taxId);
    setNewShPercent(String(sh.sharePercent));
    setNewShAddress(sh.address);
    setNewShEmail(sh.contactEmail);
    setShowShareholderModal(true);
  }

  function handleAddShareholder(e: React.FormEvent) {
    e.preventDefault();
    if (editingShId) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedEntity.id
            ? {
                ...c,
                intermediateShareholders: c.intermediateShareholders.map((s) =>
                  s.id === editingShId
                    ? {
                        ...s,
                        name: newShName,
                        registrationNo: newShRegNo,
                        jurisdiction: newShJurisdiction,
                        taxId: newShTaxId,
                        sharePercent: Number(newShPercent) || s.sharePercent,
                        votingRightPercent: Number(newShPercent) || s.votingRightPercent,
                        address: newShAddress,
                        contactEmail: newShEmail,
                      }
                    : s
                ),
              }
            : c
        )
      );
      setShowShareholderModal(false);
      triggerToast(
        `Intermediate Shareholder "${newShName}" (${editingShId}) berhasil diperbarui!`
      );
      setEditingShId(null);
      return;
    }

    const nextNum = selectedEntity.intermediateShareholders.length + 1;
    const newSh: IntermediateShareholder = {
      id: `INT-0000${nextNum}`,
      type: 'Intermediate Shareholder',
      name: newShName,
      registrationNo: newShRegNo,
      jurisdiction: newShJurisdiction,
      taxId: newShTaxId,
      sharePercent: Number(newShPercent) || 15,
      votingRightPercent: Number(newShPercent) || 15,
      effectiveDate: '2026-10-18',
      status: 'Active',
      bepsRisk:
        newShJurisdiction.toLowerCase().includes('cayman') ||
        newShJurisdiction.toLowerCase().includes('bvi')
          ? 'High (Conduit / Treaty Shopping Risk)'
          : 'Low (Substantial Activity)',
      address: newShAddress,
      contactEmail: newShEmail,
    };
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === selectedEntity.id
          ? {
              ...c,
              intermediateShareholders: [...c.intermediateShareholders, newSh],
            }
          : c
      )
    );
    setShowShareholderModal(false);
    triggerToast(
      `Intermediate Shareholder "${newSh.name}" (${newSh.id}) berhasil disimpan & lolos skrining OECD BEPS Action 6!`
    );
  }

  function handleDeleteShareholder(shId: string) {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === selectedEntity.id
          ? {
              ...c,
              intermediateShareholders: c.intermediateShareholders.filter(
                (s) => s.id !== shId
              ),
            }
          : c
      )
    );
    triggerToast(`Pemegang saham perantara ${shId} telah dihapus.`);
  }

  function handleAddIndividualShareholder(e: React.FormEvent) {
    e.preventDefault();
    const nextNum = selectedEntity.individualShareholders.length + 1;
    const newInd: IndividualShareholder = {
      id: `IND-0000${nextNum}`,
      type: newIndType,
      fullName: newIndName,
      roleTitle: newIndRole,
      nationality: newIndNationality,
      taxResidency: newIndResidency,
      nationalIdOrPassport: newIndNationalId,
      personalTaxId: newIndTaxId,
      directSharePercent: Number(newIndDirectShare) || 10,
      effectiveSharePercent: Number(newIndEffectiveShare) || Number(newIndDirectShare) || 10,
      votingRightPercent: Number(newIndEffectiveShare) || Number(newIndDirectShare) || 10,
      dividendTaxRegime: newIndDividendRegime,
      pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
      kycDocStatus: 'Verified by Document AI',
      status: 'Active',
      address: newIndAddress,
      email: newIndEmail,
    };
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === selectedEntity.id
          ? {
              ...c,
              individualShareholders: [...c.individualShareholders, newInd],
            }
          : c
      )
    );
    setShowIndividualModal(false);
    triggerToast(
      `Individual Shareholder "${newInd.fullName}" (${newInd.id}) berhasil ditambahkan & diverifikasi Document AI KYC!`
    );
  }

  function handleDeleteIndividualShareholder(indId: string) {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === selectedEntity.id
          ? {
              ...c,
              individualShareholders: c.individualShareholders.filter(
                (s) => s.id !== indId
              ),
            }
          : c
      )
    );
    triggerToast(`Individual Shareholder ${indId} telah dihapus.`);
  }

  function handleDeleteCompany(compId: string, compName: string) {
    if (companies.length <= 1) {
      triggerToast('Tidak dapat menghapus satu-satunya entitas induk.');
      return;
    }
    const remaining = companies.filter((c) => c.id !== compId);
    setCompanies(remaining);
    if (selectedEntityId === compId) {
      setSelectedEntityId(remaining[0].id);
    }
    triggerToast(`Entitas ${compName} telah dihapus dari daftar.`);
  }



  async function handleAskFloatingAi(customPrompt?: string) {
    const q = (customPrompt ?? chatInput).trim();
    if (!q || isChatLoading) return;
    setIsChatOpen(true);
    const entityLabel = `${selectedEntity.flag} ${selectedEntity.legalName} (${selectedEntity.entityType})`;
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', text: q, entityLabel },
    ]);
    if (!customPrompt) setChatInput('');
    setIsChatLoading(true);
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `[Entitas Aktif: ${selectedEntity.legalName} | Tipe: ${selectedEntity.entityType} | Induk: ${selectedEntity.parentCompanyName} | Negara: ${selectedEntity.jurisdictionName}] ${q}`,
          country: activeCountry,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          entityLabel,
          text: data.reply || 'Analisis selesai.',
          citations: data.citations || [],
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          entityLabel,
          text: 'Layanan AI sedang memproses data. Silakan coba kembali.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col pb-24">
      {/* =====================================================================
          1. TOP WHITE HEADER BAR (EXACT FIGMA 2 LAYOUT — CLEAN, NO EXTRA BUTTONS)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo (Nexora) */}
          <div
            onClick={() => {
              setPrimaryNav('companies');
              setSubNav('corporate');
              setCorpViewTab('directory');
            }}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-rose-500/20 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-[#0F172A]">
                  Nexora
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                  Tax Platform
                </span>
              </div>
              <span className="block text-[11px] text-slate-400 -mt-0.5 font-medium">
                Multi-Country Corporate Tax &amp; Fraud Prevention
              </span>
            </div>
          </div>

          {/* Center: Primary Navigation Tabs (`Companies | Calculation | Tax Return | Payment`) */}
          <nav className="hidden md:flex items-center h-full gap-1">
            {[
              { id: 'companies', label: 'Companies' },
              { id: 'calculation', label: 'Calculation' },
              { id: 'tax_return', label: 'Tax Return' },
              { id: 'payment', label: 'Payment' },
            ].map((item) => {
              const active = primaryNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPrimaryNav(item.id as PrimaryNav)}
                  className={`h-full px-5 text-sm font-semibold border-b-2 flex items-center transition-all cursor-pointer ${
                    active
                      ? 'border-rose-600 text-rose-600 font-bold shadow-[0_2px_0_0_#E11D48]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Search, Notifications & RBAC Switcher */}
          <div className="relative flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Pencarian Global & Command Palette (Cmd+K)"
            >
              <Search className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">⌘K</span>
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotificationCenter((prev) => !prev);
                  setShowAccountDropdown(false);
                }}
                className={`p-2 rounded-xl border text-slate-600 hover:text-slate-900 cursor-pointer relative transition-colors ${
                  showNotificationCenter
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
                title="Pusat Notifikasi Kepatuhan"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              </button>

              <NotificationCenter
                isOpen={showNotificationCenter}
                onClose={() => setShowNotificationCenter(false)}
                onNavigate={(p, s, c) => {
                  if (p) setPrimaryNav(p as PrimaryNav);
                  if (s) setSubNav(s as SubNav);
                  if (c) setCorpViewTab(c as CorporateViewTab);
                }}
              />
            </div>

            <button
              onClick={() => {
                setShowRbacModal(true);
                setShowAccountDropdown(false);
                setShowNotificationCenter(false);
              }}
              className="flex items-center gap-2.5 p-1.5 px-3 hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl transition cursor-pointer text-left shadow-2xs hover:shadow-xs"
              title="Hak Akses & Peran Karyawan Korporasi (RBAC Governance)"
            >
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-lg ${activePersona.avatarBg} text-white flex items-center justify-center font-extrabold text-xs shadow-xs`}
                >
                  {activePersona.avatarInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="block text-xs font-bold text-slate-800 leading-tight">
                    {activePersona.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    isGroupCeoOrParentExecutive
                      ? 'bg-blue-100 text-[#2563EB]'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activePersona.badge}
                  </span>
                </div>
                <span className="block text-[10px] text-slate-500 truncate max-w-[240px]">
                  {activePersona.title}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Premium Enterprise Account Dropdown Popover */}
            {showAccountDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px]"
                  onClick={() => setShowAccountDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[440px] md:w-[460px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 sm:p-5 z-50 text-slate-900">
                  {/* Current Active Account Card */}
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                    <div
                      className={`w-11 h-11 rounded-xl ${activePersona.avatarBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs`}
                    >
                      {activePersona.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {activePersona.name}
                        </h4>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Aktif
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                        {activePersona.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {activePersona.organization}
                      </p>
                    </div>
                  </div>

                  {/* Governance & Compliance Badge */}
                  <div className="py-2.5 px-3 my-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB]">
                        TATA KELOLA RBAC &amp; ISO 27001
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isGroupCeoOrParentExecutive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isGroupCeoOrParentExecutive ? 'Universal Scope' : 'Restricted Scope'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[10px] leading-relaxed">
                      {isGroupCeoOrParentExecutive
                        ? '👑 Karyawan CEO/setara dari Perusahaan Induk memiliki visibilitas penuh ke seluruh 4 entitas grup.'
                        : `🔒 Karyawan anak usaha dibatasi pada yurisdiksi lokal (${activePersona.jurisdiction}). Entitas lain terkunci sesuai segregasi ISO 27001.`}
                    </p>
                  </div>

                  {/* Quick Role Switcher */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                      Peralihan Cepat Peran Karyawan (RBAC)
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {USER_PERSONAS.map((p) => {
                        const isCurrent = p.id === activePersonaId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActivePersonaId(p.id);
                              if (!p.canViewAll && !p.accessibleEntityIds.includes(selectedEntityId)) {
                                setSelectedEntityId(p.accessibleEntityIds[0]);
                              }
                              setShowAccountDropdown(false);
                              triggerToast(`Beralih ke Peran: ${p.name} (${p.title})`);
                            }}
                            className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-50 border border-blue-300 shadow-2xs'
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-md ${p.avatarBg} text-white flex items-center justify-center font-bold text-[10px] shrink-0`}
                              >
                                {p.avatarInitials}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 truncate">
                                  {p.name.split(',')[0]}
                                </span>
                                <span className="block text-[10px] text-slate-500 truncate">
                                  {p.badge}
                                </span>
                              </div>
                            </div>
                            {isCurrent ? (
                              <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Trigger & Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountDropdown(false);
                        setShowRbacModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Buka Matriks RBAC &amp; ISO 27001</span>
                    </button>
                    {!isGroupCeoOrParentExecutive && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePersonaId('ceo_parent');
                          setShowAccountDropdown(false);
                          triggerToast('Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk)');
                        }}
                        className="w-full py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span>Beralih ke Group CEO Induk (Akses Penuh)</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================================================================
            2. SECOND-LEVEL SUB-NAV BAR (NAVY #0F172A - FIGMA SOURCE OF TRUTH)
           =================================================================== */}
        <div className="bg-[#0F172A] border-b border-slate-800 text-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-11 flex items-center justify-between">
            <div className="flex items-center gap-1.5 h-full overflow-x-auto">
              {[
                { id: 'corporate', label: 'Corporate', icon: Building2 },
                { id: 'individual', label: 'Individual Shareholder', icon: Users },
                { id: 'studies', label: 'Studies', icon: BookOpen },
                { id: 'calendar', label: 'Tax Calendar', icon: Calendar },
                { id: 'reports', label: 'Reports', icon: BarChart3 },
              ].map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  primaryNav === 'companies' && subNav === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setPrimaryNav('companies');
                      setSubNav(sub.id as SubNav);
                    }}
                    className={`h-full px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'border-[#3B82F6] text-white bg-blue-500/10 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3B82F6]' : 'text-slate-400'}`} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Google Cloud Document AI & BigQuery Live Status */}
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Google Cloud Document AI + BigQuery Connected
              </span>

              <DataPersistenceControl onResetSampleData={handleResetSampleData} />
              
              {/* Interactive Multi-Country Active Entity Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEntityQuickSelect((prev) => !prev)}
                  className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/80 shadow-xs transition cursor-pointer"
                  title="Pilih Entitas Aktif (Holding & Anak Perusahaan)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>
                    Entitas: <strong className="text-white">{selectedEntity.flag} {selectedEntity.legalName}</strong>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${showEntityQuickSelect ? 'rotate-180 text-white' : ''}`} />
                </button>

                {showEntityQuickSelect && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowEntityQuickSelect(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 z-50 text-slate-900 space-y-1">
                      <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                        <span>Pilih Entitas Aktif</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                          isGroupCeoOrParentExecutive ? 'bg-blue-50 text-[#2563EB]' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {isGroupCeoOrParentExecutive ? '👑 Holding Scope' : '🔒 Segregated Scope'}
                        </span>
                      </div>
                      {companies.map((comp) => {
                        const isSelected = comp.id === selectedEntity.id;
                        const isAllowed = isGroupCeoOrParentExecutive || activePersona.accessibleEntityIds.includes(comp.id);
                        return (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => {
                              if (!isAllowed) {
                                setShowEntityQuickSelect(false);
                                setRestrictedNoticeEntity(comp);
                                return;
                              }
                              setSelectedEntityId(comp.id);
                              setShowEntityQuickSelect(false);
                              triggerToast(`Beralih ke entitas: ${comp.flag} ${comp.legalName}`);
                            }}
                            className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-[#2563EB] font-bold border border-blue-200 shadow-2xs'
                                : isAllowed
                                ? 'hover:bg-slate-50 text-slate-700'
                                : 'opacity-55 hover:opacity-85 text-slate-400 bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg shrink-0">{comp.flag}</span>
                              <div className="min-w-0">
                                <span className="block text-xs truncate font-bold text-slate-800">
                                  {comp.legalName}
                                </span>
                                <span className="block text-[10px] text-slate-400 truncate">
                                  {comp.jurisdictionName} • {comp.taxAuthority.split('(')[0].trim()}
                                </span>
                              </div>
                            </div>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                            ) : !isAllowed ? (
                              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Flow Stepper */}
      <HeroStepper
        currentStep={currentHeroStep}
        onSelectStep={handleHeroStepSelect}
        entityName={`${selectedEntity.flag} ${selectedEntity.legalName}`}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 max-w-md bg-[#0F172A] text-white px-4 py-3 rounded-xl shadow-xl border border-blue-500/40 flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace: Company Structure now lives in its dedicated tab (subNav === 'structure') */}

      {/* =====================================================================
          4. MAIN WORKSPACE CONTENT
         ===================================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6">
        {/* ===================================================================
            PRIMARY TAB 1: COMPANIES
           =================================================================== */}
        {primaryNav === 'companies' && (
          <>
            {/* ---------------------------------------------------------------
                SUB-NAV 1: CORPORATE MANAGEMENT (COMPLETE FIGMA 1 + FIGMA 2 WORKSPACE)
               --------------------------------------------------------------- */}
            {subNav === 'corporate' && (
              <div className="space-y-6">
                {/* =============================================================
                    GROUP ENTITIES (INDUK & ANAK PERUSAHAAN) ENTERPRISE HUB
                    STANDAR TATA KELOLA KORPORASI INTERNASIONAL (ISO 27001 & OECD CbCR)
                   ============================================================= */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 text-slate-900 shadow-xs border border-slate-200/90 space-y-5">
                  {/* Header: Title, Compliance Badges, RBAC Switcher & Consolidated View */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          OECD Pillar Two &amp; ISO/IEC 27001 Access Governance
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Multi-Entity Consolidated Control
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                          1 Induk + 3 Anak Usaha
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                        <GitBranch className="w-5 h-5 text-rose-600" />
                        GROUP ENTITIES (INDUK &amp; ANAK PERUSAHAAN)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
                        Struktur Korporasi Grup: <strong className="text-slate-900">PT Nusantara Kreasi Digital Tbk (Induk)</strong> mengonsolidasi 3 Anak Perusahaan di 🇸🇬 Singapura, 🇲🇾 Malaysia, dan 🇺🇸 Amerika Serikat. Selaras standar tata kelola internasional, pemegang peran eksekutif induk memiliki visibilitas konsolidasian penuh.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {/* Active Persona / RBAC Switcher */}
                      <button
                        type="button"
                        onClick={() => setShowRbacModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center gap-2.5 cursor-pointer shadow-2xs hover:border-slate-300"
                        title="Klik untuk mengubah Hak Akses / Peran Karyawan"
                      >
                        <div className={`w-8 h-8 rounded-lg ${activePersona.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                          {activePersona.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">
                              {activePersona.name.split(',')[0]}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-extrabold">
                              {activePersona.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block -mt-0.5">
                            {isGroupCeoOrParentExecutive ? 'Akses Penuh Seluruh Grup' : 'Akses Terbatas Lokal'} • Ganti Peran ▾
                          </span>
                        </div>
                      </button>

                      {/* Consolidated Overview Modal Button */}
                      <button
                        type="button"
                        onClick={() => setShowConsolidationModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer hover:shadow-md"
                      >
                        <Globe2 className="w-4 h-4" />
                        <span>Konsolidasi Seluruh Grup</span>
                      </button>
                    </div>
                  </div>

                  {/* Access Policy Notification Banner */}
                  <div className={`px-4 py-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
                    isGroupCeoOrParentExecutive
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {isGroupCeoOrParentExecutive ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>
                        {isGroupCeoOrParentExecutive ? (
                          <>
                            <strong>Hak Akses Eksekutif Terverifikasi:</strong> Sebagai CEO/setara dari Perusahaan Induk (PT Nusantara Kreasi Digital Tbk), Anda memiliki wewenang penuh melihat seluruh entitas induk &amp; anak perusahaan (100% Group Visibility sesuai standar enterprise internasional).
                          </>
                        ) : (
                          <>
                            <strong>Segregasi Hak Akses Aktif:</strong> Anda sedang masuk sebagai karyawan anak usaha (<span className="underline font-semibold">{activePersona.title}</span>). Sesuai ISO 27001, entitas lain dikunci. Hanya CEO/C-Level dari Perusahaan Induk yang berhak melihat semua entitas.
                          </>
                        )}
                      </span>
                    </div>

                    {!isGroupCeoOrParentExecutive && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePersonaId('ceo_parent');
                          triggerToast('Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk)');
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer shrink-0"
                      >
                        Aktifkan Mode CEO Induk →
                      </button>
                    )}
                  </div>

                  {/* 4 Multi-Country Corporate Entity Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {companies.map((comp) => {
                      const isSelected = comp.id === selectedEntity.id;
                      const isAccessible =
                        activePersona.canViewAll ||
                        activePersona.accessibleEntityIds.includes(comp.id);
                      const isParent = comp.parentCompanyId === null;

                      return (
                        <div
                          key={comp.id}
                          onClick={() => handleSelectEntity(comp)}
                          className={`group relative rounded-2xl p-4.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-rose-50/30 border-2 border-rose-600 shadow-md ring-2 ring-rose-500/10 -translate-y-0.5'
                              : isAccessible
                              ? 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                              : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-85'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Aktif Dipilih
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl filter drop-shadow-xs">{comp.flag}</span>
                                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                  {comp.jurisdictionName}
                                </div>
                              </div>

                              {isParent ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  Induk
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs font-mono tabular-nums">
                                  <Building2 className="w-3 h-3 text-emerald-600" />
                                  Anak Usaha ({comp.ownershipByParent}%)
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-rose-600 transition-colors">
                              {comp.legalName}
                            </h3>

                            <p className="text-[11px] text-slate-500 line-clamp-1 mb-3 font-medium">
                              {comp.tradeName}
                            </p>

                            <div className="space-y-1.5 mb-3 text-[10px]">
                              <div className="flex items-center justify-between text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 font-mono tabular-nums">
                                <span className="text-slate-500 font-sans">Tax ID:</span>
                                <span className="font-bold text-slate-800 truncate ml-2 text-right">
                                  {comp.taxId}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[10px] px-1">
                                <span>Otoritas:</span>
                                <span className="text-slate-700 truncate ml-2 text-right font-medium">
                                  {comp.taxAuthority.split('(')[0].trim()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-slate-600 font-medium">
                                Score: <strong className="text-slate-900 font-mono tabular-nums">{comp.aiComplianceScore}/100</strong>
                              </span>
                            </div>

                            {isAccessible ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Terbuka
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600" />
                                Terkunci (CEO)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Clean Page Header + Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                      CORPORATE MANAGEMENT
                    </span>
                    <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {corpViewTab === 'directory'
                        ? 'Companies & Multi-Country Subsidiaries'
                        : `${selectedEntity.flag} ${selectedEntity.legalName}`}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Corporate profile, legal documents, and the full shareholder & subsidiary ownership tree for every entity in the group.
                    </p>
                  </div>

                  {/* Clean Segmented View Switcher + Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80 shadow-inner text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCorpViewTab('all_in_one')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                          corpViewTab === 'all_in_one' ||
                          corpViewTab === 'corporate_form'
                            ? 'bg-white text-slate-900 shadow-sm font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        Corporate Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorpViewTab('subsidiaries_tree')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                          corpViewTab === 'subsidiaries_tree'
                            ? 'bg-white text-slate-900 shadow-sm font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        Company Structure
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorpViewTab('directory')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          corpViewTab === 'directory'
                            ? 'bg-white text-slate-900 shadow-sm font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <span>Company List</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-bold font-mono tabular-nums">
                          {companies.length}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartAddNewCompany}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition cursor-pointer hover:-translate-y-0.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Company</span>
                    </button>
                  </div>
                </div>

                {/* ===========================================================
                    PART A: COMPANY DIRECTORY VIEW (SCREEN 1 OF FIGMA)
                   =========================================================== */}
                {corpViewTab === 'directory' && (
                  <div className="space-y-6">
                    {/* RBAC Governance Status Banner */}
                    <div className={`p-4 rounded-2xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs ${
                      isGroupCeoOrParentExecutive
                        ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/90 text-emerald-950'
                        : 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white border-amber-200/90 text-amber-950'
                    }`}>
                      <div className="flex items-start md:items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isGroupCeoOrParentExecutive ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isGroupCeoOrParentExecutive ? <Crown className="w-5 h-5 text-amber-300" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-[#2563EB]">
                              Role-Based Access Control (RBAC) • ISO 27001 &amp; OECD Action 13
                            </span>
                            <span className="font-bold text-xs text-slate-800">
                              {activePersona.name} ({activePersona.badge})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isGroupCeoOrParentExecutive
                              ? 'Sesuai standar tata kelola perusahaan internasional, karyawan dengan posisi CEO/setara dari Perusahaan Induk (Holding) memiliki visibilitas penuh ke seluruh entitas.'
                              : `Segregasi hak akses aktif: Anda masuk sebagai karyawan anak usaha (${activePersona.organization}). Sesuai ISO 27001, entitas di luar yurisdiksi Anda dikunci. Hanya CEO/setara dari Perusahaan Induk yang berhak melihat semua entitas.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {!isGroupCeoOrParentExecutive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePersonaId('ceo_parent');
                              triggerToast('Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk)');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                            <span>Beralih ke Mode CEO Induk</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setShowRbacModal(true)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Kelola Hak Akses (RBAC)</span>
                        </button>
                      </div>
                    </div>

                    {/* 3 Summary KPI Cards matching Figma 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="bg-gradient-to-br from-white to-blue-50/20 rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                            {companies.length}
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            REGISTERED COMPANIES
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white to-emerald-50/20 rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                            {companies.filter((c) => c.status === 'ACTIVE').length}
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            ACTIVE ENTITIES
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white to-amber-50/20 rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                            {companies.filter((c) => c.status === 'PENDING').length}
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            ACTION REQUIRED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Company List Table Card matching Figma 2 */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            Company List
                          </h2>
                          <p className="text-xs text-slate-500">
                            Showing {filteredCompanies.length} of {companies.length} companies — click a row to open its profile & ownership tree
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                            {(
                              [
                                { id: 'ALL', label: 'All' },
                                { id: 'PARENT', label: 'Parent (Induk)' },
                                { id: 'SUBSIDIARY', label: 'Subsidiaries' },
                              ] as const
                            ).map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setEntityRoleFilter(f.id)}
                                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                                  entityRoleFilter === f.id
                                    ? 'bg-[#2563EB] text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>

                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Search companies..."
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              className="pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs w-52 sm:w-64 focus:outline-none focus:border-[#2563EB]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="py-3.5 px-5">COMPANY</th>
                              <th className="py-3.5 px-5">REGISTRATION / TAX ID</th>
                              <th className="py-3.5 px-5">ENTITY TYPE & PARENT</th>
                              <th className="py-3.5 px-5">JURISDICTION</th>
                              <th className="py-3.5 px-5">STATUS</th>
                              <th className="py-3.5 px-5 text-right">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                            {filteredCompanies.map((comp) => {
                              const isCurrent = comp.id === selectedEntity.id;
                              const isAccessible =
                                activePersona.canViewAll ||
                                activePersona.accessibleEntityIds.includes(comp.id);

                              return (
                                <tr
                                  key={comp.id}
                                  onClick={() => {
                                    if (!isAccessible) {
                                      setRestrictedNoticeEntity(comp);
                                      return;
                                    }
                                    setSelectedEntityId(comp.id);
                                    setCorpViewTab('all_in_one');
                                  }}
                                  className={`transition cursor-pointer ${
                                    isCurrent
                                      ? 'bg-blue-50/60'
                                      : !isAccessible
                                      ? 'bg-slate-50/40 hover:bg-amber-50/40 opacity-80'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                                          isCurrent
                                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                            : !isAccessible
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-blue-50 text-[#2563EB] border-blue-100'
                                        }`}
                                      >
                                        {!isAccessible ? (
                                          <Lock className="w-4 h-4 text-amber-600" />
                                        ) : (
                                          <Building2 className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 block">
                                            {comp.legalName}
                                          </span>
                                          {!isAccessible && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                              🔒 Locked (ISO 27001)
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-slate-500 block">
                                          {comp.taxAuthority}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5 font-mono text-xs text-slate-700">
                                    <span className="font-semibold block">
                                      {comp.taxId}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {comp.registrationNumber}
                                    </span>
                                  </td>
                                  <td className="py-4 px-5 text-xs">
                                    <span className="font-bold text-slate-800 block">
                                      {comp.entityType}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {comp.parentCompanyId === null
                                        ? 'Ultimate Parent (Induk Grup)'
                                        : `Parent: ${comp.parentCompanyName} (${comp.ownershipByParent}%)`}
                                    </span>
                                  </td>
                                  <td className="py-4 px-5 text-xs font-semibold text-slate-800">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="text-base">{comp.flag}</span>
                                      <span>{comp.jurisdictionName}</span>
                                    </span>
                                  </td>
                                  <td className="py-4 px-5">
                                    {!isAccessible ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        <Lock className="w-3 h-3 text-amber-600" />
                                        Akses Dibatasi
                                      </span>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                          comp.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            comp.status === 'ACTIVE'
                                              ? 'bg-emerald-500'
                                              : 'bg-amber-500'
                                          }`}
                                        />
                                        {comp.status}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className="py-4 px-5 text-right"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {!isAccessible ? (
                                      <button
                                        type="button"
                                        onClick={() => setRestrictedNoticeEntity(comp)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition cursor-pointer shadow-2xs"
                                        title="Memerlukan Otorisasi CEO Perusahaan Induk (ISO 27001)"
                                      >
                                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Otorisasi CEO Induk</span>
                                      </button>
                                    ) : (
                                      <div className="inline-flex items-center gap-2 text-xs font-bold">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedEntityId(comp.id);
                                            setCorpViewTab('all_in_one');
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 transition cursor-pointer"
                                          title="View & Edit Corporate Information Form"
                                        >
                                          View Form
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedEntityId(comp.id);
                                            setStructureModalTab('tp_tax');
                                            setShowStructureModal(true);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer flex items-center gap-1"
                                          title="View Company Structure & Subsidiaries"
                                        >
                                          <GitBranch className="w-3 h-3 text-slate-500" />
                                          <span>Structure</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteCompany(
                                              comp.id,
                                              comp.legalName
                                            )
                                          }
                                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                                          title="Delete Company"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===========================================================
                    PART B: EXACT FIGMA NODE 201-8 CORPORATE FORM & OWNERSHIP TREE
                    (1. Top Search Box, 2. Corporate Information 2-Col,
                     3. Upload Document, 4. Company Structure Ownership Tree,
                     5. Intermediate & Individual Shareholders Table)
                   =========================================================== */}
                {corpViewTab !== 'directory' && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8">
                    {/* Top Underline Tabs (`Search Existing Company | Manual Input`) + Quick Section Pills */}
                    {corpViewTab !== 'subsidiaries_tree' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 border-b border-slate-200 text-xs sm:text-sm font-bold text-center">
                        <button
                          type="button"
                          onClick={() => setInputMode('search_existing')}
                          className={`py-3 border-b-2 transition cursor-pointer ${
                            inputMode === 'search_existing'
                              ? 'border-slate-900 text-slate-900'
                              : 'border-transparent text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          Search Existing Company
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('manual')}
                          className={`py-3 border-b-2 transition cursor-pointer ${
                            inputMode === 'manual'
                              ? 'border-slate-900 text-slate-900'
                              : 'border-transparent text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          Manual Input
                        </button>
                      </div>

                      {/* Exact Figma 201-8 Top White/Gray Search Box (`Search Company` + `Search` button) */}
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50/20 border border-slate-200/90 rounded-2xl p-4.5 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-[280px]">
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                            Search Company / Tax ID (NPWP / UEN / TIN / EIN)
                          </label>
                          <div className="relative flex-1 sm:max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={registryLookupQuery}
                              onChange={(e) =>
                                setRegistryLookupQuery(e.target.value)
                              }
                              placeholder={`${selectedEntity.taxId} — ${selectedEntity.legalName}`}
                              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 text-xs text-slate-900 font-medium shadow-2xs transition outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                triggerToast(
                                  `Data registrasi pajak untuk "${registryLookupQuery || selectedEntity.legalName}" berhasil disinkronkan!`
                                )
                              }
                              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center"
                            >
                              Search
                            </button>
                          </div>
                        </div>

                        {/* Back to Company Directory */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorpViewTab('directory')}
                            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>← Back to Directory</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* =======================================================
                        SECTION 1: CORPORATE INFORMATION (EXACT FIGMA 201-8 2-COL LAYOUT)
                       ======================================================= */}
                    {(corpViewTab === 'all_in_one' ||
                      corpViewTab === 'corporate_form') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-extrabold text-slate-900">
                            Corporate Information
                          </h3>
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#2563EB] border border-blue-200 text-[11px] font-bold">
                            {selectedEntity.flag} {selectedEntity.jurisdictionName} • {selectedEntity.entityType}
                          </span>
                        </div>

                        {/* Exact Figma 201-8 Asymmetric 2-Column Layout:
                            Left Column: 7 clean stacked gray-filled inputs
                            Right Column: Tall Address textarea + 2 stacked inputs below */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs">
                          {/* Left Column (7 stacked fields matching Figma 201-8) */}
                          <div className="lg:col-span-6 space-y-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Legal Name
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.legalName}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'legalName',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 font-semibold focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Trade Name
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.tradeName}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'tradeName',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Tax Identification Number (NPWP / UEN / TIN / EIN)
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.taxId}
                                onChange={(e) =>
                                  handleUpdateCompanyField('taxId', e.target.value)
                                }
                                className="w-full sm:w-3/5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition font-mono tabular-nums text-slate-900 font-semibold focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Business Registration Number (NIB / AHU / ACRA / SSM)
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.registrationNumber}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'registrationNumber',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition font-mono tabular-nums text-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Country & Tax Jurisdiction
                              </label>
                              <select
                                value={selectedEntity.countryCode}
                                onChange={(e) => {
                                  const code = e.target.value as CountryCode;
                                  const cData = MULTI_COUNTRY_DATA[code];
                                  setCompanies((prev) =>
                                    prev.map((c) =>
                                      c.id === selectedEntity.id
                                        ? {
                                            ...c,
                                            countryCode: code,
                                            jurisdictionName: cData.name,
                                            flag: cData.flag,
                                            taxAuthority: cData.authorityFull,
                                            functionalCurrency: cData.currencyCode,
                                          }
                                        : c
                                    )
                                  );
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 font-semibold focus:outline-none cursor-pointer"
                              >
                                <option value="ID">🇮🇩 Indonesia (DJP Coretax)</option>
                                <option value="SG">🇸🇬 Singapore (IRAS InvoiceNow)</option>
                                <option value="MY">🇲🇾 Malaysia (LHDN MyInvois)</option>
                                <option value="US">🇺🇸 United States (IRS MeF)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Business Classification (KBLI / KLU / SSIC / MSIC)
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.businessClassification}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'businessClassification',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Fiscal Year & Paid-Up Capital
                              </label>
                              <input
                                type="text"
                                value={`${selectedEntity.fiscalYearEnd} • ${selectedEntity.paidUpCapital}`}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'fiscalYearEnd',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Right Column (Tall Company Address Box + 2 inputs below matching Figma 201-8) */}
                          <div className="lg:col-span-6 space-y-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Company Address
                              </label>
                              <textarea
                                rows={5}
                                value={`${selectedEntity.address}\n${selectedEntity.cityAndPostal}`}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'address',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                Tax Office / Authority
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.taxOfficeName}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'taxOfficeName',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition text-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1.5">
                                NITKU / Branch ID & Authorized Tax Officer
                              </label>
                              <input
                                type="text"
                                value={`${selectedEntity.nitkuOrBranchId} • ${selectedEntity.authorizedTaxOfficer}`}
                                onChange={(e) =>
                                  handleUpdateCompanyField(
                                    'nitkuOrBranchId',
                                    e.target.value
                                  )
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 bg-white text-xs shadow-2xs transition font-mono tabular-nums text-slate-900 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        SECTION 2: UPLOAD DOCUMENT (CLEAN FIGMA 201-8 SPLIT-BUTTON DESIGN)
                       ======================================================= */}
                    {(corpViewTab === 'all_in_one' ||
                      corpViewTab === 'corporate_form') && (
                      <div className="pt-6 border-t border-slate-200 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                              Upload Document
                            </h3>
                            <p className="text-xs text-slate-500">
                              Mandatory legal & tax documents, auto-extracted and verified with Google Cloud Document AI
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRunDocAiVerification}
                            disabled={isDocAiRunning}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold transition cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isDocAiRunning ? 'animate-spin' : ''
                              }`}
                            />
                            <span>
                              {isDocAiRunning
                                ? 'Scanning Document AI...'
                                : 'Verify All Documents (Document AI)'}
                            </span>
                          </button>
                        </div>

                        {/* Document AI Scanning Progress Bar */}
                        {isDocAiRunning && (
                          <div className="mb-4 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-blue-900 flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                                Memindai Dokumen Statutory dengan Google Cloud Document AI OCR...
                              </span>
                              <span className="font-mono tabular-nums text-blue-800 font-bold">99.2%</span>
                            </div>
                            <div
                              role="progressbar"
                              aria-valuenow={99}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label="Progress pemindaian Document AI"
                              className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
                            >
                              <div
                                className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out animate-pulse"
                                style={{ width: '99.2%' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Figma 201-8 Clean 2-Column Document Rows with Segmented `[ View | Upload ↑ ]` Bars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedEntity.documents.map((doc, index) => (
                            <div key={doc.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold text-slate-800">
                                  {index + 1}. {doc.label}
                                </label>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono tabular-nums ${
                                    doc.status === 'Verified by Document AI'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  ✓ {doc.confidenceScore}% AI Verified
                                </span>
                              </div>

                              {/* Exact Figma 201-8 Segmented Gray/Blue Bar: `[ View  |  Upload ↑ ]` */}
                              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs divide-x divide-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#2563EB] transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRunDocAiVerification}
                                  className="py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-bold text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition cursor-pointer"
                                >
                                  <span>Upload</span>
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5 font-mono tabular-nums">
                                <span className="truncate">
                                  📄 {doc.fileName} ({doc.fileSize})
                                </span>
                                <span className="text-slate-400 shrink-0 font-sans">
                                  {doc.uploadedAt}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        SECTION 3: COMPANY STRUCTURE — INTERACTIVE SHAREHOLDER & COMPANY OWNERSHIP TREE
                        (VISUAL ORG-CHART TREE + FIGMA 201-8 INDENTED HIERARCHY TREE)
                       ======================================================= */}
                    {(corpViewTab === 'all_in_one' ||
                      corpViewTab === 'subsidiaries_tree' ||
                      corpViewTab === 'corporate_form') && (
                      <div className="space-y-5 pt-6 border-t border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-slate-900">
                                Company Structure — Shareholder & Corporate Ownership Tree
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-bold">
                                Multi-Tier Ownership Tree
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Individual shareholders (UBO) & corporate shareholders → parent company → multi-country subsidiaries.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowIndividualModal(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>+ Add Individual Node</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowShareholderModal(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>+ Add Corporate Shareholder</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStructureModalTab('general');
                                setShowStructureModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Subsidiary Company</span>
                            </button>
                          </div>
                        </div>

                        {/* ===================================================
                            PART 3A: VISUAL INTERACTIVE MULTI-TIER OWNERSHIP TREE DIAGRAM
                            (TIER 1: INDIVIDUAL & CORPORATE SHAREHOLDERS -> TIER 2: PARENT COMPANY -> TIER 3: SUBSIDIARIES)
                           =================================================== */}
                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/90 p-5 sm:p-6 shadow-2xs overflow-x-auto">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-[#2563EB]" />
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                Visual Ownership & Shareholder Tree Diagram ({selectedEntity.flag} {selectedEntity.legalName})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                                <span className="text-slate-600">Individual Shareholder / UBO (Individual)</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                                <span className="text-slate-600">Intermediate Corporate Shareholder (Company)</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] inline-block" />
                                <span className="text-slate-600">Parent & Subsidiary Entities (Company)</span>
                              </span>
                            </div>
                          </div>

                          <div className="min-w-[780px] flex flex-col items-center">
                            {/* -------------------------------------------------
                                TIER 1: UPSTREAM SHAREHOLDERS (INDIVIDUAL UBOs + INTERMEDIATE CORPORATE SHAREHOLDERS)
                               ------------------------------------------------- */}
                            <div className="w-full">
                              <div className="text-center mb-3">
                                <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                                  TIER 1 — UPSTREAM SHAREHOLDERS (INDIVIDUAL UBO & INTERMEDIATE CORPORATE SHAREHOLDERS)
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-3 relative">
                                {/* Render Individual Shareholders / UBO Cards in Tier 1 */}
                                {selectedEntity.individualShareholders.map((ind) => (
                                  <div
                                    key={ind.id}
                                    className="flex flex-col items-center"
                                  >
                                    <div className="w-full flex-1 rounded-xl bg-white border-2 border-emerald-500/80 p-3 shadow-xs hover:shadow-md transition relative">
                                      <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                                          Individual
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                          {ind.id}
                                        </span>
                                      </div>
                                      <div className="text-xs font-extrabold text-slate-900 leading-snug">
                                        👤 {ind.fullName}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {ind.roleTitle}
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-600 font-medium">
                                          {ind.nationality}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-extrabold border border-emerald-200">
                                          Direct: {ind.directSharePercent}% | UBO: {ind.effectiveSharePercent}%
                                        </span>
                                      </div>
                                      <div className="mt-1 text-[9px] font-mono text-slate-400 truncate">
                                        {ind.personalTaxId}
                                      </div>
                                    </div>
                                    {/* Vertical Stem Down from Individual Node */}
                                    <div className="w-0.5 h-5 bg-emerald-500" />
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold shadow-2xs">
                                      {ind.directSharePercent > 0
                                        ? `${ind.directSharePercent}% Direct`
                                        : `${ind.effectiveSharePercent}% Indirect UBO`}
                                    </span>
                                    <div className="w-0.5 h-4 bg-emerald-500" />
                                  </div>
                                ))}

                                {/* Render Intermediate Corporate Shareholders in Tier 1 */}
                                {selectedEntity.intermediateShareholders
                                  .slice(0, 4 - selectedEntity.individualShareholders.length)
                                  .map((sh) => (
                                    <div
                                      key={sh.id}
                                      className="flex flex-col items-center"
                                    >
                                      <div className="w-full flex-1 rounded-xl bg-white border-2 border-indigo-500/80 p-3 shadow-xs hover:shadow-md transition relative">
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                          <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white text-[9px] font-extrabold uppercase">
                                            Company
                                          </span>
                                          <span className="font-mono text-[10px] font-bold text-slate-500">
                                            {sh.id}
                                          </span>
                                        </div>
                                        <div className="text-xs font-extrabold text-slate-900 leading-snug">
                                          🏢 {sh.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                          {sh.type}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                          <span className="text-slate-600 font-medium">
                                            {sh.jurisdiction}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] font-mono font-extrabold border border-blue-200">
                                            Share: {sh.sharePercent}%
                                          </span>
                                        </div>
                                        <div className="mt-1 text-[9px] font-mono text-slate-400 truncate">
                                          {sh.taxId}
                                        </div>
                                      </div>
                                      {/* Vertical Stem Down from Corporate Shareholder Node */}
                                      <div className="w-0.5 h-5 bg-indigo-500" />
                                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-[9px] font-bold shadow-2xs">
                                        {sh.sharePercent}% Share
                                      </span>
                                      <div className="w-0.5 h-4 bg-indigo-500" />
                                    </div>
                                  ))}
                              </div>

                              {/* Horizontal Collector Bus Line connecting all Tier 1 Shareholders into Tier 2 Parent */}
                              <div className="w-3/4 mx-auto h-0.5 bg-gradient-to-r from-emerald-500 via-[#2563EB] to-indigo-500" />
                              <div className="flex flex-col items-center">
                                <div className="w-0.5 h-5 bg-[#2563EB]" />
                                <span className="px-3 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-300 text-[10px] font-extrabold shadow-2xs">
                                  ▼ 100% Consolidated Shareholding & Voting Control
                                </span>
                                <div className="w-0.5 h-5 bg-[#2563EB]" />
                              </div>
                            </div>

                            {/* -------------------------------------------------
                                TIER 2: FOCAL / PARENT COMPANY NODE (CENTER OF TREE)
                               ------------------------------------------------- */}
                            <div className="w-full max-w-xl rounded-2xl bg-[#0F172A] text-white p-4 border-2 border-[#3B82F6] shadow-lg relative">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-extrabold uppercase">
                                    Company • {selectedEntity.entityType}
                                  </span>
                                  <span className="font-mono text-[11px] text-blue-300">
                                    {selectedEntity.id}
                                  </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                                  Compliance {selectedEntity.aiComplianceScore}/100
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-base font-extrabold tracking-tight">
                                    {selectedEntity.flag} {selectedEntity.legalName}
                                  </h4>
                                  <p className="text-xs text-slate-300 mt-0.5">
                                    {selectedEntity.tradeName} • {selectedEntity.taxAuthority}
                                  </p>
                                </div>
                                <div className="text-right font-mono text-xs">
                                  <span className="text-blue-300 font-bold block">
                                    {selectedEntity.taxId}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Modal: {selectedEntity.paidUpCapital}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Vertical Stem Down from Tier 2 Parent to Tier 3 Subsidiaries */}
                            <div className="flex flex-col items-center">
                              <div className="w-0.5 h-5 bg-[#2563EB]" />
                              <span className="px-3 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-extrabold shadow-2xs">
                                ▼ Multi-Country Subsidiaries & Intercompany Tax Treaty Network ({companies.length - 1} Subsidiaries)
                              </span>
                              <div className="w-0.5 h-5 bg-[#2563EB]" />
                            </div>

                            {/* Horizontal Distributor Bus Line for Tier 3 Subsidiaries */}
                            <div className="w-2/3 mx-auto h-0.5 bg-[#2563EB]" />

                            {/* -------------------------------------------------
                                TIER 3: DOWNSTREAM MULTI-COUNTRY SUBSIDIARIES & LOCAL INDIVIDUAL SHAREHOLDERS
                               ------------------------------------------------- */}
                            <div className="w-full grid grid-cols-3 gap-4">
                              {companies
                                .filter((c) => c.parentCompanyId !== null)
                                .map((sub) => {
                                  const isFocused = sub.id === selectedEntity.id;
                                  return (
                                    <div
                                      key={sub.id}
                                      className="flex flex-col items-center"
                                    >
                                      {/* Vertical Branch Line from Bus to Subsidiary Card */}
                                      <div className="w-0.5 h-5 bg-[#2563EB]" />
                                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-300 font-mono text-[10px] font-extrabold mb-2">
                                        {sub.ownershipByParent}% Owned by Parent
                                      </span>

                                      <div
                                        onClick={() => setSelectedEntityId(sub.id)}
                                        className={`w-full rounded-xl p-3.5 border-2 transition cursor-pointer ${
                                          isFocused
                                            ? 'bg-blue-50/70 border-[#2563EB] shadow-md'
                                            : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                          <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white text-[9px] font-extrabold uppercase">
                                            Company • Subsidiary
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {sub.flag} {sub.jurisdictionName}
                                          </span>
                                        </div>
                                        <div className="text-xs font-extrabold text-slate-900">
                                          {sub.legalName}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                          {sub.taxId}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                          <span className="text-slate-600">
                                            {sub.taxAuthority.split('(')[0]}
                                          </span>
                                          <span className="text-emerald-700 font-bold">
                                            WHT Treaty: 10%
                                          </span>
                                        </div>

                                        {/* Sub-Tree Leaf inside Subsidiary: Local Individual Shareholder / UBO */}
                                        {sub.individualShareholders.map((localInd) => (
                                          <div
                                            key={localInd.id}
                                            className="mt-2.5 pt-2 border-t border-dashed border-slate-200 pl-3 border-l-2 border-l-emerald-500 bg-emerald-50/40 rounded-r-lg p-2"
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-[10px] font-bold text-slate-800 truncate">
                                                └─ 👤 {localInd.fullName}
                                              </span>
                                              <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[8px] font-bold">
                                                Individual
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] text-emerald-800 font-mono mt-0.5">
                                              <span>{localInd.roleTitle}</span>
                                              <span className="font-bold">
                                                {localInd.directSharePercent > 0
                                                  ? `${localInd.directSharePercent}% Direct`
                                                  : `${localInd.effectiveSharePercent}% UBO`}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>

                        {/* ===================================================
                            PART 3B: FIGMA 201-8 HIERARCHICAL INDENTED TREE BOX
                            (EXACT CHECKBOX + INDENTED TREE CONNECTORS + `Company` & `Individual` BADGES)
                           =================================================== */}
                        <div className="bg-slate-100/90 rounded-2xl border border-slate-200/90 p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">
                              Hierarchical Tree View
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Checked nodes are included in tax consolidation & Country-by-Country Report (CbCR)
                            </span>
                          </div>

                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                            {/* LEVEL 0 ROOT: PARENT HOLDING COMPANY */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked
                                  readOnly
                                  className="w-4 h-4 accent-[#2563EB] rounded"
                                />
                                <span className="text-xs font-extrabold text-slate-900">
                                  {selectedEntity.flag} {selectedEntity.legalName}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white font-bold text-[10px]">
                                  Company
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-semibold text-[10px]">
                                  {selectedEntity.entityType}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-mono text-slate-600">
                                  {selectedEntity.taxId}
                                </span>
                                <span className="font-mono font-extrabold text-[#2563EB]">
                                  100% Root Entity
                                </span>
                              </div>
                            </div>

                            {/* LEVEL 1 BRANCH A: UPSTREAM INTERMEDIATE CORPORATE SHAREHOLDERS (`Company` Badge) */}
                            <div className="ml-6 pl-4 border-l-2 border-blue-300 space-y-2 pt-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                ├─ Upstream Corporate Shareholders (Company) & Nested Individual UBOs (Individual)
                              </div>
                              {selectedEntity.intermediateShareholders.map(
                                (sh, idx) => (
                                  <div key={sh.id} className="space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition">
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-slate-400 font-mono text-xs">
                                          ├─
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked
                                          readOnly
                                          className="w-4 h-4 accent-[#2563EB]"
                                        />
                                        <span className="text-xs font-bold text-slate-900">
                                          🏢 {sh.name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white font-bold text-[10px]">
                                          Company
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          ({sh.jurisdiction} • {sh.id})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        <span className="font-mono font-bold text-slate-800">
                                          Share: {sh.sharePercent}%
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowShareholderModal(true)
                                          }
                                          className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    </div>

                                    {/* LEVEL 2 NESTED INDIVIDUAL UBO INSIDE CORPORATE SHAREHOLDER */}
                                    {selectedEntity.individualShareholders[idx] && (
                                      <div className="ml-8 pl-4 border-l-2 border-emerald-300">
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-200">
                                          <div className="flex items-center gap-2">
                                            <span className="text-emerald-500 font-mono text-xs">
                                              └─
                                            </span>
                                            <input
                                              type="checkbox"
                                              checked
                                              readOnly
                                              className="w-3.5 h-3.5 accent-emerald-600"
                                            />
                                            <span className="text-xs font-bold text-slate-900">
                                              👤 {selectedEntity.individualShareholders[idx].fullName}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                                              Individual
                                            </span>
                                            <span className="text-[10px] text-emerald-800 font-semibold">
                                              ({selectedEntity.individualShareholders[idx].roleTitle})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs">
                                            <span className="font-mono text-[11px] text-slate-600">
                                              Direct: {selectedEntity.individualShareholders[idx].directSharePercent}% • Effective UBO: {selectedEntity.individualShareholders[idx].effectiveSharePercent}%
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setShowIndividualModal(true)
                                              }
                                              className="text-emerald-700 font-bold hover:underline cursor-pointer"
                                            >
                                              Edit
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>

                            {/* LEVEL 1 BRANCH B: DOWNSTREAM SUBSIDIARIES (`Company` Badge) */}
                            <div className="ml-6 pl-4 border-l-2 border-indigo-300 space-y-2 pt-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                └─ Downstream Multi-Country Subsidiaries (Company)
                              </div>
                              {selectedEntity.structureNodes
                                .filter((n) => n.role !== 'Ultimate Parent')
                                .map((node) => (
                                  <div
                                    key={node.id}
                                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-indigo-400 font-mono text-xs">
                                        └─
                                      </span>
                                      <input
                                        type="checkbox"
                                        checked
                                        readOnly
                                        className="w-4 h-4 accent-[#2563EB]"
                                      />
                                      <span className="text-xs font-bold text-slate-900">
                                        {node.flag} {node.entityName}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white font-bold text-[10px]">
                                        Company
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-semibold border border-blue-200">
                                        {node.role}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        • {node.transferPricingMethod} • WHT Treaty {node.whtTreatyRate}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="font-mono font-bold text-slate-900">
                                        Direct: {node.directOwnership}% (Eff: {node.effectiveOwnership}%)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStructureModalTab('tp_tax');
                                          setShowStructureModal(true);
                                        }}
                                        className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                                      >
                                        Detail
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Exact Figma 201-8 Bottom-Left Button inside Company Structure Box (Red Arrow to Screen 3 Modal) */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                setStructureModalTab('tp_tax');
                                setShowStructureModal(true);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition cursor-pointer flex items-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Node / Company</span>
                            </button>
                            <span className="text-[11px] text-slate-500">
                              Click any node to see its ownership path &amp; tax treaty rate
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        SECTION 4: INTERMEDIATE SHAREHOLDER (CORPORATE / BADAN HUKUM — FIGMA 1)
                       ======================================================= */}
                    {(corpViewTab === 'all_in_one' ||
                      corpViewTab === 'shareholders') && (
                      <div className="pt-6 border-t border-slate-200 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                              Intermediate Shareholder (Corporate / Badan Hukum)
                            </h3>
                            <p className="text-xs text-slate-500">
                              Corporate (intermediate) shareholders, voting rights, and OECD BEPS Action 6 treaty-shopping screening
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAddShareholder}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 text-xs font-bold transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Intermediate Shareholder</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-700 mb-2">
                            List of Intermediate Shareholders (Corporate Entities)
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                {/* Exact Blue Table Header matching Figma 1 bottom table */}
                                <tr className="bg-blue-100/90 text-slate-800 font-bold border-b border-blue-200">
                                  <th className="py-3 px-4">Type</th>
                                  <th className="py-3 px-4">ID</th>
                                  <th className="py-3 px-4">
                                    Name Intermediate Shareholder
                                  </th>
                                  <th className="py-3 px-4">
                                    Jurisdiction & Share %
                                  </th>
                                  <th className="py-3 px-4">Status & BEPS Screening</th>
                                  <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {selectedEntity.intermediateShareholders.map(
                                  (sh) => (
                                    <tr
                                      key={sh.id}
                                      className="hover:bg-slate-50 transition"
                                    >
                                      <td className="py-3 px-4 text-slate-600">
                                        {sh.type}
                                      </td>
                                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                        {sh.id}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="font-bold text-slate-900 block">
                                          {sh.name}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500">
                                          {sh.taxId} • {sh.registrationNo}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-semibold text-slate-800">
                                        {sh.jurisdiction} ({sh.sharePercent}%)
                                      </td>
                                      <td className="py-3 px-4">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            sh.bepsRisk.startsWith('Low')
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                                          }`}
                                        >
                                          {sh.status} • {sh.bepsRisk}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right font-bold space-x-2.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenEditShareholder(sh)
                                          }
                                          className="text-[#2563EB] hover:underline cursor-pointer"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenEditShareholder(sh)
                                          }
                                          className="text-[#2563EB] hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteShareholder(sh.id)
                                          }
                                          className="text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        SECTION 5: INDIVIDUAL SHAREHOLDER (PEMEGANG SAHAM PERORANGAN & UBO)
                       ======================================================= */}
                    {(corpViewTab === 'all_in_one' ||
                      corpViewTab === 'shareholders' ||
                      corpViewTab === 'individual_shareholders') && (
                      <div className="pt-6 border-t border-slate-200 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-slate-900">
                                Individual Shareholder (Pemegang Saham Perorangan & Ultimate Beneficial Owner / UBO)
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                {selectedEntity.individualShareholders.length} Individual Shareholders
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Individual shareholders & Ultimate Beneficial Owners (UBO), personal tax IDs, and individual dividend tax regimes per country
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowIndividualModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Individual Shareholder</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-700 mb-2">
                            List of Individual Shareholders & Beneficial Owners (Perorangan / UBO)
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-blue-100/90 text-slate-800 font-bold border-b border-blue-200">
                                  <th className="py-3 px-4">Type</th>
                                  <th className="py-3 px-4">ID</th>
                                  <th className="py-3 px-4">
                                    Name Individual Shareholder & Role
                                  </th>
                                  <th className="py-3 px-4">
                                    Nationality & Personal Tax ID (NIK / NPWP / Passport)
                                  </th>
                                  <th className="py-3 px-4">
                                    Direct / Effective Share %
                                  </th>
                                  <th className="py-3 px-4">
                                    Individual Dividend Tax Regime & KYC
                                  </th>
                                  <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {selectedEntity.individualShareholders.map(
                                  (ind) => (
                                    <tr
                                      key={ind.id}
                                      className="hover:bg-slate-50 transition"
                                    >
                                      <td className="py-3 px-4">
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                          {ind.type}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                        {ind.id}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="font-bold text-slate-900 block">
                                          {ind.fullName}
                                        </span>
                                        <span className="text-[11px] text-slate-500 block">
                                          {ind.roleTitle}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {ind.email}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="font-semibold text-slate-800 block">
                                          {ind.nationality}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-600 block">
                                          {ind.personalTaxId}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {ind.nationalIdOrPassport}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono">
                                        <span className="font-extrabold text-slate-900 block">
                                          Direct: {ind.directSharePercent}%
                                        </span>
                                        <span className="text-[11px] text-emerald-700 font-bold">
                                          Effective UBO: {ind.effectiveSharePercent}%
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 max-w-xs">
                                        <span className="text-[11px] text-slate-700 font-medium block leading-snug">
                                          {ind.dividendTaxRegime}
                                        </span>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-bold border border-blue-200">
                                          ✓ {ind.kycDocStatus} • {ind.pepAndSanctionStatus}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right font-bold space-x-2 whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowIndividualModal(true)
                                          }
                                          className="text-[#2563EB] hover:underline cursor-pointer"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowIndividualModal(true)
                                          }
                                          className="text-[#2563EB] hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAskFloatingAi(
                                              `Analisis kewajiban pajak dividen orang pribadi dan kepatuhan Beneficial Owner (UBO) untuk pemegang saham individu ${ind.fullName} (${ind.personalTaxId}, kepemilikan langsung ${ind.directSharePercent}% / efektif ${ind.effectiveSharePercent}%) pada ${selectedEntity.legalName}.`
                                            )
                                          }
                                          className="px-2 py-1 rounded bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] cursor-pointer"
                                        >
                                          Analyze AI
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteIndividualShareholder(
                                              ind.id
                                            )
                                          }
                                          className="text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Save / Cancel Bar matching Figma 1 */}
                    <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCorpViewTab('directory')}
                        className="px-6 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          triggerToast(
                            `Seluruh perubahan Corporate Information, Dokumen, Struktur Anak Perusahaan, Intermediate Shareholder & Individual Shareholder untuk ${selectedEntity.legalName} berhasil disimpan!`
                          )
                        }
                        className="px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                      >
                        Save Corporate & Shareholder Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* ---------------------------------------------------------------
                SUB-NAV 1C: INDIVIDUAL SHAREHOLDER DEDICATED VIEW
               --------------------------------------------------------------- */}
            {subNav === 'individual' && (
              <IndividualShareholdersTab />
            )}

            {/* ---------------------------------------------------------------
                SUB-NAV 2: STUDIES (KNOWLEDGE & TREATY SIMULATOR)
               --------------------------------------------------------------- */}
            {subNav === 'studies' && (
              <StudiesTab
                onAskCopilot={(q) => {
                  setChatInput(q);
                  setIsChatOpen(true);
                }}
              />
            )}

            {/* ---------------------------------------------------------------
                SUB-NAV 3: TAX CALENDAR
               --------------------------------------------------------------- */}
            {subNav === 'calendar' && (
              <TaxCalendarTab
                countryCode={activeCountry}
                entityName={selectedEntity.legalName}
                onTriggerToast={triggerToast}
              />
            )}

            {/* ---------------------------------------------------------------
                SUB-NAV 4: REPORTS & AUDIT TRAIL
               --------------------------------------------------------------- */}
            {subNav === 'reports' && (
              <ReportsTab
                countryCode={activeCountry}
                entityName={selectedEntity.legalName}
                onTriggerToast={triggerToast}
              />
            )}
          </>
        )}

        {/* ===================================================================
            PRIMARY TAB 2: CALCULATION
           =================================================================== */}
        {primaryNav === 'calculation' && (
          <CalculationTab
            countryCode={activeCountry}
            entityName={selectedEntity.legalName}
            onNavigateToFinding={() => {
              setPrimaryNav('companies');
              setSubNav('studies');
            }}
            onProceedToReturn={() => setPrimaryNav('tax_return')}
          />
        )}

        {/* ===================================================================
            PRIMARY TAB 3: TAX RETURN
           =================================================================== */}
        {primaryNav === 'tax_return' && (
          <TaxReturnTab
            countryCode={activeCountry}
            entityName={selectedEntity.legalName}
            taxId={selectedEntity.taxId}
            activeRole={activePersona.id === 'ceo_parent' ? 'CEO Grup' : activePersona.id === 'cfo_parent' ? 'Head of Tax' : 'Konsultan Pajak'}
            onProceedToPayment={() => setPrimaryNav('payment')}
            onTriggerToast={triggerToast}
          />
        )}

        {/* ===================================================================
            PRIMARY TAB 4: PAYMENT
           =================================================================== */}
        {primaryNav === 'payment' && (
          <PaymentTab
            countryCode={activeCountry}
            entityName={selectedEntity.legalName}
            taxId={selectedEntity.taxId}
            onTriggerToast={triggerToast}
          />
        )}
      </main>

      {/* =====================================================================
          5. FLOATING AI TAX & SUBSIDIARY CHATBOT ON THE RIGHT EDGE
             ("analisis chat bot melayang saja di pinggir kanan")
         ===================================================================== */}
      {!isChatOpen ? (
        <div className="fixed right-5 bottom-6 z-50 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="group flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] hover:from-[#2563EB] hover:to-blue-600 text-white shadow-2xl shadow-slate-900/40 border border-slate-700/80 hover:border-blue-400/60 transition-all duration-200 cursor-pointer hover:scale-105"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] group-hover:bg-white/20 flex items-center justify-center relative shadow-md shadow-blue-500/30">
              <Bot className="w-5 h-5 text-white" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0F172A] absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <div className="text-left pr-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-tight">
                  Nexora AI Tax Copilot
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[9px] font-bold">
                  {selectedEntity.flag}
                </span>
              </div>
              <span className="block text-[10px] text-slate-300 font-medium">
                Konsultasi Pajak Multi-Negara & Treaty
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200 ring-1 ring-slate-900/10 ${
            isChatExpanded
              ? 'w-[94vw] sm:w-[620px] h-[82vh]'
              : 'w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh]'
          }`}
        >
          {/* Floating Chatbot Header */}
          <div className="p-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black tracking-tight">
                    Nexora AI Tax & Subsidiary Copilot
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-300 truncate max-w-[210px] font-medium">
                  {selectedEntity.flag} {selectedEntity.legalName} ({cfg.authorityShort})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                aria-label={isChatExpanded ? 'Perkecil Panel' : 'Perbesar Panel'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
                title={isChatExpanded ? 'Perkecil Panel' : 'Perbesar Panel'}
              >
                {isChatExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                aria-label="Tutup Copilot (Esc)"
                className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
                title="Tutup Copilot (Esc)"
              >
                <kbd className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-white/15 text-slate-300 font-mono">
                  Esc
                </kbd>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Subsidiary Context Switcher inside the Floating Chatbot */}
          <div className="px-3 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {companies.map((c) => {
              const active = c.id === selectedEntity.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedEntityId(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-[#2563EB] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {c.flag} {c.legalName.split(' ').slice(0, 2).join(' ')}
                </button>
              );
            })}
          </div>

          {/* One-Click Analysis Prompts for Selected Subsidiary */}
          <div className="px-3 py-2 bg-blue-50/40 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {cfg.copilotPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAskFloatingAi(p.prompt)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 text-[#2563EB] border border-blue-200/90 text-[10px] font-semibold whitespace-nowrap shrink-0 shadow-2xs hover:shadow-xs transition cursor-pointer"
              >
                ✦ {p.title}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/80">
            {chatHistory.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {m.entityLabel && (
                  <span className="text-[9px] text-slate-400 font-semibold mb-1 px-1">
                    {m.entityLabel}
                  </span>
                )}
                <div
                  className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs'
                  }`}
                >
                  {renderChatMessage(m.text, m.role === 'user')}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[9px] font-semibold"
                        >
                          📜 {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="text-xs text-[#2563EB] flex items-center gap-2 p-2 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Menganalisis pajak {selectedEntity.legalName} ({cfg.authorityShort})...
                </span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskFloatingAi();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Tanya regulasi pajak ${selectedEntity.legalName} / anak usaha...`}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100/80 text-xs text-slate-900 outline-none transition shadow-2xs"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:shadow-lg transition cursor-pointer hover:-translate-y-0.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL A: DOCUMENT AI OCR PREVIEW MODAL (WHEN CLICKING `VIEW` ON ANY OF THE 4 SLOTS)
         ===================================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#2563EB]">
                  GOOGLE CLOUD DOCUMENT AI • EXTRACTED METADATA
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {previewDoc.label}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-700">
                  {previewDoc.fileName}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Confidence: {previewDoc.confidenceScore}%
                </span>
              </div>
              <p className="text-slate-600">{previewDoc.extractedNote}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">
                Structured Key-Value Fields Extracted by Document AI:
              </span>
              {previewDoc.extractedFields.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <span className="text-slate-500 font-medium">{f.key}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {f.val}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL B (SCREEN 3 OF FIGMA 1): 2-TAB COMPANY STRUCTURE & SUBSIDIARY MODAL
         ===================================================================== */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#2563EB]">
                  COMPANY STRUCTURE & MULTI-COUNTRY SUBSIDIARIES
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Company Structure & Subsidiary Details — {selectedEntity.legalName}
                </h3>
              </div>
              <button
                onClick={() => setShowStructureModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs matching Screen 3 of Figma 1 (`Company` Subsidiaries + `Individual` UBO + Add New) */}
            <div className="flex flex-wrap border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStructureModalTab('tp_tax')}
                className={`px-5 py-2.5 border-b-2 transition cursor-pointer ${
                  structureModalTab === 'tp_tax'
                    ? 'border-[#2563EB] text-[#2563EB]'
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
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. + Add New Subsidiary (Tambah Anak Perusahaan)
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
                            <span className="block text-[10px] font-mono text-slate-500">
                              {n.taxId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#2563EB] font-semibold">
                            {n.role}
                          </td>
                          <td className="py-3 px-4">{n.jurisdiction}</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {n.directOwnership}% / {n.effectiveOwnership}%
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block">
                              {n.transferPricingMethod}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {n.annualIntercompanyVolume}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">
                            {n.whtTreatyRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStructureModalTab('individual_ubo')}
                    className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold cursor-pointer"
                  >
                    Lihat Individual Shareholders / UBO →
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructureModalTab('general')}
                    className="px-4 py-2 rounded-lg bg-blue-50 text-[#2563EB] text-xs font-bold cursor-pointer"
                  >
                    + Add Another Subsidiary
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStructureModal(false)}
                    className="px-5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            ) : structureModalTab === 'individual_ubo' ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-50 border-b border-emerald-200 text-slate-800 font-bold">
                        <th className="py-3 px-4">Individual Shareholder / UBO</th>
                        <th className="py-3 px-4">Type & Role</th>
                        <th className="py-3 px-4">Nationality & Personal Tax ID</th>
                        <th className="py-3 px-4">Direct / Effective %</th>
                        <th className="py-3 px-4">Dividend Tax Regime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedEntity.individualShareholders.map((ind) => (
                        <tr key={ind.id}>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            👤 {ind.fullName}
                            <span className="block text-[10px] font-mono text-slate-500">
                              {ind.id} • {ind.email}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-semibold">
                            {ind.type}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {ind.roleTitle}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block">{ind.nationality}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {ind.personalTaxId}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {ind.directSharePercent}% / {ind.effectiveSharePercent}%
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-700">
                            {ind.dividendTaxRegime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStructureModal(false);
                      setShowIndividualModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add New Individual Shareholder
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStructureModal(false)}
                    className="px-5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleAddSubsidiaryNode}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Subsidiary Legal Name (Nama Anak Perusahaan) *
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
                    onChange={(e) =>
                      setNewSubCountry(e.target.value as CountryCode)
                    }
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
                      setNewSubTpMethod(
                        e.target.value as SubsidiaryNode['transferPricingMethod']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="TNMM (Transactional Net Margin)">
                      TNMM (Transactional Net Margin)
                    </option>
                    <option value="CUP (Comparable Uncontrolled Price)">
                      CUP (Comparable Uncontrolled Price)
                    </option>
                    <option value="Cost Plus 8% Markup">
                      Cost Plus 8% Markup
                    </option>
                    <option value="Profit Split Method">
                      Profit Split Method
                    </option>
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
                    onClick={() => setShowStructureModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer"
                  >
                    Save Subsidiary to Company Structure
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL C (SCREENS 4 & 5 OF FIGMA 1): ADD / EDIT INTERMEDIATE SHAREHOLDER
             WITH `Search Existing Company | Manual Input` & 2-TAB DETAIL VIEW
         ===================================================================== */}
      {showShareholderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#2563EB]">
                  {editingShId ? 'EDIT INTERMEDIATE SHAREHOLDER' : 'ADD INTERMEDIATE SHAREHOLDER'} (CORPORATE)
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingShId ? 'Edit Intermediate Shareholder' : 'Add Intermediate Shareholder'} — {selectedEntity.legalName}
                </h3>
              </div>
              <button
                onClick={() => setShowShareholderModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Screen 4 of Figma 1: `Search Existing Company | Manual Input` Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setShareholderInputMode('search_existing')}
                className={`py-2.5 border-b-2 transition cursor-pointer ${
                  shareholderInputMode === 'search_existing'
                    ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/40'
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
                    ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/40'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Manual Input
              </button>
            </div>

            {shareholderInputMode === 'search_existing' && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-2 text-xs">
                <span>
                  Pilih dari entitas yang sudah terdaftar di Grup Nusantara untuk mengisi otomatis:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewShName('Nusantara FinTech Pte. Ltd.');
                    setNewShJurisdiction('🇸🇬 Singapore');
                    setNewShTaxId('UEN-202319482K');
                    setNewShRegNo('ACRA-202319482K');
                    setShareholderInputMode('manual');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer shrink-0"
                >
                  Auto-Fill SG Hub
                </button>
              </div>
            )}

            <form onSubmit={handleAddShareholder} className="space-y-3.5 text-xs">
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
                  onClick={() => setShowShareholderModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer"
                >
                  {editingShId ? 'Update Intermediate Shareholder' : 'Save Intermediate Shareholder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL D: ADD / EDIT INDIVIDUAL SHAREHOLDER & UBO MODAL
             (PEMEGANG SAHAM PERORANGAN / ULTIMATE BENEFICIAL OWNER)
         ===================================================================== */}
      {showIndividualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-700">
                  INDIVIDUAL SHAREHOLDER & BENEFICIAL OWNER (UBO) MANAGEMENT
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Add / Edit Individual Shareholder — {selectedEntity.legalName}
                </h3>
              </div>
              <button
                onClick={() => setShowIndividualModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* `Search Existing Individual | Manual Input` Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setIndInputMode('search_existing')}
                className={`py-2.5 border-b-2 transition cursor-pointer ${
                  indInputMode === 'search_existing'
                    ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/40'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Search Existing Individual / UBO
              </button>
              <button
                type="button"
                onClick={() => setIndInputMode('manual')}
                className={`py-2.5 border-b-2 transition cursor-pointer ${
                  indInputMode === 'manual'
                    ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/40'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Manual Input
              </button>
            </div>

            {indInputMode === 'search_existing' && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  Pilih dari daftar Pengurus / Founder / UBO terdaftar di Grup Nusantara:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewIndName('Dr. Hendra Kusuma, S.Kom., M.B.A.');
                      setNewIndRole('Founder & Ultimate Beneficial Owner (UBO)');
                      setNewIndNationality('🇮🇩 Indonesia');
                      setNewIndResidency('🇮🇩 Indonesia (SPDN — KPP Jakarta Kebayoran Baru)');
                      setNewIndNationalId('NIK: 3174011403800001');
                      setNewIndTaxId('3174011403800001 (NPWP 16 Digit NIK)');
                      setNewIndDirectShare('25');
                      setNewIndEffectiveShare('48.5');
                      setIndInputMode('manual');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    Auto-Fill Dr. Hendra (ID)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewIndName('Sarah Jenkins, CFA');
                      setNewIndRole('US Individual Angel Shareholder');
                      setNewIndNationality('🇺🇸 United States');
                      setNewIndResidency('🇺🇸 United States (IRS Form W-9 / 1099-DIV)');
                      setNewIndNationalId('US Passport: 661928310');
                      setNewIndTaxId('SSN: ***-**-8821');
                      setNewIndDirectShare('8');
                      setNewIndEffectiveShare('8');
                      setNewIndDividendRegime(
                        '15% US–ID Tax Treaty / Qualified Dividend (Form 1099-DIV / W-8BEN)'
                      );
                      setIndInputMode('manual');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer"
                  >
                    Auto-Fill Sarah Jenkins (US)
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleAddIndividualShareholder}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Name (Nama Lengkap Sesuai KTP / Paspor) *
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
                    Individual Shareholder Classification *
                  </label>
                  <select
                    value={newIndType}
                    onChange={(e) =>
                      setNewIndType(e.target.value as IndividualShareholder['type'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Individual Shareholder (UBO)">
                      Individual Shareholder (UBO / Pengendali)
                    </option>
                    <option value="Individual Founder / Director">
                      Individual Founder / Director (Pengurus)
                    </option>
                    <option value="Individual Minority Investor">
                      Individual Minority Investor (Investor Perorangan)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Role / Position in Company *
                  </label>
                  <input
                    type="text"
                    value={newIndRole}
                    onChange={(e) => setNewIndRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Citizenship / Nationality *
                  </label>
                  <input
                    type="text"
                    value={newIndNationality}
                    onChange={(e) => setNewIndNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    National ID / Passport Number (NIK 16 Digit / Paspor / NRIC / MyKad) *
                  </label>
                  <input
                    type="text"
                    value={newIndNationalId}
                    onChange={(e) => setNewIndNationalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Personal Tax ID (NPWP Orang Pribadi / FIN / LHDN IG / SSN) *
                  </label>
                  <input
                    type="text"
                    value={newIndTaxId}
                    onChange={(e) => setNewIndTaxId(e.target.value)}
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
                    min={0}
                    max={100}
                    step="0.1"
                    value={newIndDirectShare}
                    onChange={(e) => setNewIndDirectShare(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Effective UBO Ownership (%) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={newIndEffectiveShare}
                    onChange={(e) => setNewIndEffectiveShare(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Individual Dividend Tax Regime (Perlakuan Pajak Dividen Orang Pribadi) *
                  </label>
                  <select
                    value={newIndDividendRegime}
                    onChange={(e) => setNewIndDividendRegime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="0% Bebas PPh Dividen (Diinvestasikan di NKRI min. 3 Tahun — UU HPP Pasal 4 ayat (3) huruf f & PMK 18/2021)">
                      🇮🇩 0% Bebas PPh Dividen (Reinvestasi NKRI min. 3 Tahun — UU HPP Ps. 4(3)f & PMK 18/2021)
                    </option>
                    <option value="10% PPh Final Pasal 17 ayat (2c) (Dividen Kas Wajib Pajak Orang Pribadi Dalam Negeri Tanpa Reinvestasi)">
                      🇮🇩 10% PPh Final Pasal 17 ayat (2c) (WP OP Dalam Negeri Tanpa Reinvestasi)
                    </option>
                    <option value="10% / 15% PPh Pasal 26 (Wajib Pajak Orang Pribadi Luar Negeri dengan e-SKD / Tax Treaty)">
                      🌐 10% / 15% PPh Pasal 26 (WP OP Luar Negeri dengan e-SKD Tax Treaty; Normal 20%)
                    </option>
                    <option value="0% Singapore One-Tier Corporate Tax System (Section 13(1)(za) ITA — Exempt Dividend)">
                      🇸🇬 0% Singapore One-Tier Tax-Exempt Dividend (Section 13(1)(za) ITA)
                    </option>
                    <option value="2% Malaysia Dividend Tax on Individual Dividend > RM 100,000 (Budget 2025 / YA 2026)">
                      🇲🇾 2% Malaysia Dividend Tax atas Dividen Individu &gt; RM 100,000 (YA 2026)
                    </option>
                    <option value="15% / 20% US Qualified Dividend + 3.8% NIIT (IRC §1(h)(11) & Form 1099-DIV)">
                      🇺🇸 15% / 20% US Qualified Dividend + 3.8% NIIT (Form 1099-DIV)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tax Residency Office / Status
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
                    Personal Email
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
                    Residential Address (Alamat Domisili Sesuai KTP / Paspor)
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
                  onClick={() => setShowIndividualModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer"
                >
                  Save Individual Shareholder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: INTERNATIONAL RBAC ACCESS CONTROL & PERSONA SWITCHER
          (ISO/IEC 27001 & OECD PILLAR TWO GOVERNANCE COMPLIANT)
         ===================================================================== */}
      {showRbacModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    ROLE-BASED ACCESS CONTROL (RBAC) • ISO 27001 &amp; OECD ACTION 13
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    ISO/IEC 27001:2022 Certified
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    OECD Action 13 CbCR Gate
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 pt-1">
                  <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
                  Hak Akses &amp; Peran Karyawan Korporasi
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Sesuai standar tata kelola perusahaan internasional, karyawan dengan posisi CEO/setara dari <strong>Perusahaan Induk (Holding)</strong> memiliki visibilitas penuh ke seluruh entitas.
                </p>
              </div>
              <button
                onClick={() => setShowRbacModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Modal Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRbacModalTab('personas')}
                className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  rbacModalTab === 'personas'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-[#2563EB]" />
                <span>Pilih Peran Karyawan (RBAC)</span>
              </button>
              <button
                type="button"
                onClick={() => setRbacModalTab('matrix')}
                className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  rbacModalTab === 'matrix'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Matriks Otorisasi &amp; Hak Akses</span>
              </button>
              <button
                type="button"
                onClick={() => setRbacModalTab('standards')}
                className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  rbacModalTab === 'standards'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>Standar ISO 27001 &amp; OECD</span>
              </button>
            </div>

            {/* TAB 1: PERSONAS SELECTION */}
            {rbacModalTab === 'personas' && (
              <div className="space-y-6">
                {/* Current Active Persona Summary Banner */}
                <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
                  isGroupCeoOrParentExecutive
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${activePersona.avatarBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs`}>
                      {activePersona.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs">
                          Peran Saat Ini: {activePersona.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          isGroupCeoOrParentExecutive ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {activePersona.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {activePersona.title} • {activePersona.organization}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                      Cakupan Visibilitas
                    </span>
                    <span className="font-black text-xs text-slate-900">
                      {isGroupCeoOrParentExecutive ? '👑 4/4 Seluruh Entitas Grup' : '🔒 1/4 Entitas Lokal Saja'}
                    </span>
                  </div>
                </div>

                {/* TIER 1: PERUSAHAAN INDUK (HOLDING) - UNIVERSAL VISIBILITY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      Perusahaan Induk (Holding) — Akses Universal (Global Scope)
                    </h4>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Level 5 • Visibilitas 100% Seluruh Entitas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {USER_PERSONAS.filter((p) => p.entityRole === 'PARENT').map((persona) => {
                      const isActive = persona.id === activePersonaId;
                      return (
                        <div
                          key={persona.id}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            isActive
                              ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/25 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={`w-12 h-12 rounded-xl ${persona.avatarBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs mt-0.5`}>
                              {persona.avatarInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h5 className="text-sm font-black text-slate-900">
                                  {persona.name}
                                </h5>
                                <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-blue-100 text-[#2563EB] border border-blue-200">
                                  {persona.badge}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-700 leading-tight">
                                {persona.title} • {persona.organization}
                              </p>
                              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                                {persona.description}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Izin Akses:
                              </span>
                              <span className="inline-block text-xs font-black px-2 py-0.5 rounded mt-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {persona.governanceLevel}
                              </span>
                            </div>

                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs self-start sm:self-center">
                                <CheckCircle2 className="w-4 h-4" />
                                Aktif
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePersonaId(persona.id);
                                  setShowRbacModal(false);
                                  triggerToast(`Beralih ke Peran: ${persona.name} (${persona.title})`);
                                }}
                                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs hover:shadow self-start sm:self-center"
                              >
                                Pilih
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TIER 2: ANAK PERUSAHAAN (SUBSIDIARIES) - SEGREGATED SINGLE ENTITY */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      Anak Perusahaan (Subsidiaries) — Akses Terisolasi (Single-Entity Scope)
                    </h4>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Level 2 • Segregasi Tugas ISO 27001
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {USER_PERSONAS.filter((p) => p.entityRole === 'SUBSIDIARY').map((persona) => {
                      const isActive = persona.id === activePersonaId;
                      return (
                        <div
                          key={persona.id}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            isActive
                              ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/25 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={`w-11 h-11 rounded-xl ${persona.avatarBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs mt-0.5`}>
                              {persona.avatarInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <h5 className="text-xs font-black text-slate-900">
                                  {persona.name}
                                </h5>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                  {persona.badge}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-700 leading-tight">
                                {persona.title} • {persona.organization}
                              </p>
                              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                                {persona.description}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex flex-col justify-between gap-2.5">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Izin Akses:
                              </span>
                              <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded mt-0.5 bg-amber-50 text-amber-900 border border-amber-200 leading-snug">
                                {persona.governanceLevel}
                              </span>
                            </div>

                            <div className="pt-1 flex items-center justify-between">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Aktif
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePersonaId(persona.id);
                                    if (!persona.accessibleEntityIds.includes(selectedEntityId)) {
                                      setSelectedEntityId(persona.accessibleEntityIds[0]);
                                    }
                                    setShowRbacModal(false);
                                    triggerToast(`Beralih ke Peran: ${persona.name} (${persona.title})`);
                                  }}
                                  className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs hover:shadow text-center"
                                >
                                  Pilih
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Standar Tata Kelola Perusahaan Internasional Footer Banner */}
                <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 mt-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                    <span>Standar Tata Kelola Perusahaan Internasional:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Berdasarkan standar OECD Action 13 (Country-by-Country Reporting) dan ISO/IEC 27001 Access Control, data keuangan dan dokumen anak usaha terpisah secara yurisdiksi. Hanya pemegang wewenang eksekutif induk (CEO/CFO) yang diotorisasi mengonsolidasi seluruh anak usaha.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: PERMISSIONS MATRIX */}
            {rbacModalTab === 'matrix' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Matriks otorisasi hak akses berdasarkan tata kelola perusahaan internasional (ISO/IEC 27001 Access Control Matrix):
                  </p>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    5 Peran Terdaftar
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-4">FITUR &amp; MODUL SISTEM</th>
                        <th className="py-3 px-3 text-center bg-blue-50/50">GROUP CEO (INDUK)</th>
                        <th className="py-3 px-3 text-center bg-blue-50/30">GROUP CFO (INDUK)</th>
                        <th className="py-3 px-3 text-center">MD SINGAPURA</th>
                        <th className="py-3 px-3 text-center">DIR MALAYSIA</th>
                        <th className="py-3 px-3 text-center">CONTROLLER US</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          module: 'Direktori Perusahaan & Visibilitas Grup',
                          desc: 'Melihat seluruh entitas induk & 3 anak perusahaan',
                          ceo: 'Full (4 Entitas)',
                          cfo: 'Full (4 Entitas)',
                          sg: 'SG Saja (3 Locked)',
                          my: 'MY Saja (3 Locked)',
                          us: 'US Saja (3 Locked)',
                        },
                        {
                          module: 'Formulir Legalitas Korporasi & NPWP',
                          desc: 'Mengubah 7 field identitas hukum & kontak korporat',
                          ceo: 'Full Edit (Semua)',
                          cfo: 'Full Edit (Semua)',
                          sg: 'Edit SG Saja',
                          my: 'Edit MY Saja',
                          us: 'Edit US Saja',
                        },
                        {
                          module: 'Upload Dokumen Statuter (Akta, SK, NPWP)',
                          desc: 'Unggah dan verifikasi dokumen legal resmi',
                          ceo: 'Full Upload (Semua)',
                          cfo: 'Full Upload (Semua)',
                          sg: 'Upload Dok SG',
                          my: 'Upload Dok MY',
                          us: 'Upload Dok US',
                        },
                        {
                          module: 'Pohon Struktur Organisasi & Tambah Node',
                          desc: 'Mengubah hierarki kepemilikan saham grup',
                          ceo: 'Full Kelola + Tambah',
                          cfo: 'Lihat Struktur Penuh',
                          sg: 'Lihat Node SG Saja',
                          my: 'Lihat Node MY Saja',
                          us: 'Lihat Node US Saja',
                        },
                        {
                          module: 'Intermediate Shareholder (Badan Hukum)',
                          desc: 'Tambah, edit, dan hapus baris pemegang saham perantara',
                          ceo: 'Tambah / Edit / Hapus',
                          cfo: 'Tambah / Edit',
                          sg: 'Lihat SG Saja',
                          my: 'Lihat MY Saja',
                          us: 'Lihat US Saja',
                        },
                        {
                          module: 'Konsolidasi Pajak OECD Pillar Two (CbCR)',
                          desc: 'Agregasi pendapatan multi-yurisdiksi & top-up tax',
                          ceo: 'Full Konsolidasi',
                          cfo: 'Full Konsolidasi',
                          sg: '🔒 Terkunci (SoD)',
                          my: '🔒 Terkunci (SoD)',
                          us: '🔒 Terkunci (SoD)',
                        },
                        {
                          module: 'Pengesahan SPT & Pembayaran Pajak',
                          desc: 'Otorisasi pelaporan SPT tahunan & pembayaran',
                          ceo: 'Final Group Sign-Off',
                          cfo: 'Fiscal Sign-Off',
                          sg: 'Sign-Off IRAS',
                          my: 'Sign-Off LHDN',
                          us: 'Sign-Off IRS',
                        },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 block">{row.module}</span>
                            <span className="text-[10px] text-slate-500 block">{row.desc}</span>
                          </td>
                          <td className="py-3 px-3 text-center bg-blue-50/20 font-bold text-emerald-700">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                              ✓ {row.ceo}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center bg-blue-50/10 font-bold text-blue-700">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                              ✓ {row.cfo}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-700">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                              row.sg.includes('🔒') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.sg}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-700">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                              row.my.includes('🔒') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.my}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-700">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                              row.us.includes('🔒') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.us}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: STANDARDS & COMPLIANCE */}
            {rbacModalTab === 'standards' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-extrabold text-sm text-slate-900">
                        ISO/IEC 27001:2022 Annex A.9 (Access Control)
                      </h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Standar tata kelola keamanan informasi internasional mewajibkan <em>Segregation of Duties (SoD)</em> untuk membatasi akses personel anak usaha pada yurisdiksinya sendiri. Hal ini mencegah potensi benturan kepentingan, manipulasi faktur lintas batas (cross-border invoice tampering), dan kebocoran informasi antar anak perusahaan.
                    </p>
                    <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 font-mono">
                      ✓ Control 5.15: Access Control • Control 5.18: Access Rights
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe2 className="w-5 h-5 text-[#2563EB]" />
                      <h4 className="font-extrabold text-sm text-slate-900">
                        OECD BEPS Action 13 &amp; Pillar Two CbCR
                      </h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Berdasarkan kerangka <em>Country-by-Country Reporting (CbCR)</em> OECD, Ultimate Parent Entity (Perusahaan Induk) memiliki mandat hukum untuk mengonsolidasi seluruh laporan keuangan fiskal, transfer pricing, dan perhitungan Effective Tax Rate (ETR) seluruh constituent entities. Oleh karena itu, posisi Group CEO/CFO Induk diberikan hak visibilitas universal.
                    </p>
                    <div className="pt-2 border-t border-blue-200/80 text-[10px] text-blue-700 font-mono">
                      ✓ Master File &amp; Local File Segregation • Pillar Two QDMTT Oversight
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Kebijakan Tata Kelola Visibilitas Eksekutif Induk
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sesuai standar tata kelola perusahaan internasional, karyawan dengan posisi CEO/setara dari <strong>Perusahaan Induk (Holding)</strong> memiliki visibilitas penuh ke seluruh entitas. Karyawan subsidiary yang memerlukan akses dapat meminta persetujuan otorisasi dari CEO Induk melalui mekanisme delegasi wewenang resmi.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Masuk sebagai: <strong className="text-slate-800">{activePersona.name}</strong> ({activePersona.badge})
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isGroupCeoOrParentExecutive && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePersonaId('ceo_parent');
                      setShowRbacModal(false);
                      triggerToast('Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk)');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>Masuk sebagai Group CEO Induk</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowRbacModal(false)}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: RESTRICTED ACCESS NOTICE (WHEN SUBSIDIARY ROLE CLICKS LOCKED ENTITY)
         ===================================================================== */}
      {restrictedNoticeEntity && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                ROLE-BASED ACCESS CONTROL (RBAC) • ISO 27001 &amp; OECD ACTION 13
              </span>
              <h3 className="text-lg font-black text-slate-900 pt-1">
                Hak Akses Terbatas — Memerlukan Otorisasi CEO Induk
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sesuai standar tata kelola perusahaan internasional, karyawan dengan posisi CEO/setara dari <strong>Perusahaan Induk (Holding)</strong> memiliki visibilitas penuh ke seluruh entitas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400 font-medium">Akun Saat Ini:</span>
                <span className="font-bold text-slate-900">{activePersona.name} ({activePersona.badge})</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400 font-medium">Organisasi Anda:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[220px]">{activePersona.organization}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Entitas Sasaran:</span>
                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                  <span>{restrictedNoticeEntity.flag}</span>
                  <span>{restrictedNoticeEntity.legalName}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400 font-medium">Yurisdiksi Sasaran:</span>
                <span className="font-semibold text-slate-800">{restrictedNoticeEntity.jurisdictionName}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tingkat Izin Wajib:</span>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  Group CEO / Holding C-Level Scope
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Prinsip <em>Segregation of Duties (SoD) ISO 27001</em> mengunci akses data entitas di luar yurisdiksi Anda. Anda dapat berpindah ke akun Group CEO untuk meninjau entitas ini.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => setRestrictedNoticeEntity(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setActivePersonaId('ceo_parent');
                  setSelectedEntityId(restrictedNoticeEntity.id);
                  setCorpViewTab('all_in_one');
                  setRestrictedNoticeEntity(null);
                  triggerToast(`Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk) • Membuka ${restrictedNoticeEntity.legalName}`);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Masuk sebagai Group CEO Induk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CONSOLIDATED MULTI-COUNTRY GROUP OVERVIEW (ALL 4 ENTITIES)
         ===================================================================== */}
      {showConsolidationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#2563EB] border border-blue-200">
                    Executive Consolidated Portal • OECD BEPS Action 13 CbCR
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    👑 Hak Akses Group CEO Aktif
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe2 className="w-5 h-5 text-[#2563EB]" />
                  Konsolidasi Seluruh Grup — PT Nusantara Kreasi Digital Tbk &amp; 3 Anak Usaha
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ikhtisar keuangan fiskal, kepatuhan multi-yurisdiksi, dan optimasi <em>Tax Treaty (P3B/DTA)</em> grup internasional.
                </p>
              </div>
              <button
                onClick={() => setShowConsolidationModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Group KPI Cards */}
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

            {/* Consolidated Table of All 4 Entities */}
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
                              onClick={() => {
                                setSelectedEntityId(c.id);
                                setShowConsolidationModal(false);
                                triggerToast(`Membuka entitas: ${c.flag} ${c.legalName}`);
                              }}
                              className="px-2.5 py-1 rounded bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold transition cursor-pointer"
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

            {/* Intercompany Transfer Pricing Flow */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
              <h4 className="font-extrabold text-[#2563EB] flex items-center gap-1.5">
                <GitBranch className="w-4 h-4" />
                Matriks Transaksi Afiliasi Lintas Negara (Cross-Border Transfer Pricing)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
                  <span className="font-bold text-slate-900 block">🇮🇩 ID ↔ 🇸🇬 SG (Royalti &amp; IP AI)</span>
                  <p className="text-slate-600">Metode: <strong>CUP Method</strong>. Tarif P3B 10% (Normal 20%) didukung Form DGT &amp; COR IRAS.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
                  <span className="font-bold text-slate-900 block">🇸🇬 SG ↔ 🇲🇾 MY (Distribusi SaaS)</span>
                  <p className="text-slate-600">Metode: <strong>Cost Plus 8%</strong>. Alokasi laba terdistribusi sesuai fungsi operasional ASEAN.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
                  <span className="font-bold text-slate-900 block">🇺🇸 US ↔ 🇮🇩 ID (Kontrak Cloud/AI)</span>
                  <p className="text-slate-600">Metode: <strong>TNMM</strong>. Form W-8BEN-E &amp; IRC §482 verified, bebas backup withholding 24%.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={(p, s, c) => {
          if (p) setPrimaryNav(p as PrimaryNav);
          if (s) setSubNav(s as SubNav);
          if (c) setCorpViewTab(c as CorporateViewTab);
        }}
        onSelectEntity={(id) => setSelectedEntityId(id)}
      />
    </div>
  );
}
