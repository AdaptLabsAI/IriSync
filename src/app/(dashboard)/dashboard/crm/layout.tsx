'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { cn } from '../../../../lib/utils';
import { HomeIcon, UsersIcon, Building2Icon, LineChartIcon, BarChart3Icon } from 'lucide-react';

interface CRMLayoutProps {
  children: ReactNode;
}

export default function CRMLayout({ children }: CRMLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard/crm',
      icon: HomeIcon,
      current: pathname === '/dashboard/crm',
      available: true,
    },
    {
      name: 'Contacts',
      href: '/dashboard/crm/contacts',
      icon: UsersIcon,
      current: pathname === '/dashboard/crm/contacts',
      available: true,
    },
    {
      name: 'Companies',
      href: '/dashboard/crm/companies',
      icon: Building2Icon,
      current: pathname === '/dashboard/crm/companies',
      available: true,
    },
    {
      name: 'Deals',
      href: '/dashboard/crm/deals',
      icon: BarChart3Icon,
      current: pathname === '/dashboard/crm/deals',
      available: true,
    },
    {
      name: 'Analytics',
      href: '/dashboard/crm/analytics',
      icon: LineChartIcon,
      current: pathname === '/dashboard/crm/analytics',
      available: true,
    },
  ];

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-64 flex-shrink-0">
          <Card>
            <div className="p-2">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      item.current
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      !item.available && 'opacity-50 pointer-events-none'
                    )}
                    aria-disabled={!item.available}
                  >
                    <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </Card>
        </aside>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
} 