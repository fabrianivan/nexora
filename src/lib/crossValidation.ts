import type { CorporateEntity, TaxDocument } from './domain';

export interface CrossValidationIssue {
  documentId: string;
  relatedDocumentId?: string;
  field:
    | 'counterparty'
    | 'counterpartyTaxId'
    | 'ownershipPercentage'
    | 'totalAmount'
    | 'period';
  severity?: 'high' | 'medium';
  sourceLabel?: string;
  message: string;
}

export function crossValidateDocuments(
  entity: CorporateEntity,
  documents: TaxDocument[]
): CrossValidationIssue[] {
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
    const ids = new Set(
      sameName.map((document) =>
        document.counterpartyTaxId.value.replace(/\W/g, '').toUpperCase()
      )
    );
    if (ids.size > 1) {
      sameName.forEach((document) =>
        issues.push({
          documentId: document.id,
          relatedDocumentId: sameName.find((d) => d.id !== document.id)?.id,
          field: 'counterpartyTaxId',
          severity: 'high',
          sourceLabel: `${document.attachmentName} vs ${sameName.map((d) => d.attachmentName).join(', ')}`,
          message: `Pihak ${name} memiliki identitas pajak berbeda antar dokumen.`,
        })
      );
    }
  }

  for (const [taxId, sameTaxId] of taxIds) {
    const distinctNames = new Set(
      sameTaxId.map((document) => document.counterparty.value.trim().toLowerCase())
    );
    if (distinctNames.size > 1) {
      sameTaxId.forEach((document) =>
        issues.push({
          documentId: document.id,
          relatedDocumentId: sameTaxId.find((d) => d.id !== document.id)?.id,
          field: 'counterparty',
          severity: 'high',
          sourceLabel: `${document.attachmentName} (${taxId})`,
          message: `Identitas ${taxId} digunakan oleh nama pihak berbeda.`,
        })
      );
    }
  }

  // Compare shareholder documents & deed ownership percentage totals
  const ownershipDocs = documents.filter(
    (document) =>
      (document.type === 'shareholder' || document.type === 'deed') &&
      document.ownershipPercentage.value !== null
  );
  const shareholderOnlyDocs = documents.filter(
    (document) =>
      document.type === 'shareholder' && document.ownershipPercentage.value !== null
  );
  const ownershipTotal = shareholderOnlyDocs.reduce(
    (sum, document) => sum + (document.ownershipPercentage.value ?? 0),
    0
  );
  if (shareholderOnlyDocs.length && Math.abs(ownershipTotal - 100) > 0.001) {
    shareholderOnlyDocs.forEach((document) =>
      issues.push({
        documentId: document.id,
        field: 'ownershipPercentage',
        severity: 'high',
        sourceLabel: `${document.attachmentName} (Daftar Pemegang Saham)`,
        message: `Total persentase saham pada dokumen ${entity.name} adalah ${ownershipTotal}%, bukan 100%.`,
      })
    );
  }

  // Compare Deed vs Shareholder vs Previous Tax Return ownership if both present
  const deedDocs = ownershipDocs.filter((d) => d.type === 'deed');
  const prevReturnDocs = documents.filter(
    (d) => d.type === 'previous_tax_return' && d.ownershipPercentage.value !== null
  );
  if (deedDocs.length > 0 && prevReturnDocs.length > 0) {
    const deedTotal = deedDocs.reduce(
      (s, d) => s + (d.ownershipPercentage.value ?? 0),
      0
    );
    const prevTotal = prevReturnDocs.reduce(
      (s, d) => s + (d.ownershipPercentage.value ?? 0),
      0
    );
    if (Math.abs(deedTotal - prevTotal) > 0.001) {
      issues.push({
        documentId: deedDocs[0].id,
        relatedDocumentId: prevReturnDocs[0].id,
        field: 'ownershipPercentage',
        severity: 'medium',
        sourceLabel: `${deedDocs[0].attachmentName} vs ${prevReturnDocs[0].attachmentName}`,
        message: `Selisih komposisi saham antara Akta (${deedTotal}%) dan SPT Tahun Sebelumnya (${prevTotal}%) untuk ${entity.name}.`,
      });
    }
  }

  return issues;
}
