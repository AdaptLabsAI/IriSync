import React from 'react';
// import { Header } from './Header';
import { cn } from '@/lib/core/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  headerTransparent?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  className,
  headerTransparent = false 
}) => {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* <Header transparent={headerTransparent} /> */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}; 