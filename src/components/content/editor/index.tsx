// Content Editor Component
import * as React from 'react';

export interface EditorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Editor({ value, onChange, className }: EditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className || ''}`}
      placeholder="Start writing..."
    />
  );
}

export default Editor;
