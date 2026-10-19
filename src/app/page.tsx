'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  Download,
  CheckCircle2,
} from 'lucide-react';
import {
  MULTI_COUNTRY_DATA,
  CountryCode,
  formatCurrency,
} from '@/data/multiCountryTaxData';

import { TopHeader } from '@/components/nexora/layout/TopHeader';
import { SidebarNav, PrimaryNav, SubNav } from '@/components/nexora/layout/SidebarNav';
import { GroupSummaryCards } from '@/components/nexora/layout/GroupSummaryCards';
import { CorporateFormAndDocs } from '@/components/nexora/corporate/CorporateFormAndDocs';
import { CompanyStructureView } from '@/components/nexora/structure/CompanyStructureView';
import { CompanyDirectoryView } from '@/components/nexora/corporate/CompanyDirectoryView';
import {
  StudiesView,
  FiscalReconciliationAuditTable,
} from '@/components/nexora/studies/StudiesAndReconciliationView';
import { NexoraCopilot } from '@/components/nexora/copilot/NexoraCopilot';
import { SegmentedControl } from '@/components/nexora/primitives/SegmentedControl';
import { Button } from '@/components/nexora/primitives/Button';
import { Card } from '@/components/nexora/primitives/Card';
import { Badge } from '@/components/nexora/primitives/Badge';
import {
  DocumentPreviewModal,
  AddSubsidiaryModal,
  AddShareholderModal,
  AddIndividualModal,
  RbacGovernanceModal,
  RestrictedNoticeModal,
  ConsolidationModal,
} from '@/components/nexora/modals/NexoraModals';

export type { PrimaryNav, SubNav };
export type CorporateViewTab =
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

const USER_PERSONAS: UserPersona[] = [
  {
    id: 'ceo_parent',
    name: 'Ir. Aditya Pratama, M.Sc.',
    title: 'Group Chief Executive Officer (CEO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    avatarInitials: 'AP',
    avatarBg: 'bg-emerald-600',
    badge: '👑 Group CEO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Unrestricted Multinational Holding Scope)',
    description: 'CEO Perusahaan Induk — Memiliki hak akses universal (Global Scope) sesuai standar enterprise internasional untuk mengaudit, mengonsolidasi, dan melihat seluruh data Induk & 3 Anak Usaha (ID, SG, MY, US).',
  },
  {
    id: 'cfo_parent',
    name: 'Sri Mulyani Dewi, S.E., Ak., CA',
    title: 'Group Chief Financial Officer (CFO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    avatarInitials: 'SM',
    avatarBg: 'bg-blue-600',
    badge: '💼 Group CFO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Group Fiscal & BEPS Consolidation)',
    description: 'CFO Perusahaan Induk — Setara dengan CEO dalam pengawasan keuangan fiskal konsolidasi, transfer pricing lintas negara, dan kepatuhan audit grup.',
  },
  {
    id: 'md_sg',
    name: 'Marcus Tan, CFA',
    title: 'Managing Director — Singapore Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara FinTech Pte. Ltd. (Singapura)',
    avatarInitials: 'MT',
    avatarBg: 'bg-purple-600',
    badge: '🇸🇬 Director SG (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-SG-002'],
    governanceLevel: 'Level 2 (Single Entity — Singapore IRAS Only)',
    description: 'Karyawan Anak Usaha Singapura — Hanya memiliki hak akses internal Nusantara FinTech Pte. Ltd. Entitas lain dikunci sesuai segregasi tugas ISO 27001.',
  },
  {
    id: 'dir_my',
    name: 'Ahmad Razak, CA (M)',
    title: 'Country Director — Malaysia Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara Digital Solutions Sdn. Bhd. (Malaysia)',
    avatarInitials: 'AR',
    avatarBg: 'bg-amber-600',
    badge: '🇲🇾 Director MY (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-MY-003'],
    governanceLevel: 'Level 2 (Single Entity — Malaysia LHDN Only)',
    description: 'Karyawan Anak Usaha Malaysia — Akses dibatasi pada entitas lokal Malaysia.',
  },
  {
    id: 'ctrl_us',
    name: 'Sarah Jenkins, CPA',
    title: 'VP Finance & Controller — US Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara AI Technologies, Inc. (Amerika Serikat)',
    avatarInitials: 'SJ',
    avatarBg: 'bg-rose-600',
    badge: '🇺🇸 Controller US (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-US-004'],
    governanceLevel: 'Level 2 (Single Entity — US IRS Only)',
    description: 'Karyawan Anak Usaha Amerika Serikat — Akses dibatasi pada entitas lokal AS.',
  },
];

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

