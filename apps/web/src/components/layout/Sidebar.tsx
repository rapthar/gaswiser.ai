'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  HiOutlineSquares2X2, HiOutlineArrowTrendingUp, HiOutlineArrowRightOnRectangle,
  HiOutlineChevronRight, HiOutlineUserCircle, HiOutlineMapPin,
} from 'react-icons/hi2';
import { RiCarLine, RiRouteLine, RiGasStationLine } from 'react-icons/ri';
import { NotificationBell } from '@/components/features/NotificationBell';

const nav = [
  { label: 'Dashboard',    href: '/dashboard',           icon: HiOutlineSquares2X2 },
  { label: 'My Vehicle',   href: '/dashboard/vehicle',   icon: RiCarLine },
  { label: 'My Stations',  href: '/dashboard/stations',  icon: HiOutlineMapPin },
  { label: 'Routes',       href: '/dashboard/routes',    icon: RiRouteLine },
  { label: 'Fuel Plans',   href: '/dashboard/plans',     icon: RiGasStationLine },
  { label: 'Price Trends', href: '/dashboard/trends',    icon: HiOutlineArrowTrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
    staleTime: 60_000,
  });

  const avatarUrl = profileData?.profile?.avatar_url ?? null;
  const displayName = profileData?.profile?.username
    || profileData?.profile?.full_name
    || user?.email?.split('@')[0]
    || 'Account';

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="w-[220px] shrink-0 flex flex-col" style={{ background: 'hsl(222 47% 11%)' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-[60px] shrink-0 border-b border-white/10">
        <Image
          src="/Gas Wiser Logo.png"
          alt="Gas Wiser"
          width={130}
          height={36}
          className="object-contain object-left"
          priority
        />
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 pb-2">
          Navigation
        </p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#0060A9] text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/8',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <HiOutlineChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 shrink-0">
        <Link
          href="/dashboard/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
            pathname.startsWith('/dashboard/profile')
              ? 'bg-[#0060A9]'
              : 'hover:bg-white/8',
          )}
        >
          <div className="h-8 w-8 rounded-full bg-[#0060A9] flex items-center justify-center shrink-0 text-white text-xs font-bold overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              : initials
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.email ?? ''}</p>
          </div>
          <HiOutlineUserCircle className="h-4 w-4 text-white/30 shrink-0" />
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors mt-1"
        >
          <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
