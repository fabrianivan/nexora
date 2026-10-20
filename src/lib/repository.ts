import { emptyWorkspace, workspaceSchema, type Workspace } from './domain';

export interface WorkspaceRepository { load(): Workspace; save(workspace: Workspace): void; clear(): void }
const STORAGE_KEY = 'nexora.workspace.v1';

export class LocalWorkspaceRepository implements WorkspaceRepository {
  load(): Workspace {
    if (typeof window === 'undefined') return emptyWorkspace;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWorkspace;
    const parsed = workspaceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyWorkspace;
  }
  save(workspace: Workspace): void { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceSchema.parse(workspace))); }
  clear(): void { window.localStorage.removeItem(STORAGE_KEY); }
}
