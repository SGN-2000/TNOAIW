"use client"
import { notFound, usePathname, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, get, child } from 'firebase/database';
import CenterHeader from '@/components/layout/center-header';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';
import { Home, Zap, Share2, Bell, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface CenterLayoutProps {
  children: React.ReactNode;
  params: { centerId: string };
}

interface CenterData {
  centerName: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}

function hexToHsl(hex: string): string {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}

const BottomNavItem = ({ href, currentPath, icon: Icon, label, hasNotification }: { href: string; currentPath: string; icon: React.ElementType; label: string, hasNotification?: boolean }) => (
  <Link href={href} className="flex-1 relative">
    <div
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-md transition-colors",
        currentPath === href ? "bg-secondary/70 text-secondary-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="sr-only">{label}</span>
    </div>
    {hasNotification && (
        <span className="absolute top-1 right-3 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
    )}
  </Link>
);


export default function CenterLayout({ children, params }: CenterLayoutProps) {
  const [centerData, setCenterData] = useState<CenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const { hasUnreadNotifications } = useAuth();
  const pathname = usePathname();
  const routeParams = useParams();
  const centerId = Array.isArray(routeParams.centerId) ? routeParams.centerId[0] : routeParams.centerId;
  
  useEffect(() => {
    async function getCenterData(id: string) {
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `centers/${id}`));
            if (snapshot.exists()) {
                setCenterData(snapshot.val());
            } else {
                notFound();
            }
        } catch (error) {
            console.error("Error fetching center data:", error);
            notFound();
        } finally {
            setLoading(false);
        }
    }
    if (centerId) {
      getCenterData(centerId);
    }
  }, [centerId]);


  const bottomNavItems = [
    { href: `/center/${centerId}`, label: "Página principal", icon: Home },
    { href: `/center/${centerId}/functionalities`, label: "Funcionalidades", icon: Zap },
    { href: `/center/${centerId}/invite`, label: "Invitar", icon: Share2 },
    { href: `/center/${centerId}/notifications`, label: "Notificaciones", icon: Bell, hasNotification: hasUnreadNotifications },
    { href: `/`, label: "Salir", icon: LogOut },
  ];

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  }
  
  if (!centerData) {
    return notFound();
  }

  const primaryHsl = hexToHsl(centerData.primaryColor);
  const secondaryHsl = hexToHsl(centerData.secondaryColor);
  const tertiaryHsl = hexToHsl(centerData.tertiaryColor);

  return (
    <>
      <style jsx global>{`
        .center-theme {
          --center-primary: ${primaryHsl};
          --center-secondary: ${secondaryHsl};
          --center-accent: ${tertiaryHsl};
          --background: 240 100% 100%; /* White background */
        }
        
        .center-theme .bg-background {
            background-color: hsl(var(--background));
        }

        .center-theme .bg-primary {
            background-color: hsl(var(--primary));
        }
        
        .center-theme .text-primary-foreground {
            color: white; /* Assuming primary colors will be dark enough for white text */
        }

        .center-theme [data-sidebar] {
            background-color: hsl(var(--secondary)) !important;
        }

        .center-theme .text-primary {
          color: hsl(var(--primary));
        }

        .center-theme .bg-primary\\/20 {
           background-color: hsl(var(--primary) / 0.2);
        }
        
        .center-theme .bg-primary\\/5 {
           background-color: hsl(var(--primary) / 0.05);
        }
        
        .center-theme .bg-secondary\\/70 {
           background-color: hsl(var(--secondary) / 0.7);
        }
        
        .center-theme [data-header] {
          border-color: hsl(var(--center-secondary));
        }
      `}</style>
      <div className="relative flex min-h-screen flex-col bg-background center-theme">
        <CenterHeader centerName={centerData.centerName} />
        <main className="flex-1 pb-20">{children}</main>
        {/* Bottom Navigation */}
        <nav 
            className="fixed bottom-0 left-0 right-0 z-50 bg-background flex justify-around p-1 border-t-2"
            style={{ borderColor: `hsl(var(--center-secondary))` }}
        >
          {bottomNavItems.map((item) => (
              <BottomNavItem 
                  key={item.label}
                  href={item.label === 'Salir' ? '/' : item.href}
                  currentPath={pathname}
                  icon={item.icon}
                  label={item.label}
                  hasNotification={item.hasNotification}
              />
          ))}
        </nav>
      </div>
      <Toaster />
    </>
  );
}
