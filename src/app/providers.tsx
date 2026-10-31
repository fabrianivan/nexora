'use client';

import React from 'react';
import { WorkspaceProvider } from '@/state/workspace';
import { UiProvider } from '@/state/ui';
import { AppShell } from '@/shell/AppShell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <UiProvider>
        <AppShell>{children}</AppShell>
      </UiProvider>
    </WorkspaceProvider>
  );
}
