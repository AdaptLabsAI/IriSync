import React from 'react';

interface ErrorFallbackProps {
  error: Error | null;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => (
  <div style={{ padding: 32, textAlign: 'center', color: '#b91c1c', background: '#fef2f2' }}>
    <h2>Something went wrong</h2>
    <p>We're sorry, but an unexpected error occurred.</p>
    {error && <pre style={{ color: '#991b1b', marginTop: 16 }}>{error.message}</pre>}
    <p style={{ marginTop: 24 }}>
      Please try refreshing the page or contact support if the problem persists.
    </p>
  </div>
); 