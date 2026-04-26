'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { HiOutlineArrowRightOnRectangle, HiOutlineUser } from 'react-icons/hi2';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold">{title}</h1>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <HiOutlineUser className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="max-w-[140px] truncate">{user?.email ?? 'Account'}</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-md p-1 text-sm"
          >
            <DropdownMenu.Item
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-destructive hover:bg-destructive/10 focus:outline-none"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
