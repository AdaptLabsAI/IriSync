import React from 'react';
import { cn } from '@/lib/core/utils';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption';
  children: React.ReactNode;
  className?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'muted';
  align?: 'left' | 'center' | 'right';
  as?: keyof JSX.IntrinsicElements;
}

export const Typography: React.FC<TypographyProps> = ({ 
  variant = 'body', 
  children, 
  className,
  color = 'primary',
  align = 'left',
  as
}) => {
  const variantStyles = {
    h1: 'text-6xl lg:text-8xl font-normal leading-tight',
    h2: 'text-4xl lg:text-6xl font-medium leading-tight',
    h3: 'text-2xl lg:text-4xl font-medium leading-tight',
    h4: 'text-xl lg:text-2xl font-medium leading-snug',
    h5: 'text-lg lg:text-xl font-medium leading-snug',
    h6: 'text-base lg:text-lg font-medium leading-snug',
    body: 'text-base lg:text-lg font-normal leading-relaxed',
    caption: 'text-sm font-normal leading-normal'
  };

  const colorStyles = {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    accent: 'text-green-500',
    muted: 'text-gray-500'
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const defaultElements = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    body: 'p',
    caption: 'p'
  };

  const Component = as || defaultElements[variant] || 'p';

  return React.createElement(Component as any, {
    className: cn(
      'font-inter',
      variantStyles[variant],
      colorStyles[color],
      alignStyles[align],
      className
    )
  }, children);
}; 