/**
 * @file src/app/admin/layout.tsx
 * @description Client-side Admin layout with sidebar navigation and topbar.
 *
 * Features:
 * - Sidebar navigation with active-link highlighting
 * - Functional logout button (calls /api/admin/auth DELETE)
 * - Responsive: hidden on mobile with a hamburger menu toggle
 * - "View Live Store" link that opens the storefront in a new tab
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Gamepad2,
  Receipt,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Settings,
  Ticket,
  TrendingUp,
} from "lucide-react";

const NAV_LINKS = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Transaksi", href: "/admin/transactions", icon: Receipt },
  { name: "Branding Game", href: "/admin/games", icon: Gamepad2 },
  { name: "Daftar Produk", href: "/admin/products", icon: Settings },
  { name: "Voucher Promo", href: "/admin/vouchers", icon: Ticket },
  { name: "Manager Harga", href: "/admin/settings/prices", icon: TrendingUp },
  { name: "Pengaturan Situs", href: "/admin/settings", icon: Settings },
];

function SidebarContent({
  pathname,
  onLogout,
  onClose,
}: {
  pathname: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            Eter<span className="text-blue-500">Shop</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Sistem Manajemen Pusat</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_LINKS.map((link) => {
          // Exact match for /admin, prefix match for sub-pages
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isActive
                  ? "bg-blue-600 text-white shadow-[0_5px_15px_rgba(37,99,235,0.4)] font-bold"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Buka Toko (Live)
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * Logs out the admin by deleting the session cookie via the auth API,
   * then redirects to the login page.
   */
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Even if the API call fails, redirect to login
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[#0a0f16] text-slate-200">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="w-64 bg-[#111823] border-r border-white/5 flex-col hidden lg:flex shrink-0">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#111823] border-r border-white/5 flex flex-col z-10">
            <SidebarContent
              pathname={pathname}
              onLogout={handleLogout}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main suppressHydrationWarning className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 bg-[#111823] flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — only visible on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-medium text-slate-400 hidden sm:block">
              Selamat datang,{" "}
              <span className="text-white font-bold">Admin</span>
            </span>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
            A
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0a0f16]">{children}</div>
      </main>
    </div>
  );
}
