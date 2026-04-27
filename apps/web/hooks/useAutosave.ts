'use client';

import { useRef, useCallback } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Options<T> = {
  partnerId: string;
  debounceMs?: number;
  onSaved: (data: T) => void;
  onStateChange: (state: SaveState) => void;
};

export function useAutosave<T>({ partnerId, debounceMs = 1500, onSaved, onStateChange }: Options<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (patch: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        onStateChange('saving');
        try {
          const res = await fetch(`/api/admin/partners/${partnerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });

          if (!res.ok) throw new Error(await res.text());

          const updated = await res.json();
          onSaved(updated as T);
          onStateChange('saved');

          // Clear the "Saved" indicator after 2s
          setTimeout(() => onStateChange('idle'), 2000);
        } catch {
          onStateChange('error');
        }
      }, debounceMs);
    },
    [partnerId, debounceMs, onSaved, onStateChange]
  );

  return { save };
}
