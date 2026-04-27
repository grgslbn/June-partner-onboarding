'use client';

import type { SaveState } from '@/hooks/useAutosave';

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;

  const styles: Record<Exclude<SaveState, 'idle'>, string> = {
    saving: 'text-gray-400',
    saved:  'text-green-600',
    error:  'text-red-600',
  };

  const labels: Record<Exclude<SaveState, 'idle'>, string> = {
    saving: 'Saving…',
    saved:  'Saved',
    error:  'Save failed',
  };

  return (
    <span className={`text-xs font-medium ${styles[state as Exclude<SaveState, 'idle'>]}`}>
      {labels[state as Exclude<SaveState, 'idle'>]}
    </span>
  );
}
