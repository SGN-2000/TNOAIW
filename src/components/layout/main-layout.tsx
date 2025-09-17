"use client";

import { useAuth } from '@/hooks/use-auth';
import { redirect, usePathname } from 'next/navigation';
import Loader from '@/components/loader';
import Header from './header';
import Footer from './footer';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, LifeBuoy, Newspaper } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';


const BottomNavItem = ({ href, currentPath, icon: Icon, label, hasNotification }: { href: string; currentPath: string; icon: React.ElementType; label: string, hasNotification?: boolean }) => (
  <Link href={href} className="flex-1 relative">
    <div
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-md transition-colors text-muted-foreground",
        currentPath === href && "text-primary"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs mt-1">{label}</span>
    </div>
    {hasNotification && (
        <span className="absolute top-1 right-3 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
    )}
  </Link>
);


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
    </div>
  );
}
