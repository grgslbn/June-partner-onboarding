'use client';

import { useState } from 'react';

export function CopyToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const preview = token.length > 8 ? `${token.slice(0, 6)}…` : token;

  return (
    <button
      onClick={handleClick}
      title={`Click to copy: ${token}`}
      className="font-mono text-xs text-gray-500 hover:text-gray-900 transition-colors"
    >
      {copied ? <span className="text-green-600">Copied!</span> : preview}
    </button>
  );
}
