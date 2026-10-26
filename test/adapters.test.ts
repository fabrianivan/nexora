import { describe, expect, it } from 'vitest';
import { getAdapter, listAdapters } from '../src/lib/adapters';
import { idAdapter } from '../src/lib/adapters/idAdapter';
import { sgAdapter } from '../src/lib/adapters/sgAdapter';
import { myAdapter } from '../src/lib/adapters/myAdapter';
import { usAdapter } from '../src/lib/adapters/usAdapter';

interface TestDraftReturn {
  id: string;
  formType: string;
  status: string;
  induk: { netIncome: number; taxPayable: number };
  lampiranI: { positiveCorrections: number; negativeCorrections?: number; commercialProfit?: number; taxableIncome?: number };
  makerChecker: { draftedBy: { id: string } };
}

describe('Country Adapters Registry', () => {
  it('retrieves adapters for all supported jurisdictions', () => {
    expect(getAdapter('ID').countryCode).toBe('ID');
    expect(getAdapter('SG').countryCode).toBe('SG');
    expect(getAdapter('MY').countryCode).toBe('MY');
    expect(getAdapter('US').countryCode).toBe('US');
    expect(getAdapter('OTHER').countryCode).toBe('ID'); // Fallback to ID
  });

  it('lists all 4 adapters with appropriate support status', () => {
    const adapters = listAdapters();
    expect(adapters).toHaveLength(4);
    const id = adapters.find((a) => a.countryCode === 'ID');
    const sg = adapters.find((a) => a.countryCode === 'SG');
    expect(id?.isSupported).toBe(true);
    expect(sg?.isSupported).toBe(true);
  });
});

