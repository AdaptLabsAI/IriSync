'use client';

import React from 'react';

/**
 * A simple span wrapper component to fix MUI Tooltip warnings
 * when using disabled buttons as tooltip triggers
 */
const ButtonWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <span className={className}>
      {children}
    </span>
  );
};

export default ButtonWrapper; 