import { z } from 'zod';
import type { CorporateEntity, CountryCode } from './domain';
import { TAX_CONFIG } from './tax';
import { getCountryAdapter } from './adapters/countryAdapter';

export const DRAFT_WATERMARK = 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS';

export const returnDraftSchema = z.object({
  schemaVersion: z.literal('1.0'),
  generatedAt: z.string().datetime(),
  watermark: z.string().default(DRAFT_WATERMARK),
  form: z.string(),
  jurisdictionStatus: z.enum(['full', 'preview']).default('full'),
  entity: z.object({
    name: z.string(),
    country: z.string(),
    taxId: z.string(),
    fiscalYearEnd: z.string(),
  }),
  amounts: z.object({
    commercialProfit: z.number(),
    positiveCorrections: z.number(),
    negativeCorrections: z.number(),
    taxableIncome: z.number(),
    taxDue: z.number(),
  }),
  paymentCodes: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        channel: z.string(),
      })
    )
    .optional(),
  paymentInformation: z.string(),
  disclaimer: z
    .string()
    .default(
      'Skema internal Nexora v1.0 untuk review manusia; belum divalidasi terhadap skema e-Filing resmi otoritas pajak.'
    ),
});

export type ReturnAmounts = z.infer<typeof returnDraftSchema>['amounts'];
export type ReturnDraft = z.infer<typeof returnDraftSchema>;

export function createReturnDraft(
  entity: CorporateEntity,
  amounts: ReturnAmounts
): ReturnDraft {
  const adapter = getCountryAdapter(entity.country as CountryCode);
  return returnDraftSchema.parse({
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    watermark: DRAFT_WATERMARK,
    form: TAX_CONFIG[entity.country].returnName,
    jurisdictionStatus: adapter.status,
    entity: {
      name: entity.name,
      country: entity.country,
      taxId: entity.taxId,
      fiscalYearEnd: entity.fiscalYearEnd,
    },
    amounts,
    paymentCodes: adapter.paymentCodes.map((p) => ({
      code: p.code,
      name: p.name,
      channel: p.channel,
    })),
    paymentInformation: `${TAX_CONFIG[entity.country].payment} hanya informasi; Nexora tidak memproses transaksi pembayaran.`,
  });
}

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[char]!
  );

export function returnDraftToXml(draft: ReturnDraft): string {
  const paymentNodes = (draft.paymentCodes ?? [])
    .map(
      (p) =>
        `<PaymentCode code="${escapeXml(p.code)}" channel="${escapeXml(p.channel)}">${escapeXml(p.name)}</PaymentCode>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><TaxReturn schemaVersion="1.0" watermark="${escapeXml(draft.watermark)}"><Watermark>${escapeXml(draft.watermark)}</Watermark><Form>${escapeXml(draft.form)}</Form><Entity country="${escapeXml(draft.entity.country)}"><Name>${escapeXml(draft.entity.name)}</Name><TaxId>${escapeXml(draft.entity.taxId)}</TaxId><FiscalYearEnd>${escapeXml(draft.entity.fiscalYearEnd)}</FiscalYearEnd></Entity><Amounts><CommercialProfit>${draft.amounts.commercialProfit}</CommercialProfit><PositiveCorrections>${draft.amounts.positiveCorrections}</PositiveCorrections><NegativeCorrections>${draft.amounts.negativeCorrections}</NegativeCorrections><TaxableIncome>${draft.amounts.taxableIncome}</TaxableIncome><TaxDue>${draft.amounts.taxDue}</TaxDue></Amounts><PaymentCodes>${paymentNodes}</PaymentCodes><PaymentInformation>${escapeXml(draft.paymentInformation)}</PaymentInformation><Disclaimer>${escapeXml(draft.disclaimer)}</Disclaimer></TaxReturn>`;
}