describe('Indonesia (ID) Tax Adapter', () => {
  it('validates 15-digit and 16-digit NPWP format', () => {
    expect(idAdapter.validateTaxId('0123456789012345').valid).toBe(true);
    expect(idAdapter.validateTaxId('01.234.567.8-901.234').valid).toBe(true);
    expect(idAdapter.validateTaxId('012345678901234').valid).toBe(true); // 15-digit
    expect(idAdapter.validateTaxId('invalid-npwp').valid).toBe(false);
  });

  it('calculates PPh Badan Pasal 31E small business facility (revenue <= 4.8M)', () => {
    // 50% discount on 22% rate = 11%
    const calc = idAdapter.calculateCorporateTax({
      taxableIncome: 100_000_000,
      grossRevenue: 4_000_000_000,
    });
    expect(calc.taxDue).toBe(11_000_000); // 100M * 11%
    expect(calc.effectiveRate).toBe(0.11);
    expect(calc.explanation).toContain('Pasal 31E');
  });

  it('calculates standard 22% rate when gross revenue exceeds 50B', () => {
    const calc = idAdapter.calculateCorporateTax({
      taxableIncome: 1_000_000_000,
      grossRevenue: 60_000_000_000,
    });
    expect(calc.taxDue).toBe(220_000_000); // 1B * 22%
    expect(calc.effectiveRate).toBe(0.22);
  });

  it('calculates proportional Pasal 31E facility for revenue between 4.8B and 50B', () => {
    const calc = idAdapter.calculateCorporateTax({
      taxableIncome: 1_000_000_000,
      grossRevenue: 24_000_000_000,
    });
    // Facility portion gets 11%, remainder gets 22%
    expect(calc.taxDue).toBeLessThan(220_000_000);
    expect(calc.taxDue).toBeGreaterThan(110_000_000);
  });

  it('returns statutory deadlines for PPh 21, PPh 23, PPN, and SPT Tahunan', () => {
    const deadlines = idAdapter.getDeadlines(2026);
    expect(deadlines.length).toBeGreaterThan(0);
    expect(deadlines.some((d) => d.id === 'spt-tahunan-badan')).toBe(true);
    expect(deadlines.some((d) => d.id === 'ppn-masa-jan')).toBe(true);
  });

  it('generates complete SPT 1771 draft return', () => {
    const draft = idAdapter.generateReturnDraft({
      entity: {
        id: 'ent-1',
        name: 'PT Nusantara Teknologi Solusi',
        country: 'ID',
        taxId: '0123456789012345',
        address: 'Sudirman Central Business District Jakarta',
        fiscalYearEnd: '12-31',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      fiscalYear: 2025,
      taxableIncome: 1_000_000_000,
      taxDue: 220_000_000,
      adjustments: [
        {
          id: 'adj-1',
          fiscalYear: 2025,
          accountCode: '6100',
          accountName: 'Biaya Jamuan',
          commercialAmount: 50_000_000,
          adjustmentType: 'positive',
          adjustmentAmount: 50_000_000,
          fiscalAmount: 0,
          legalBasis: 'UU PPh Pasal 9 ayat (1) huruf c',
          notes: 'Tanpa daftar nominatif',
        },
      ],
      creator: {
        id: 'usr-1',
        name: 'Ahmad Staff Pajak',
        email: 'ahmad@ptnts.id',
        role: 'konsultan_pajak',
      },
    }) as unknown as TestDraftReturn;

    expect(draft.formType).toBe('SPT 1771');
    expect(draft.status).toBe('draft');
    expect(draft.induk.netIncome).toBe(1_000_000_000);
    expect(draft.induk.taxPayable).toBe(220_000_000);
    expect(draft.lampiranI.positiveCorrections).toBe(50_000_000);
    expect(draft.makerChecker.draftedBy.id).toBe('usr-1');
  });
});

describe('Singapore (SG) Tax Adapter', () => {
  it('validates standard UEN formats', () => {
    expect(sgAdapter.validateTaxId('201812345A').valid).toBe(true); // 9 digits + letter
    expect(sgAdapter.validateTaxId('T18LL1234A').valid).toBe(true); // TyyLLnnnnL
    expect(sgAdapter.validateTaxId('short').valid).toBe(false);
  });

  it('calculates corporate tax with Partial Tax Exemption (PTE)', () => {
    // 75% exempt on first 10,000 = 7,500 exempt (2,500 taxable)
    // 50% exempt on next 190,000 = 95,000 exempt (95,000 taxable)
    // Total taxable = 97,500 out of 200,000. Tax at 17% = 16,575
    const calc = sgAdapter.calculateCorporateTax({
      taxableIncome: 200_000,
    });
    expect(calc.taxDue).toBeCloseTo(16_575);
    expect(calc.effectiveRate).toBeLessThan(0.17);
  });

  it('generates Form C-S draft for eligible companies', () => {
    const draft = sgAdapter.generateReturnDraft({
      entity: {
        id: 'sg-ent-1',
        name: 'Nexora Singapore Pte. Ltd.',
        country: 'SG',
        taxId: '202412345K',
        address: '1 Marina Boulevard, Singapore',
        fiscalYearEnd: '12-31',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      fiscalYear: 2025,
      taxableIncome: 200_000,
      taxDue: 16_575,
      adjustments: [],
      creator: {
        id: 'usr-2',
        name: 'Tan Wei Ming',
        email: 'tan@nexora.sg',
        role: 'konsultan_pajak',
      },
    }) as unknown as TestDraftReturn;

    expect(draft.formType).toBe('Form C-S');
    expect(draft.induk.netIncome).toBe(200_000);
  });
});

describe('Malaysia (MY) Tax Adapter', () => {
  it('validates 10 to 12 digit TIN / Registration numbers', () => {
    expect(myAdapter.validateTaxId('C2345678901').valid).toBe(true);
    expect(myAdapter.validateTaxId('123456789012').valid).toBe(true);
    expect(myAdapter.validateTaxId('123').valid).toBe(false);
  });

  it('calculates SME tiered rate for qualified small enterprise', () => {
    // SME: 15% on first 150k = 22,500
    const calc = myAdapter.calculateCorporateTax({
      taxableIncome: 100_000,
      grossRevenue: 10_000_000,
      isSme: true,
    });
    expect(calc.taxDue).toBe(15_000); // 100k * 15%
    expect(calc.effectiveRate).toBe(0.15);
  });

  it('calculates standard 24% rate for non-SME', () => {
    const calc = myAdapter.calculateCorporateTax({
      taxableIncome: 100_000,
      grossRevenue: 60_000_000,
      isSme: false,
    });
    expect(calc.taxDue).toBe(24_000); // 100k * 24%
    expect(calc.effectiveRate).toBe(0.24);
  });
});

describe('United States (US) Tax Adapter', () => {
  it('validates 9-digit EIN format with or without dash', () => {
    expect(usAdapter.validateTaxId('12-3456789').valid).toBe(true);
    expect(usAdapter.validateTaxId('123456789').valid).toBe(true);
    expect(usAdapter.validateTaxId('12345').valid).toBe(false);
  });

  it('calculates flat 21% federal corporate income tax', () => {
    const calc = usAdapter.calculateCorporateTax({
      taxableIncome: 500_000,
    });
    expect(calc.taxDue).toBe(105_000); // 500k * 21%
    expect(calc.effectiveRate).toBe(0.21);
  });
});
