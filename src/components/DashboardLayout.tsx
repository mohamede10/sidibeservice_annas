'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoadingSession } = useAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoadingSession) {
      if (!user && !isLoginPage) {
        router.replace('/login');
      } else if (user && isLoginPage) {
        router.replace('/');
      }
    }
  }, [user, isLoadingSession, isLoginPage, router]);

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#090d16] text-slate-100">{children}</div>;
  }

  // Pendant la vérification de la session ou redirection
  if (isLoadingSession || !user) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl border-2 border-amber-400 border-t-transparent animate-spin flex items-center justify-center bg-slate-900/80 shadow-xl" />
        </div>
        <p className="text-sm font-semibold text-amber-400 tracking-wide">SIDIBE SERVICES</p>
        <p className="text-xs text-slate-500 mt-1">Vérification de l&apos;authentification...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

