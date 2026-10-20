import type { CountryCode, TaxDocument } from './domain';
import { TAX_CONFIG } from './tax';

export type Severity = 'critical' | 'high' | 'medium';
export interface Finding { id: string; entityId: string; country: CountryCode; severity: Severity; rule: string; explanation: string; evidence: string; remediation: string; date: string }
const finding = (doc: TaxDocument, rule: string, severity: Severity, explanation: string, evidence: string, remediation: string): Finding => ({ id: `${rule}:${doc.id}`, entityId: doc.entityId, country: doc.country, severity, rule, explanation, evidence, remediation, date: doc.date.value });

export function zScores(values: number[], minimum = 5): number[] | null {
  if (values.length < minimum) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const deviation = Math.sqrt(variance);
  return values.map((value) => deviation === 0 ? 0 : (value - mean) / deviation);
}

export function detectFraud(documents: TaxDocument[]): { findings: Finding[]; zScoreReady: boolean } {
  const findings: Finding[] = [];
  const invoices = documents.filter((doc) => doc.type === 'e_invoice');
  for (const doc of invoices) {
    const expectedTax = doc.taxableBase.value * TAX_CONFIG[doc.country].indirectRate;
    if (doc.country === 'ID' && (!doc.taxIdValidated || Math.abs(doc.taxAmount.value - expectedTax) > 1)) findings.push(finding(doc, 'TBTS', 'critical', 'Indikator risiko TBTS: identitas vendor belum tervalidasi atau nominal PPN berbeda dari asumsi tarif standar Nexora. Ini perlu verifikasi, bukan kesimpulan fraud.', `${doc.number.value}: pajak ${doc.taxAmount.value}, asumsi tarif standar ${expectedTax}`, 'Verifikasi NSFP, ketentuan tarif/pengecualian yang berlaku, vendor, dan bukti transaksi sebelum mengambil tindakan.'));
    if (doc.country === 'SG' && !doc.taxIdValidated) findings.push(finding(doc, 'MISSING_TRADER', 'critical', 'Registrasi pemasok tidak tervalidasi sehingga ada risiko Missing Trader Fraud.', doc.counterparty.value, 'Tahan klaim GST dan lakukan due diligence pemasok.'));
    if (doc.country === 'MY' && !doc.invoiceUuid.value.trim()) findings.push(finding(doc, 'MYINVOIS_UUID', 'high', 'Dokumen tidak memiliki UUID MyInvois.', doc.number.value, 'Minta e-Invoice tervalidasi LHDN sebelum mengklaim biaya.'));
    if (!doc.deductible || !doc.hasSupportingEvidence) findings.push(finding(doc, 'NON_DEDUCTIBLE', 'medium', 'Biaya ditandai non-deductible atau tidak memiliki bukti pendukung.', doc.attachmentName, 'Lengkapi bukti atau lakukan koreksi fiskal positif.'));
  }
  const groups = new Map<string, TaxDocument[]>();
  invoices.forEach((doc) => { const key = `${doc.entityId}|${doc.counterparty.value.toLowerCase()}|${doc.date.value}`; groups.set(key, [...(groups.get(key) ?? []), doc]); });
  groups.forEach((docs) => { if (docs.length >= 3) findings.push(finding(docs[0], 'SPLIT_INVOICING', 'high', `${docs.length} invoice vendor yang sama dibuat pada tanggal yang sama.`, docs.map((doc) => doc.number.value).join(', '), 'Gabungkan review invoice dan verifikasi kontrak/otorisasi transaksi.')); });
  const byEntity = new Map<string, TaxDocument[]>();
  invoices.forEach((doc) => byEntity.set(doc.entityId, [...(byEntity.get(doc.entityId) ?? []), doc]));
  let zScoreReady = false;
  byEntity.forEach((entityInvoices) => {
    const scores = zScores(entityInvoices.map((doc) => doc.totalAmount.value));
    if (!scores) return;
    zScoreReady = true;
    scores.forEach((score, index) => { if (Math.abs(score) >= 2) findings.push(finding(entityInvoices[index], 'Z_SCORE', 'high', `Nilai invoice menyimpang dengan Z-Score ${score.toFixed(2)}.`, entityInvoices[index].number.value, 'Bandingkan dengan kontrak, PO, dan histori vendor.')); });
  });
  return { findings, zScoreReady };
}