const INITIAL_COMPANIES: CorporateEntity[] = [
  {
    id: 'ENT-ID-001',
    legalName: 'PT Nusantara Kreasi Digital Tbk',
    tradeName: 'Nusantara Group HQ & Core Technology',
    parentCompanyId: null,
    parentCompanyName: '— (Ultimate Holding Parent / Induk Tertinggi)',
    ownershipByParent: 100,
    registrationNumber: 'AHU-0019283.AH.01.01.2018 (NIB: 9120301928371)',
    taxId: '0013948214012000 (NPWP 16 Digit Coretax)',
    nitkuOrBranchId: '0013948214012000000000 (NITKU Pusat)',
    incorporationDate: '14 March 2018',
    entityType: 'Parent Holding Company',
    countryCode: 'ID',
    jurisdictionName: 'Indonesia',
    flag: '🇮🇩',
    fiscalYearEnd: '31 December (Calendar Year)',
    functionalCurrency: 'IDR (Rupiah)',
    paidUpCapital: 'Rp 25.000.000.000 (25 Juta Lembar Saham)',
    businessClassification: 'KBLI 62019 (Aktivitas Pemrograman Komputer Lainnya) • KLU 62019',
    taxOfficeName: 'KPP Wajib Pajak Besar Empat (Large Tax Office)',
    address: 'Menara Astra Lt. 38, Jl. Jenderal Sudirman Kav. 5-6, Karet Tengsin',
    cityAndPostal: 'Jakarta Pusat, DKI Jakarta 10220',
    authorizedTaxOfficer: 'Budi Santoso, S.E., Ak., BKP (Direktur Keuangan & Pajak)',
    intercompanyRole: 'Entitas Induk Pengendali (Holding HQ) • Pemilik 85% Anak Usaha SG & 100% Anak Usaha US',
    taxAuthority: 'Direktorat Jenderal Pajak (DJP Coretax)',
    status: 'ACTIVE',
    aiComplianceScore: 88,
    documents: [
      {
        id: 'DOC-1',
        category: 'Statutory Registration',
        label: 'Akta Pendirian & SK Kemenkumham (Deed of Establishment & Ministry Approval)',
        fileName: 'akta_pendirian_sk_kemenkumham_2018_ptnkd.pdf',
        fileSize: '4.8 MB',
        uploadedAt: '12 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.4,
        extractedNote: 'Modal Ditempatkan Rp 25 Miliar Terverifikasi • 3 Pemegang Saham Individu & 1 Perantara Terdaftar',
        extractedFields: [
          { key: 'Nomor SK Kemenkumham', val: 'AHU-0019283.AH.01.01.TAHUN 2018' },
          { key: 'Nama Notaris', val: 'Hj. Ratna Juwita, S.H., M.Kn.' },
          { key: 'Kedudukan Hukum', val: 'Kota Administrasi Jakarta Pusat' },
          { key: 'Modal Dasar / Disetor', val: 'Rp 100.000.000.000 / Rp 25.000.000.000' },
        ],
      },
      {
        id: 'DOC-2',
        category: 'Tax Identification',
        label: 'Surat Keterangan Terdaftar (SKT) & Kartu NPWP 16 Digit (DJP Coretax)',
        fileName: 'skt_npwp16_coretax_djp_ptnkd.pdf',
        fileSize: '1.4 MB',
        uploadedAt: '14 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.8,
        extractedNote: 'NPWP 16 Digit Valid Terintegrasi NIK/NITKU • KPP Wajib Pajak Besar Empat Aktif',
        extractedFields: [
          { key: 'NPWP 16 Digit', val: '0013948214012000' },
          { key: 'NITKU Kantor Pusat', val: '0013948214012000000000' },
          { key: 'Status PKP', val: 'Pengusaha Kena Pajak Terdaftar sejak 2019' },
          { key: 'KPP Terdaftar', val: 'KPP Wajib Pajak Besar Empat (094)' },
        ],
      },
      {
        id: 'DOC-3',
        category: 'Financial Statement',
        label: 'Laporan Keuangan Audited Konsolidasian 2025 (Audited Financial Statement)',
        fileName: 'laporan_keuangan_audited_konsolidasian_2025.pdf',
        fileSize: '8.2 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.1,
        extractedNote: 'Opini Wajar Tanpa Pengecualian (WTP) oleh KAP Big Four • Rekonsiliasi Fiskal Terlampir',
        extractedFields: [
          { key: 'KAP Auditor', val: 'KAP Siddharta Widjaja & Rekan (KPMG)' },
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
        address: '1209 Orange St, Wilmington, DE 19801, USA',
        contactEmail: 'compliance@bluehorizonlp.com',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00001',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Ir. Aditya Pratama, M.Sc.',
        roleTitle: 'Founder, Group CEO & Ultimate Beneficial Owner (UBO)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Selatan)',
        nationalIdOrPassport: 'NIK: 3174051908840002',
        personalTaxId: '3174051908840002 (NPWP 16 Digit NIK)',
        directSharePercent: 25,
        effectiveSharePercent: 38.5,
        votingRightPercent: 40.0,
        dividendTaxRegime: '0% Bebas PPh Dividen (Diinvestasikan di NKRI min. 3 Tahun — UU HPP Pasal 4 ayat (3) huruf f & PMK 18/2021)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Wijaya II No. 44, Kebayoran Baru, Jakarta Selatan 12160',
        email: 'aditya.pratama@nusantaradigital.co.id',
      },
      {
        id: 'IND-00002',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Sri Mulyani Dewi, S.E., Ak., CA',
        roleTitle: 'Co-Founder, Group CFO & UBO Kontrol Keuangan Fiskal',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Pusat)',
        nationalIdOrPassport: 'NIK: 3171025506860001',
        personalTaxId: '3171025506860001 (NPWP 16 Digit NIK)',
        directSharePercent: 15,
        effectiveSharePercent: 22.5,
        votingRightPercent: 25.0,
        dividendTaxRegime: '0% Bebas PPh Dividen (Diinvestasikan Kembali pada Saham Bursa / SBN — PMK 18/2021)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Teuku Umar No. 12, Menteng, Jakarta Pusat 10350',
        email: 'sri.mulyani@nusantaradigital.co.id',
      },
      {
        id: 'IND-00003',
        type: 'Individual Founder / Director',
        fullName: 'Bambang Soebagio, M.B.A.',
        roleTitle: 'Komisaris Utama (Non-Executive Chairman) & Early Angel',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Surabaya Gubeng)',
        nationalIdOrPassport: 'NIK: 3578011202750003',
        personalTaxId: '3578011202750003 (NPWP 16 Digit NIK)',
        directSharePercent: 10,
        effectiveSharePercent: 14.0,
        votingRightPercent: 15.0,
        dividendTaxRegime: '10% PPh Final Dividen (Non-Reinvestasi — UU HPP Pasal 17 ayat (2c))',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Raya Darmo No. 88, Surabaya, Jawa Timur 60265',
        email: 'bambang.soebagio@nusantaradigital.co.id',
      },
    ],
  },
  {
    id: 'ENT-SG-002',
    legalName: 'Nusantara FinTech Pte. Ltd.',
    tradeName: 'Nusantara Singapore Regional Hub & Treasury',
    parentCompanyId: 'ENT-ID-001',
    parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (🇮🇩 Indonesia)',
    ownershipByParent: 85,
    registrationNumber: 'UEN: 202319482K (ACRA Singapore)',
    taxId: '202319482K (IRAS Tax Reference)',
    nitkuOrBranchId: 'SG-ACRA-HQ-001',
    incorporationDate: '18 May 2023',
    entityType: 'Regional Hub Subsidiary',
    countryCode: 'SG',
    jurisdictionName: 'Singapore',
    flag: '🇸🇬',
    fiscalYearEnd: '31 December',
    functionalCurrency: 'SGD (Singapore Dollar)',
    paidUpCapital: 'S$ 1,500,000 (1.5 Million Ordinary Shares)',
    businessClassification: 'SSIC 62011 (Development of Software and Applications)',
    taxOfficeName: 'Inland Revenue Authority of Singapore (IRAS Revenue House)',
    address: '8 Marina Boulevard, #28-03 Marina Bay Financial Centre Tower 1',
    cityAndPostal: 'Singapore 018981',
    authorizedTaxOfficer: 'Marcus Tan, CFA (Managing Director SG)',
    intercompanyRole: 'Pusat Lisensi IP Regional & Sub-Holding Anak Perusahaan Malaysia',
    taxAuthority: 'Inland Revenue Authority of Singapore (IRAS)',
    status: 'ACTIVE',
    aiComplianceScore: 91,
    documents: [
      {
        id: 'SG-DOC-1',
        category: 'Statutory Registration',
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
        taxId: 'UEN-202109482Z',
        sharePercent: 15,
        votingRightPercent: 15,
        effectiveDate: '2023-05-18',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: '60B Orchard Road, #06-18 The Atrium@Orchard, Singapore 238891',
        contactEmail: 'deal.compliance@temasekseed.sg',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00004',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Marcus Tan, CFA',
        roleTitle: 'Resident Executive Director & Singapore Country Head',
        nationality: '🇸🇬 Singapore',
        taxResidency: '🇸🇬 Singapore (Tax Resident — IRAS S-Pass / NRIC)',
        nationalIdOrPassport: 'NRIC: S8819283A',
        personalTaxId: 'S8819283A (IRAS Tax Reference)',
        directSharePercent: 0,
        effectiveSharePercent: 5.0,
        votingRightPercent: 5.0,
        dividendTaxRegime: '0% Singapore One-Tier Corporate Tax System (Dividends Exempt in Hands of Shareholder)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: '15 Tanjong Pagar Road, #18-02, Singapore 088437',
        email: 'marcus.tan@nusantara-fintech.sg',
      },
      {
        id: 'IND-00005',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Ir. Aditya Pratama, M.Sc.',
        roleTitle: 'Indirect UBO via PT Nusantara Kreasi Digital Tbk (85% Ownership)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN)',
        nationalIdOrPassport: 'NIK: 3174051908840002',
        personalTaxId: '3174051908840002',
        directSharePercent: 0,
        effectiveSharePercent: 32.7,
        votingRightPercent: 34.0,
        dividendTaxRegime: '0% Dividen Luar Negeri Bebas Pajak (Diinvestasikan Kembali ke Indonesia min. 30% Laba Setelah Pajak — PMK 18/2021)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Wijaya II No. 44, Kebayoran Baru, Jakarta Selatan 12160',
        email: 'aditya.pratama@nusantaradigital.co.id',
      },
    ],
  },
  {
    id: 'ENT-MY-003',
    legalName: 'Nusantara Digital Solutions Sdn. Bhd.',
    tradeName: 'Nusantara Malaysia Operational Entity',
    parentCompanyId: 'ENT-SG-002',
    parentCompanyName: 'Nusantara FinTech Pte. Ltd. (🇸🇬 Singapura — 100% Direct)',
    ownershipByParent: 100,
    registrationNumber: 'SSM: 202201039481 (1482910-K)',
    taxId: 'C25849102090 (LHDN Malaysia TIN)',
    nitkuOrBranchId: 'MY-SSM-KL-001',
    incorporationDate: '04 November 2022',
    entityType: 'Subsidiary (Anak Perusahaan)',
    countryCode: 'MY',
    jurisdictionName: 'Malaysia',
    flag: '🇲🇾',
    fiscalYearEnd: '31 December',
    functionalCurrency: 'MYR (Ringgit Malaysia)',
    paidUpCapital: 'RM 500,000 (500,000 Ordinary Shares)',
    businessClassification: 'MSIC 62021 (Computer Consultancy Services)',
    taxOfficeName: 'Lembaga Hasil Dalam Negeri Malaysia (LHDN Cawangan Wangsa Maju)',
    address: 'Level 23A, The Exchange 106, Lingkaran TRX',
    cityAndPostal: 'Kuala Lumpur 55188',
    authorizedTaxOfficer: 'Ahmad Razak, CA (M) (Country Director Malaysia)',
    intercompanyRole: 'Entitas Operasional Pemasaran & Integrasi e-Invoicing MyInvois Malaysia',
    taxAuthority: 'Lembaga Hasil Dalam Negeri (LHDN MyInvois)',
    status: 'ACTIVE',
    aiComplianceScore: 86,
    documents: [
      {
        id: 'MY-DOC-1',
        category: 'Statutory Registration',
        label: 'SSM Form 9 Certificate of Incorporation & Section 14 Superform',
        fileName: 'ssm_cert_incorporation_superform_my.pdf',
        fileSize: '2.8 MB',
        uploadedAt: '12 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.6,
        extractedNote: 'SSM 202201039481 Valid • 100% Saham Dimiliki Nusantara FinTech Pte. Ltd.',
        extractedFields: [
          { key: 'SSM Registration No.', val: '202201039481 (1482910-K)' },
          { key: 'Nature of Business', val: 'Information Technology & Multi-Cloud Services' },
          { key: 'Paid-Up Share Capital', val: 'RM 500,000' },
          { key: 'Company Secretary', val: 'MAICSA Licensed Secretary Verified' },
        ],
      },
      {
        id: 'MY-DOC-2',
        category: 'Tax Identification',
        label: 'LHDN e-Daftar Tax Registration Letter & MyInvois Portal Validation',
        fileName: 'lhdn_edaftar_tin_myinvois_approval.pdf',
        fileSize: '1.6 MB',
        uploadedAt: '14 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.4,
        extractedNote: 'LHDN TIN C25849102090 Terdaftar • MyInvois Phase 2 Sandbox & Production Siap',
        extractedFields: [
          { key: 'Income Tax No. (TIN)', val: 'C 25849102090' },
          { key: 'SST Registration No.', val: 'W10-2309-32000192' },
          { key: 'LHDN Branch', val: 'Cawangan Wangsa Maju, Wilayah Persekutuan' },
          { key: 'MyInvois Status', val: 'Verified API ERP Direct Connection' },
        ],
      },
      {
        id: 'MY-DOC-3',
        category: 'Financial Statement',
        label: 'Audited Financial Statements (MPERS) & Tax Computation Form C',
        fileName: 'audited_fs_mpers_ya2025_malaysia.pdf',
        fileSize: '4.7 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.1,
        extractedNote: 'Revenue RM 1,420,000 • SME Tier 15% First RM 150k Terhitung • Transfer Pricing Section 140A',
        extractedFields: [
          { key: 'Gross Turnover', val: 'RM 1,420,000' },
          { key: 'Chargeable Income', val: 'RM 284,000' },
          { key: 'Tax Rate Bracket', val: '15% on first RM 150k; 24% on remainder' },
          { key: 'Total Tax Payable', val: 'RM 54,660' },
        ],
      },
      {
        id: 'MY-DOC-4',
        category: 'Previous Year Tax Return',
        label: 'LHDN Form C e-Filing Acknowledgement & Section 109B WHT Return',
        fileName: 'lhdn_form_c_efiling_bpe_wht109b.pdf',
        fileSize: '2.1 MB',
        uploadedAt: '17 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.5,
        extractedNote: 'Form C YA 2025 Submitted • Section 109B Withholding Tax 8% MY-SG DTA Disetor Lengkap',
        extractedFields: [
          { key: 'e-Filing Acknowledgment', val: 'LHDN-MY-YA2025-C-8829102' },
          { key: 'Section 109B WHT Payment', val: 'Paid within 30 days of invoice date' },
          { key: 'DTA Rate Claimed', val: '8% Royalty Rate (Article 12 Malaysia–Singapore DTA)' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'MY-STR-1',
        entityName: 'Nusantara FinTech Pte. Ltd.',
        tradeName: 'Anak Usaha Singapura (Holding Langsung)',
        role: 'Regional IP Hub',
        countryCode: 'SG',
        flag: '🇸🇬',
        jurisdiction: 'Singapore (IRAS)',
        taxId: '202319482K',
        registrationNo: 'ACRA-202319482K',
        directOwnership: 100,
        effectiveOwnership: 85,
        functionalCurrency: 'SGD',
        transferPricingMethod: 'Cost Plus 8% Markup',
        intercompanyTransaction: 'Pemilik 100% Saham & Penyedia Lisensi Software ke Entitas Malaysia',
        annualIntercompanyVolume: 'RM 240,000 / tahun',
        whtDomesticRate: '10% (Section 109B)',
        whtTreatyRate: '8% (SG–MY DTA)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 91,
      },
      {
        id: 'MY-STR-2',
        entityName: 'Nusantara Digital Solutions Sdn. Bhd.',
        tradeName: 'Entitas Operasional Malaysia (Selected)',
        role: 'Direct Subsidiary (Anak Perusahaan)',
        countryCode: 'MY',
        flag: '🇲🇾',
        jurisdiction: 'Malaysia (LHDN)',
        taxId: 'C25849102090',
        registrationNo: 'SSM-202201039481',
        directOwnership: 100,
        effectiveOwnership: 85,
        functionalCurrency: 'MYR',
        transferPricingMethod: 'TNMM (Transactional Net Margin)',
        intercompanyTransaction: 'Distribusi Produk SaaS & Penyedia Layanan Konsultasi TI Lokal Malaysia',
        annualIntercompanyVolume: 'RM 1,420,000 (Total Omzet)',
        whtDomesticRate: '24% Standard CIT',
        whtTreatyRate: '15% SME Preferential Rate',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 86,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00006',
        type: 'Immediate Corporate Shareholder',
        name: 'Nusantara FinTech Pte. Ltd.',
        registrationNo: 'ACRA-202319482K',
        jurisdiction: '🇸🇬 Singapore',
        taxId: 'UEN-202319482K',
        sharePercent: 100,
        votingRightPercent: 100,
        effectiveDate: '2022-11-04',
        status: 'Active',
        bepsRisk: 'Low (Substantial Activity)',
        address: '8 Marina Boulevard, #28-03 MBFC Tower 1, Singapore 018981',
        contactEmail: 'tax.compliance@nusantara-fintech.sg',
      },
    ],
    individualShareholders: [
      {
        id: 'IND-00006',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Ahmad Razak, CA (M)',
        roleTitle: 'Resident Director & Country Head Malaysia',
        nationality: '🇲🇾 Malaysia',
        taxResidency: '🇲🇾 Malaysia (LHDN Tax Resident — MyKad)',
        nationalIdOrPassport: 'MyKad: 850412-14-5911',
        personalTaxId: 'SG 2918273610 (LHDN Individual TIN)',
        directSharePercent: 0,
        effectiveSharePercent: 2.5,
        votingRightPercent: 2.5,
        dividendTaxRegime: 'Single-Tier Dividend System Malaysia (Dividen Dikecualikan dari Cukai Pendapatan Individu)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'No. 32, Jalan Setiabistari, Bukit Damansara, 50490 Kuala Lumpur',
        email: 'ahmad.razak@nusantaradigital.my',
      },
      {
        id: 'IND-00007',
        type: 'Individual Shareholder (UBO)',
        fullName: 'Ir. Aditya Pratama, M.Sc.',
        roleTitle: 'Indirect UBO via Induk Grup Indonesia (85% Effective Control)',
        nationality: '🇮🇩 Indonesia',
        taxResidency: '🇮🇩 Indonesia (SPDN)',
        nationalIdOrPassport: 'NIK: 3174051908840002',
        personalTaxId: '3174051908840002',
        directSharePercent: 0,
        effectiveSharePercent: 32.7,
        votingRightPercent: 34.0,
        dividendTaxRegime: '0% Dividen Repatriasi NKRI (PMK 18/2021)',
        pepAndSanctionStatus: 'Verified Clear (Non-PEP / FATF Safe)',
        kycDocStatus: 'Verified by Document AI',
        status: 'Active',
        address: 'Jl. Wijaya II No. 44, Kebayoran Baru, Jakarta Selatan 12160',
        email: 'aditya.pratama@nusantaradigital.co.id',
      },
    ],
  },
  {
    id: 'ENT-US-004',
    legalName: 'Nusantara AI Technologies, Inc.',
    tradeName: 'Nusantara US Delaware Operating Corp',
    parentCompanyId: 'ENT-ID-001',
    parentCompanyName: 'PT Nusantara Kreasi Digital Tbk (🇮🇩 Indonesia — 100% Direct)',
    ownershipByParent: 100,
    registrationNumber: 'DE File No: 7492018 (Delaware Secretary of State)',
    taxId: '88-4920193 (Federal Employer ID - FEIN)',
    nitkuOrBranchId: 'US-DE-CORP-001',
    incorporationDate: '15 January 2024',
    entityType: 'Foreign Operating Subsidiary',
    countryCode: 'US',
    jurisdictionName: 'United States',
    flag: '🇺🇸',
    fiscalYearEnd: '31 December',
    functionalCurrency: 'USD (US Dollar)',
    paidUpCapital: 'US$ 500,000 (5,000,000 Shares of Common Stock, $0.0001 Par Value)',
    businessClassification: 'NAICS 541511 (Custom Computer Programming Services)',
    taxOfficeName: 'Internal Revenue Service (IRS Ogden Service Center)',
    address: '1209 North Orange Street, Corporation Trust Center',
    cityAndPostal: 'Wilmington, New Castle County, DE 19801',
    authorizedTaxOfficer: 'Sarah Jenkins, CPA (VP Finance & Controller US)',
    intercompanyRole: 'Entitas Operasional Amerika Utara, Kontrak AI Enterprise & R&D Cloud US',
    taxAuthority: 'Internal Revenue Service (IRS MeF Modernized e-File)',
    status: 'ACTIVE',
    aiComplianceScore: 84,
    documents: [
      {
        id: 'US-DOC-1',
        category: 'Statutory Registration',
        label: 'Delaware Certificate of Incorporation & Form SS-4 EIN Confirmation',
        fileName: 'delaware_cert_incorporation_ein_cp575.pdf',
        fileSize: '2.5 MB',
        uploadedAt: '12 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.8,
        extractedNote: 'Delaware C-Corp File 7492018 Active • FEIN 88-4920193 Validated with IRS',
        extractedFields: [
          { key: 'State of Incorporation', val: 'Delaware (Division of Corporations)' },
          { key: 'Federal EIN', val: '88-4920193' },
          { key: 'Registered Agent', val: 'The Corporation Trust Company, Wilmington DE' },
          { key: 'Authorized Stock', val: '10,000,000 Shares Common Stock at $0.0001 Par' },
        ],
      },
      {
        id: 'US-DOC-2',
        category: 'Tax Classification',
        label: 'IRS Form 5472 & Form 1120 Foreign-Owned Corporation Filing',
        fileName: 'irs_form_5472_25_foreign_owned_corp.pdf',
        fileSize: '3.4 MB',
        uploadedAt: '14 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.2,
        extractedNote: 'Form 5472 Mandatory Filing for 25% Foreign Ownership Passed • Section 6038A Penalty Shield Active',
        extractedFields: [
          { key: 'Ultimate Indirect 25% Shareholder', val: 'Ir. Aditya Pratama (Indonesian Citizen)' },
          { key: 'Direct Foreign Shareholder', val: 'PT Nusantara Kreasi Digital Tbk (100% Owner)' },
          { key: 'Reportable Transactions', val: 'US$ 120,000 R&D Cloud Services to Parent ID' },
          { key: 'IRC §482 TP Method', val: 'Cost Plus 8% Markup Documented' },
        ],
      },
      {
        id: 'US-DOC-3',
        category: 'Financial Statement',
        label: 'US GAAP Audited Financial Statements & Tax Computation',
        fileName: 'us_gaap_financial_statements_2025.pdf',
        fileSize: '5.1 MB',
        uploadedAt: '15 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.4,
        extractedNote: 'Revenue US$ 480,000 • Taxable Income US$ 88,000 • Federal CIT 21% + Delaware Franchise Tax',
        extractedFields: [
          { key: 'Total US Revenue', val: 'US$ 480,000' },
          { key: 'Taxable Income', val: 'US$ 88,000' },
          { key: 'Federal Tax Payable (21%)', val: 'US$ 18,480' },
          { key: 'DE Franchise Tax & Annual Report', val: 'US$ 450 Paid on Time' },
        ],
      },
      {
        id: 'US-DOC-4',
        category: 'Previous Year Tax Return',
        label: 'IRS Form 1120 US Corporation Income Tax Return & Acceptance Notice',
        fileName: 'irs_form_1120_tax_return_acceptance_2025.pdf',
        fileSize: '4.2 MB',
        uploadedAt: '16 Oct 2026',
        status: 'Verified by Document AI',
        confidenceScore: 99.6,
        extractedNote: 'Form 1120 MeF Electronic Filing Accepted by IRS • Form W-8BEN-E on File for Reduced WHT',
        extractedFields: [
          { key: 'IRS Submission ID', val: '8849201932026101689201' },
          { key: 'Return Status', val: 'Accepted by IRS Modernized e-File (MeF)' },
          { key: 'W-8BEN-E Treaty Benefit', val: '10% Royalty Rate under US-Indonesia Tax Treaty Article 13' },
        ],
      },
    ],
    structureNodes: [
      {
        id: 'US-STR-1',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        tradeName: 'Induk Indonesia (100% Sole Shareholder)',
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
        intercompanyTransaction: 'Pemilik Tunggal 100% Saham & Kontrak R&D Infrastruktur Cloud AI',
        annualIntercompanyVolume: 'US$ 120,000 / tahun',
        whtDomesticRate: '30% (IRC §1442)',
        whtTreatyRate: '10% (US–ID Treaty)',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 88,
      },
      {
        id: 'US-STR-2',
        entityName: 'Nusantara AI Technologies, Inc.',
        tradeName: 'Entitas Operasional Amerika Serikat (Selected)',
        role: 'Direct Subsidiary (Anak Perusahaan)',
        countryCode: 'US',
        flag: '🇺🇸',
        jurisdiction: 'United States (IRS)',
        taxId: '88-4920193',
        registrationNo: 'DE-FILE-7492018',
        directOwnership: 100,
        effectiveOwnership: 100,
        functionalCurrency: 'USD',
        transferPricingMethod: 'TNMM (Transactional Net Margin)',
        intercompanyTransaction: 'Pengembangan Enterprise Cloud AI & Kontrak Enterprise Pasar Amerika Utara',
        annualIntercompanyVolume: 'US$ 480,000 (Total Revenue)',
        whtDomesticRate: '21% Federal CIT',
        whtTreatyRate: '10% Tax Treaty Rate',
        treatyFormStatus: 'Verified (Form DGT / COR / W-8BEN-E)',
        complianceScore: 84,
      },
    ],
    intermediateShareholders: [
      {
        id: 'INT-00007',
        type: 'Parent Holding Shareholder',
        name: 'PT Nusantara Kreasi Digital Tbk',
        registrationNo: 'NIB-9120301928371',
        jurisdiction: '🇮🇩 Indonesia',
        taxId: '0013948214012000',
        sharePercent: 100,
        votingRightPercent: 100,
        effectiveDate: '2024-01-15',
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

export default function NexoraApp() {
  // Navigation State
  const [primaryNav, setPrimaryNav] = useState<PrimaryNav>('companies');
  const [subNav, setSubNav] = useState<SubNav>('corporate');
  const [corpViewTab, setCorpViewTab] = useState<CorporateViewTab>('all_in_one');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Companies & Multi-Country Subsidiaries State
  const [companies, setCompanies] = useState<CorporateEntity[]>(INITIAL_COMPANIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('ENT-ID-001');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [entityRoleFilter, setEntityRoleFilter] = useState<'ALL' | 'PARENT' | 'SUBSIDIARY'>('ALL');

  // Modals & Document State
  const [previewDoc, setPreviewDoc] = useState<CorporateDocument | null>(null);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [structureModalTab, setStructureModalTab] = useState<'general' | 'tp_tax' | 'individual_ubo'>('tp_tax');
  const [showShareholderModal, setShowShareholderModal] = useState<boolean>(false);
  const [shareholderInputMode, setShareholderInputMode] = useState<'search_existing' | 'manual'>('manual');
  const [showIndividualModal, setShowIndividualModal] = useState<boolean>(false);
  const [isDocAiRunning, setIsDocAiRunning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Subsidiary Form fields
  const [newSubName, setNewSubName] = useState<string>('Nusantara Pacific Pty. Ltd.');
  const [newSubTradeName, setNewSubTradeName] = useState<string>('Nusantara APAC Subsidiary');
  const [newSubCountry, setNewSubCountry] = useState<CountryCode>('SG');
  const [newSubTaxId, setNewSubTaxId] = useState<string>('202688192M (UEN)');
  const [newSubRegNo, setNewSubRegNo] = useState<string>('ACRA-202688192M');
  const [newSubOwnership, setNewSubOwnership] = useState<string>('100');
  const [newSubTpMethod, setNewSubTpMethod] = useState<SubsidiaryNode['transferPricingMethod']>('TNMM (Transactional Net Margin)');
  const [newSubFlow, setNewSubFlow] = useState<string>('Lisensi Software Regional & Jasa Manajemen');
  const [newSubVolume, setNewSubVolume] = useState<string>('S$ 150,000 / tahun');

  // Add Intermediate Shareholder Form fields
  const [newShName, setNewShName] = useState<string>('Global Horizon Holdings Pte. Ltd.');
  const [newShRegNo, setNewShRegNo] = useState<string>('ACRA-202499182K');
  const [newShJurisdiction, setNewShJurisdiction] = useState<string>('🇸🇬 Singapore');
  const [newShTaxId, setNewShTaxId] = useState<string>('UEN-202499182K');
  const [newShPercent, setNewShPercent] = useState<string>('15');
  const [newShAddress, setNewShAddress] = useState<string>('1 Raffles Place, #20-61 One Raffles Place, Singapore 048616');
  const [newShEmail, setNewShEmail] = useState<string>('legal@globalhorizon.sg');

  // Add Individual Shareholder Form fields
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

  // RBAC Access Control States
  const [activePersonaId, setActivePersonaId] = useState<string>('ceo_parent');
  const [showRbacModal, setShowRbacModal] = useState<boolean>(false);
  const [showConsolidationModal, setShowConsolidationModal] = useState<boolean>(false);
  const [restrictedNoticeEntity, setRestrictedNoticeEntity] = useState<CorporateEntity | null>(null);

  const activePersona = useMemo(
    () => USER_PERSONAS.find((p) => p.id === activePersonaId) || USER_PERSONAS[0],
    [activePersonaId]
  );
  const isGroupCeoOrParentExecutive =
    activePersona.canViewAll && activePersona.entityRole === 'PARENT';

  // AI Copilot States
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [remediatedTrxIds, setRemediatedTrxIds] = useState<string[]>([]);
  const [simulatedRevenueMultiplier, setSimulatedRevenueMultiplier] = useState<number>(100);
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

  // Selected Entity & Jurisdiction Config
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

  function handleUpdateCompanyField(field: string, value: string) {
    setCompanies((prev) =>
      prev.map((c) => (c.id === selectedEntity.id ? { ...c, [field]: value } : c))
    );
  }

  function handleUpdateCountry(code: CountryCode) {
    const meta = MULTI_COUNTRY_DATA[code];
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === selectedEntity.id
          ? {
              ...c,
              countryCode: code,
              jurisdictionName: meta.name,
              flag: meta.flag,
              functionalCurrency: meta.currencyCode,
              taxAuthority: meta.authorityFull,
            }
          : c
      )
    );
  }

  function handleSearchEntityByQuery(q: string): boolean {
    const found = companies.find(
      (c) =>
        c.taxId.toLowerCase().includes(q.toLowerCase()) ||
        c.legalName.toLowerCase().includes(q.toLowerCase())
    );
    if (found) {
      handleSelectEntity(found);
      return true;
    }
    return false;
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
    triggerToast(
      'Entitas anak perusahaan baru dibuat! Silakan lengkapi form Corporate Information di bawah.'
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
      `Anak perusahaan "${newSubName}" (${countryMeta.flag} ${countryMeta.name}) berhasil ditambahkan ke Company Structure!`
    );
  }

  function handleAddShareholder(e: React.FormEvent) {
    e.preventDefault();
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

  function handleRemediateTransaction(trxId: string, vendorName: string) {
    if (!remediatedTrxIds.includes(trxId)) {
      setRemediatedTrxIds((prev) => [...prev, trxId]);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedEntity.id
            ? { ...c, aiComplianceScore: Math.min(99, c.aiComplianceScore + 4) }
            : c
        )
      );
      triggerToast(
        `Anomali transaksi ${trxId} (${vendorName}) pada ${selectedEntity.legalName} berhasil dikoreksi secara fiskal!`
      );
    }
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* 1. Sleek 56px Top Header */}
      <TopHeader
        activePersona={{
          name: activePersona.name,
          title: activePersona.title,
          avatarBg: activePersona.avatarBg,
          avatarInitials: activePersona.avatarInitials,
          badge: activePersona.badge,
        }}
        selectedEntity={{
          flag: selectedEntity.flag,
          countryCode: selectedEntity.countryCode,
          legalName: selectedEntity.legalName,
          entityType: selectedEntity.entityType,
        }}
        onOpenRbac={() => setShowRbacModal(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isChatOpen={isChatOpen}
      />

      {/* Main Body: Dark Navy Sidebar + Workspace */}
      <div className="flex-1 flex min-h-[calc(100vh-3.5rem)]">
        <SidebarNav
          primaryNav={primaryNav}
          subNav={subNav}
          onNavigate={(primary, sub) => {
            setPrimaryNav(primary);
            if (sub) setSubNav(sub);
          }}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* ===================================================================
              PRIMARY TAB 1: COMPANIES
             =================================================================== */}
          {primaryNav === 'companies' && (
            <>
              {/* SUB-NAV 1: CORPORATE MANAGEMENT */}
              {subNav === 'corporate' && (
                <div className="space-y-6">
                  {/* Executive Group Summary Cards */}
                  <GroupSummaryCards
                    companies={companies}
                    selectedEntityId={selectedEntityId}
                    onSelectEntity={(comp) => {
                      const match = companies.find((c) => c.id === comp.id);
                      if (match) handleSelectEntity(match);
                    }}
                    isGroupCeoOrParentExecutive={isGroupCeoOrParentExecutive}
                    activePersonaTitle={activePersona.title}
                    canViewAll={activePersona.canViewAll}
                    accessibleEntityIds={activePersona.accessibleEntityIds}
                    onOpenConsolidationModal={() => setShowConsolidationModal(true)}
                    onSwitchToCeoMode={() => {
                      setActivePersonaId('ceo_parent');
                      triggerToast('Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk)');
                    }}
                  />

                  {/* Segmented Control for Corporate Views */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <SegmentedControl
                      options={[
                        { id: 'all_in_one', label: 'Corporate Profile & Statutory Docs' },
                        { id: 'subsidiaries_tree', label: 'Company Structure (Ownership Tree)' },
                        { id: 'directory', label: `Company List (${companies.length})` },
                      ]}
                      value={
                        corpViewTab === 'corporate_form'
                          ? 'all_in_one'
                          : corpViewTab
                      }
                      onChange={(val) => setCorpViewTab(val as CorporateViewTab)}
                    />

                    {corpViewTab === 'directory' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleStartAddNewCompany}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add Company
                      </Button>
                    )}
                  </div>

                  {/* View 1: Corporate Profile & Upload Document */}
                  {(corpViewTab === 'all_in_one' || corpViewTab === 'corporate_form') && (
                    <CorporateFormAndDocs
                      selectedEntity={selectedEntity}
                      onUpdateField={handleUpdateCompanyField}
                      onUpdateCountry={handleUpdateCountry}
                      onRunDocAiVerification={handleRunDocAiVerification}
                      isDocAiRunning={isDocAiRunning}
                      onPreviewDoc={(doc) => setPreviewDoc(doc)}
                      onSearchEntityByQuery={handleSearchEntityByQuery}
                    />
                  )}

                  {/* View 2: Company Structure Ownership Tree */}
                  {corpViewTab === 'subsidiaries_tree' && (
                    <CompanyStructureView
                      entity={selectedEntity}
                      onOpenAddSubsidiary={() => setShowStructureModal(true)}
                      onOpenAddCorporateShareholder={() => setShowShareholderModal(true)}
                      onOpenAddIndividualShareholder={() => setShowIndividualModal(true)}
                      onNavigateToUboWorkspace={() => {
                        setPrimaryNav('companies');
                        setSubNav('individual');
                      }}
                      onDeleteIntermediateShareholder={handleDeleteShareholder}
                      onDeleteIndividualShareholder={handleDeleteIndividualShareholder}
                    />
                  )}

                  {/* View 3: Company Directory Table */}
                  {corpViewTab === 'directory' && (
                    <CompanyDirectoryView
                      companies={companies}
                      filteredCompanies={filteredCompanies}
                      selectedEntityId={selectedEntityId}
                      onSelectCompany={(comp) => {
                        handleSelectEntity(comp);
                        setCorpViewTab('all_in_one');
                      }}
                      onDeleteCompany={handleDeleteCompany}
                      onStartAddNewCompany={handleStartAddNewCompany}
                      companySearch={companySearch}
                      setCompanySearch={setCompanySearch}
                      entityRoleFilter={entityRoleFilter}
                      setEntityRoleFilter={setEntityRoleFilter}
                    />
                  )}
                </div>
              )}

              {/* SUB-NAV 2: INDIVIDUAL SHAREHOLDER & UBO WORKSPACE */}
              {subNav === 'individual' && (
                <div className="space-y-6">
                  <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        OECD BEPS Action 6 &amp; FATF Beneficial Ownership
                      </span>
                      <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                        {selectedEntity.flag} {selectedEntity.legalName} — Individual Shareholders &amp; UBO
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ultimate Beneficial Owners (UBO), personal tax ID verification, and dividend tax optimization.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowIndividualModal(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      + Add Individual Shareholder
                    </Button>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <Card padding="md" className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">
                          {selectedEntity.individualShareholders.length}
                        </div>
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          REGISTERED UBOS / INDIVIDUALS
                        </span>
                      </div>
                    </Card>

                    <Card padding="md" className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">100%</div>
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          FATF &amp; AML VERIFIED
                        </span>
                      </div>
                    </Card>

                    <Card padding="md" className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">0%</div>
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          REINVESTED DIVIDEND TAX RATE
                        </span>
                      </div>
                    </Card>
                  </div>

                  {/* Individual Shareholders Table */}
                  <Card padding="none" className="overflow-hidden">
                    <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Detailed Beneficial Ownership Registry
                      </h3>
                      <Badge tone="success" size="sm">
                        FATF Compliant
                      </Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="py-3 px-4">Full Legal Name</th>
                            <th className="py-3 px-4">Role / Title</th>
                            <th className="py-3 px-4">Tax Residency</th>
                            <th className="py-3 px-4">Direct / UBO %</th>
                            <th className="py-3 px-4">Dividend Tax Regime</th>
                            <th className="py-3 px-4">KYC Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedEntity.individualShareholders.map((ind) => (
                            <tr key={ind.id} className="hover:bg-slate-50/80">
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">{ind.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{ind.nationalIdOrPassport}</span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{ind.roleTitle}</td>
                              <td className="py-3.5 px-4 text-slate-600">{ind.taxResidency}</td>
                              <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-emerald-700">
                                {ind.directSharePercent}% / {ind.effectiveSharePercent}%
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 max-w-xs text-[11px]">
                                {ind.dividendTaxRegime}
                              </td>
                              <td className="py-3.5 px-4">
                                <Badge tone="success" size="sm">
                                  {ind.kycDocStatus}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* SUB-NAV 3: STUDIES & FRAUD DETECTION */}
              {subNav === 'studies' && (
                <StudiesView
                  selectedEntity={selectedEntity}
                  cfg={cfg}
                  remediatedTrxIds={remediatedTrxIds}
                  onRemediateTransaction={handleRemediateTransaction}
                  onPreFillCopilotPrompt={(promptText) => {
                    setChatInput(promptText);
                    setIsChatOpen(true);
                  }}
                  onNavigateToCalculation={() => {
                    setPrimaryNav('calculation');
                  }}
                />
              )}

              {/* SUB-NAV 4: TAX CALENDAR */}
              {subNav === 'calendar' && (
                <Card padding="md" className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Multi-Subsidiary Statutory Tax Calendar (Oktober – Desember 2026)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Filing deadlines and tax settlement calendar across Indonesia, Singapore, Malaysia, and US.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-blue-600 block">
                        🇮🇩 PT Nusantara Kreasi Digital Tbk (Induk — DJP Coretax)
                      </span>
                      <p className="font-semibold text-slate-800">15 Nov 2026: Setor PPh Unifikasi &amp; PPh 21 TER</p>
                      <p className="text-slate-600">20 Nov 2026: Lapor SPT Masa PPh Unifikasi &amp; e-SKD PPh 26</p>
                      <p className="text-slate-600">30 Nov 2026: Setor &amp; Lapor SPT Masa PPN 1111</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-blue-600 block">
                        🇸🇬 Nusantara FinTech Pte. Ltd. (Anak Usaha SG — IRAS)
                      </span>
                      <p className="font-semibold text-slate-800">15 Nov 2026: Section 45 Non-Resident WHT Filing</p>
                      <p className="text-slate-600">30 Nov 2026: Corporate Income Tax Form C-S / C</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-blue-600 block">
                        🇲🇾 Nusantara Digital Solutions Sdn. Bhd. (Anak Usaha MY — LHDN)
                      </span>
                      <p className="font-semibold text-slate-800">15 Nov 2026: CP204 Monthly Tax Instalment</p>
                      <p className="text-slate-600">30 Nov 2026: RMCD SST-02 Return &amp; MyInvois Sync</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-blue-600 block">
                        🇺🇸 Nusantara AI Technologies, Inc. (Anak Usaha US — IRS)
                      </span>
                      <p className="font-semibold text-slate-800">15 Nov 2026: EFTPS Payroll &amp; Form 945 Backup WHT</p>
                      <p className="text-slate-600">15 Dec 2026: Q4 Corporate Estimated Tax &amp; Form 5472</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* SUB-NAV 5: REPORTS */}
              {subNav === 'reports' && (
                <Card padding="md" className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-1">
                      Authority Risk Benchmarking — {selectedEntity.flag} {selectedEntity.legalName} ({cfg.authorityShort})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Perbandingan rasio keuangan entitas terhadap benchmark otoritas pajak untuk mencegah {cfg.riskNoticeName}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cfg.industryBenchmarks.map((b) => (
                      <div
                        key={b.code}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{b.metric}</span>
                          <Badge tone={b.status === 'SAFE' ? 'success' : 'danger'} size="sm">
                            {b.status}
                          </Badge>
                        </div>
                        <p className="font-mono tabular-nums font-bold mt-2 text-slate-800">
                          Aktual: {b.companyValue}
                          {b.unit} (Standar Industri: {b.industryIdealMin}
                          {b.unit} – {b.industryIdealMax}
                          {b.unit})
                        </p>
                        <p className="text-slate-600 mt-1">{b.insight}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ===================================================================
              PRIMARY TAB 2: CALCULATION & FISCAL RECONCILIATION
             =================================================================== */}
          {primaryNav === 'calculation' && (
            <div className="space-y-6">
              {/* Simulator Card */}
              <Card padding="md" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      SUBSIDIARY &amp; CORPORATE TAX OPTIMIZATION SIMULATOR
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1">
                      {selectedEntity.flag} {selectedEntity.legalName} — Simulasi Insentif Pajak Legal ({cfg.authorityShort})
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      Skala Proyeksi: {simulatedRevenueMultiplier}%
                    </span>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      step={10}
                      value={simulatedRevenueMultiplier}
                      onChange={(e) => setSimulatedRevenueMultiplier(Number(e.target.value))}
                      className="w-32 accent-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 font-semibold block">
                      Skenario 1: Tarif Korporasi Standar
                    </span>
                    <span className="text-lg font-mono tabular-nums font-extrabold text-slate-900 mt-1 block">
                      {formatCurrency(
                        Math.round(
                          cfg.company.annualGrossRevenue *
                            0.22 *
                            cfg.corporateTaxNormalRate *
                            (simulatedRevenueMultiplier / 100)
                        ),
                        activeCountry
                      )}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60">
                    <span className="text-emerald-800 font-bold block">
                      Skenario 2 (Rekomendasi Nexora): Insentif {cfg.authorityShort}
                    </span>
                    <span className="text-lg font-mono tabular-nums font-extrabold text-emerald-700 mt-1 block">
                      {formatCurrency(
                        Math.round(
                          cfg.company.annualGrossRevenue *
                            0.22 *
                            (cfg.corporateTaxNormalRate * 0.58) *
                            (simulatedRevenueMultiplier / 100)
                        ),
                        activeCountry
                      )}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                      {cfg.smeSpecialRateLabel}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                    <span className="text-blue-600 font-bold block">
                      Penghematan Tax Treaty Antar Anak Perusahaan
                    </span>
                    <span className="text-lg font-mono tabular-nums font-extrabold text-blue-700 mt-1 block">
                      {formatCurrency(
                        Math.round(
                          cfg.crossBorderTreatyNote.annualTreatySaving *
                            (simulatedRevenueMultiplier / 100)
                        ),
                        activeCountry
                      )}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Audit Standard Multi-Country Fiscal Reconciliation Table */}
              <FiscalReconciliationAuditTable
                entity={selectedEntity}
                cfg={cfg}
                activeCountry={activeCountry}
              />
            </div>
          )}

          {/* ===================================================================
              PRIMARY TAB 3: TAX RETURN
             =================================================================== */}
          {primaryNav === 'tax_return' && (
            <Card padding="md" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    E-FILING &amp; DOCUMENT AI VALIDATION ({cfg.eInvoiceSystem})
                  </span>
                  <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                    {selectedEntity.flag} {selectedEntity.legalName} — {cfg.filingFormName}
                  </h1>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerToast(
                      `Draf ${cfg.filingFormName} untuk ${selectedEntity.legalName} berhasil diekspor!`
                    )
                  }
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Export Official Tax Return (.JSON / .XML)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {cfg.sampleDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-xl border ${
                      doc.status === 'RISIKO_FRAUD'
                        ? 'bg-rose-50/60 border-rose-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{doc.title}</span>
                      <Badge
                        tone={doc.status === 'PATUH' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="font-mono tabular-nums text-slate-600 mt-1 text-[11px]">
                      {doc.vendorName} • {doc.docNumber} • DPP:{' '}
                      {formatCurrency(doc.dpp, activeCountry)} • Pajak:{' '}
                      {formatCurrency(doc.taxAmount, activeCountry)}
                    </p>
                    <p className="text-slate-700 mt-2 leading-relaxed">
                      {doc.aiAuditSummary}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ===================================================================
              PRIMARY TAB 4: PAYMENT
             =================================================================== */}
          {primaryNav === 'payment' && (
            <Card padding="md" className="space-y-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  MULTI-SUBSIDIARY TAX TREASURY &amp; E-BILLING GATEWAY
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedEntity.flag} {selectedEntity.legalName} — Tax Payment &amp; Settlement
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block">YTD Taxes Settled ({cfg.currencyCode})</span>
                  <span className="text-lg font-mono tabular-nums font-extrabold text-slate-900 mt-1 block">
                    {formatCurrency(cfg.company.ytdTaxPaid, activeCountry)}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50/60">
                  <span className="text-emerald-700 font-semibold block">
                    Fraudulent Overpayment Blocked by AI
                  </span>
                  <span className="text-lg font-mono tabular-nums font-extrabold text-emerald-700 mt-1 block">
                    {formatCurrency(cfg.company.potentialFraudPrevented, activeCountry)}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-blue-50/60 flex flex-col justify-between">
                  <span className="text-blue-600 font-semibold block">
                    Generate Official Tax Billing Code ({cfg.authorityShort})
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      triggerToast(
                        `Kode Pembayaran Pajak (${cfg.authorityShort}) untuk ${selectedEntity.legalName} berhasil diterbitkan!`
                      )
                    }
                  >
                    Generate Billing ID ({cfg.authorityShort})
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* 5. Floating Nexora AI Tax Copilot */}
      <NexoraCopilot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isExpanded={isChatExpanded}
        onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
        chatHistory={chatHistory}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendMessage={(customPrompt) => handleAskFloatingAi(customPrompt)}
        isLoading={isChatLoading}
        activeEntityLabel={`${selectedEntity.flag} ${selectedEntity.legalName}`}
        copilotPresets={cfg.copilotPresets.map((p) => ({
          id: p.id,
          label: p.title,
          prompt: p.prompt,
        }))}
      />

      {/* 6. Modals */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <AddSubsidiaryModal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        selectedEntity={selectedEntity}
        structureModalTab={structureModalTab}
        setStructureModalTab={setStructureModalTab}
        newSubName={newSubName}
        setNewSubName={setNewSubName}
        newSubTradeName={newSubTradeName}
        setNewSubTradeName={setNewSubTradeName}
        newSubCountry={newSubCountry}
        setNewSubCountry={setNewSubCountry}
        newSubOwnership={newSubOwnership}
        setNewSubOwnership={setNewSubOwnership}
        newSubTaxId={newSubTaxId}
        setNewSubTaxId={setNewSubTaxId}
        newSubRegNo={newSubRegNo}
        setNewSubRegNo={setNewSubRegNo}
        newSubTpMethod={newSubTpMethod}
        setNewSubTpMethod={setNewSubTpMethod}
        newSubVolume={newSubVolume}
        setNewSubVolume={setNewSubVolume}
        newSubFlow={newSubFlow}
        setNewSubFlow={setNewSubFlow}
        onSubmit={handleAddSubsidiaryNode}
      />

      <AddShareholderModal
        isOpen={showShareholderModal}
        onClose={() => setShowShareholderModal(false)}
        selectedEntity={selectedEntity}
        shareholderInputMode={shareholderInputMode}
        setShareholderInputMode={setShareholderInputMode}
        newShName={newShName}
        setNewShName={setNewShName}
        newShRegNo={newShRegNo}
        setNewShRegNo={setNewShRegNo}
        newShJurisdiction={newShJurisdiction}
        setNewShJurisdiction={setNewShJurisdiction}
        newShTaxId={newShTaxId}
        setNewShTaxId={setNewShTaxId}
        newShPercent={newShPercent}
        setNewShPercent={setNewShPercent}
        newShAddress={newShAddress}
        setNewShAddress={setNewShAddress}
        newShEmail={newShEmail}
        setNewShEmail={setNewShEmail}
        onSubmit={handleAddShareholder}
      />

      <AddIndividualModal
        isOpen={showIndividualModal}
        onClose={() => setShowIndividualModal(false)}
        selectedEntity={selectedEntity}
        newIndName={newIndName}
        setNewIndName={setNewIndName}
        newIndType={newIndType}
        setNewIndType={setNewIndType}
        newIndRole={newIndRole}
        setNewIndRole={setNewIndRole}
        newIndNationality={newIndNationality}
        setNewIndNationality={setNewIndNationality}
        newIndResidency={newIndResidency}
        setNewIndResidency={setNewIndResidency}
        newIndNationalId={newIndNationalId}
        setNewIndNationalId={setNewIndNationalId}
        newIndTaxId={newIndTaxId}
        setNewIndTaxId={setNewIndTaxId}
        newIndDirectShare={newIndDirectShare}
        setNewIndDirectShare={setNewIndDirectShare}
        newIndEffectiveShare={newIndEffectiveShare}
        setNewIndEffectiveShare={setNewIndEffectiveShare}
        newIndDividendRegime={newIndDividendRegime}
        setNewIndDividendRegime={setNewIndDividendRegime}
        newIndAddress={newIndAddress}
        setNewIndAddress={setNewIndAddress}
        newIndEmail={newIndEmail}
        setNewIndEmail={setNewIndEmail}
        onSubmit={handleAddIndividualShareholder}
      />

      <RbacGovernanceModal
        isOpen={showRbacModal}
        onClose={() => setShowRbacModal(false)}
        personas={USER_PERSONAS}
        activePersonaId={activePersonaId}
        onSelectPersona={(persona) => {
          setActivePersonaId(persona.id);
          if (!persona.canViewAll && !persona.accessibleEntityIds.includes(selectedEntityId)) {
            setSelectedEntityId(persona.accessibleEntityIds[0]);
          }
          setShowRbacModal(false);
          triggerToast(`Beralih ke Peran: ${persona.name} (${persona.title})`);
        }}
      />

      <RestrictedNoticeModal
        entity={restrictedNoticeEntity}
        activePersona={activePersona}
        onClose={() => setRestrictedNoticeEntity(null)}
        onSwitchToCeo={() => {
          if (restrictedNoticeEntity) {
            setActivePersonaId('ceo_parent');
            setSelectedEntityId(restrictedNoticeEntity.id);
            setRestrictedNoticeEntity(null);
            triggerToast(
              `Beralih ke Hak Akses: Ir. Aditya Pratama (Group CEO - Induk) • Membuka ${restrictedNoticeEntity.legalName}`
            );
          }
        }}
      />

      <ConsolidationModal
        isOpen={showConsolidationModal}
        onClose={() => setShowConsolidationModal(false)}
        companies={companies}
        onSelectEntity={(comp) => {
          setSelectedEntityId(comp.id);
          triggerToast(`Membuka entitas: ${comp.flag} ${comp.legalName}`);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-blue-500/40 flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
