import React from 'react';

export const Form: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <form>{children}</form>;
}; 