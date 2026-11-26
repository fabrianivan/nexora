import type { CorporateEntity, Ownership } from './domain';

export interface OwnershipIssue { type: 'total' | 'circular' | 'missing'; message: string; entityId?: string }

export function validateOwnership(entities: CorporateEntity[], links: Ownership[]): OwnershipIssue[] {
  const ids = new Set(entities.map((entity) => entity.id));
  const issues: OwnershipIssue[] = [];
  for (const link of links) if (!ids.has(link.ownerId) || !ids.has(link.ownedId)) issues.push({ type: 'missing', message: 'Relasi merujuk entitas yang tidak tersedia.' });
  for (const entity of entities) {
    const incoming = links.filter((link) => link.ownedId === entity.id);
    if (incoming.length) {
      const total = incoming.reduce((sum, link) => sum + link.percentage, 0);
      if (Math.abs(total - 100) > 0.001) issues.push({ type: 'total', entityId: entity.id, message: `Total kepemilikan ${entity.name} adalah ${total}%, bukan 100%.` });
    }
  }
  const graph = new Map<string, string[]>();
  links.forEach((link) => graph.set(link.ownerId, [...(graph.get(link.ownerId) ?? []), link.ownedId]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((graph.get(id) ?? []).some(visit)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  if (entities.some((entity) => visit(entity.id))) issues.push({ type: 'circular', message: 'Circular ownership terdeteksi. Hapus relasi yang kembali ke pemilik sebelumnya.' });
  return issues;
}
