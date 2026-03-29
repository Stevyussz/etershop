"use client";

import { usePathname } from "next/navigation";
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { PromoBar } from '@/components/ui/PromoBar'
import { PopupOverlay } from '@/components/ui/PopupOverlay'
import { LiveSalesToast } from '@/components/ui/LiveSalesToast'

export default function ConditionalLayout({ 
  children,
  settings
}: { 
  children: React.ReactNode,
  settings: any
}) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith('/admin');

  if (isAdminArea) {
    // Return pure children for admin routes
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <PromoBar ramadhanMode={settings?.ramadhanMode} />
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
      <PopupOverlay 
        imageUrl={settings?.popupImageUrl} 
        link={settings?.popupLink}
        active={settings?.popupActive}
      />
      <LiveSalesToast active={settings?.showLiveSales} />
    </>
  );
}
