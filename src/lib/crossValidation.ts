import type { CorporateEntity, TaxDocument } from './domain';

export interface CrossValidationIssue { documentId: string; field: 'counterparty' | 'counterpartyTaxId' | 'ownershipPercentage'; message: string }

export function crossValidateDocuments(entity: CorporateEntity, documents: TaxDocument[]): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];
  const taxIds = new Map<string, TaxDocument[]>();
  const names = new Map<string, TaxDocument[]>();
  for (const document of documents) {
    const taxId = document.counterpartyTaxId.value.replace(/\W/g, '').toUpperCase();
    const name = document.counterparty.value.trim().toLowerCase();
    taxIds.set(taxId, [...(taxIds.get(taxId) ?? []), document]);
    names.set(name, [...(names.get(name) ?? []), document]);
  }
  for (const [name, sameName] of names) {
    const ids = new Set(sameName.map((document) => document.counterpartyTaxId.value.replace(/\W/g, '').toUpperCase()));
    if (ids.size > 1) sameName.forEach((document) => issues.push({ documentId: document.id, field: 'counterpartyTaxId', message: `Pihak ${name} memiliki identitas pajak berbeda antar dokumen.` }));
  }
  for (const [taxId, sameTaxId] of taxIds) {
    const distinctNames = new Set(sameTaxId.map((document) => document.counterparty.value.trim().toLowerCase()));
    if (distinctNames.size > 1) sameTaxId.forEach((document) => issues.push({ documentId: document.id, field: 'counterparty', message: `Identitas ${taxId} digunakan oleh nama pihak berbeda.` }));
  }
  const ownershipDocs = documents.filter((document) => document.type === 'shareholder' && document.ownershipPercentage.value !== null);
  const ownershipTotal = ownershipDocs.reduce((sum, document) => sum + (document.ownershipPercentage.value ?? 0), 0);
  if (ownershipDocs.length && Math.abs(ownershipTotal - 100) > 0.001) ownershipDocs.forEach((document) => issues.push({ documentId: document.id, field: 'ownershipPercentage', message: `Total persentase saham pada dokumen ${entity.name} adalah ${ownershipTotal}%, bukan 100%.` }));
  return issues;
}
