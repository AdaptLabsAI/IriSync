import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  return <aside>{children}</aside>;
}; 