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
  for (const doc of documents) {
    const expectedTax = doc.taxableBase.value * TAX_CONFIG[doc.country].indirectRate;
    if (doc.country === 'ID' && (!doc.taxIdValidated || Math.abs(doc.taxAmount.value - expectedTax) > 1)) findings.push(finding(doc, 'TBTS', 'critical', 'Identitas vendor atau perhitungan PPN tidak valid.', `${doc.number.value}: pajak ${doc.taxAmount.value}, ekspektasi ${expectedTax}`, 'Tahan pengkreditan dan minta NSFP serta bukti transaksi yang valid.'));
    if (doc.country === 'SG' && !doc.taxIdValidated) findings.push(finding(doc, 'MISSING_TRADER', 'critical', 'Registrasi pemasok tidak tervalidasi sehingga ada risiko Missing Trader Fraud.', doc.counterparty.value, 'Tahan klaim GST dan lakukan due diligence pemasok.'));
    if (doc.country === 'MY' && !doc.invoiceUuid.value.trim()) findings.push(finding(doc, 'MYINVOIS_UUID', 'high', 'Dokumen tidak memiliki UUID MyInvois.', doc.number.value, 'Minta e-Invoice tervalidasi LHDN sebelum mengklaim biaya.'));
    if (!doc.deductible || !doc.hasSupportingEvidence) findings.push(finding(doc, 'NON_DEDUCTIBLE', 'medium', 'Biaya ditandai non-deductible atau tidak memiliki bukti pendukung.', doc.attachmentName, 'Lengkapi bukti atau lakukan koreksi fiskal positif.'));
  }
  const groups = new Map<string, TaxDocument[]>();
  documents.forEach((doc) => { const key = `${doc.entityId}|${doc.counterparty.value.toLowerCase()}|${doc.date.value}`; groups.set(key, [...(groups.get(key) ?? []), doc]); });
  groups.forEach((docs) => { if (docs.length >= 3) findings.push(finding(docs[0], 'SPLIT_INVOICING', 'high', `${docs.length} invoice vendor yang sama dibuat pada tanggal yang sama.`, docs.map((doc) => doc.number.value).join(', '), 'Gabungkan review invoice dan verifikasi kontrak/otorisasi transaksi.')); });
  const scores = zScores(documents.map((doc) => doc.totalAmount.value));
  scores?.forEach((score, index) => { if (Math.abs(score) >= 2) findings.push(finding(documents[index], 'Z_SCORE', 'high', `Nilai invoice menyimpang dengan Z-Score ${score.toFixed(2)}.`, documents[index].number.value, 'Bandingkan dengan kontrak, PO, dan histori vendor.')); });
  return { findings, zScoreReady: scores !== null };
}
