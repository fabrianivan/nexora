import { InMemoryRepository } from './inMemory';
import type { NexoraRepository } from './types';

let repository: NexoraRepository | undefined;

export function getRepository(): NexoraRepository {
  repository ??= new InMemoryRepository();
  return repository;
}

export type { AuditFilter, FindingPatch, NexoraRepository } from './types';
