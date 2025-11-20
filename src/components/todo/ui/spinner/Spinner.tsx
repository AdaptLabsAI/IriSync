// Spinner component for Todo
import * as React from 'react';

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className || 'h-4 w-4'}`}>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
