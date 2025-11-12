'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { useOrganization } from '../../../../hooks/useOrganization';
import { useSubscription } from '../../../../hooks/useSubscription';
import { cn } from '../../../../lib/utils';
import { UserIcon, LinkIcon, Users2Icon, CreditCardIcon } from 'lucide-react';

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { subscription } = useSubscription();
  const tier = subscription?.tier || 'creator';

  const navItems = [
    {
      name: 'Profile',
      href: '/dashboard/settings/profile',
      icon: UserIcon,
      current: pathname === '/dashboard/settings/profile',
      available: true, // Available for all tiers
    },
    {
      name: 'Connections',
      href: '/dashboard/settings/connections',
      icon: LinkIcon,
      current: pathname === '/dashboard/settings/connections',
      available: true, // Available for all tiers
    },
    {
      name: 'Team',
      href: '/dashboard/settings/team',
      icon: Users2Icon,
      current: pathname === '/dashboard/settings/team',
      available: true, // Team page available for all tiers, but with limited functionality
    },
    {
      name: 'Billing',
      href: '/dashboard/settings/billing',
      icon: CreditCardIcon,
      current: pathname === '/dashboard/settings/billing',
      available: true, // Available for all tiers
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
  )
} 