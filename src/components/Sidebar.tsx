'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  CreditCard,
  Building2,
  Truck,
  BarChart3,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UserCog,
  ArrowLeftRight,
  Wallet,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navItems = [
  { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard, badge: null, section: 'main' },
  { href: '/pos', label: 'Caisse & Vente POS', icon: ShoppingCart, badge: 'Direct', section: 'main' },
  { href: '/produits', label: 'Catalogue & Stocks', icon: Package, badge: null, section: 'main' },
  { href: '/ventes', label: 'Historique Factures', icon: Receipt, badge: null, section: 'main' },
  { href: '/dettes', label: 'Dettes & Crédits', icon: CreditCard, badge: 'Suivi', section: 'main' },
  { href: '/clients', label: 'Clients & Tiers', icon: Users, badge: null, section: 'main' },
  { href: '/achats', label: 'Achats Fournisseurs', icon: Truck, badge: null, section: 'main' },
  { href: '/depenses', label: 'Dépenses & Charges', icon: TrendingDown, badge: null, section: 'main' },
];

const adminNavItems = [
  { href: '/points-de-vente', label: 'Boutiques & Dépôts', icon: Building2, badge: null, section: 'admin' },
  { href: '/utilisateurs', label: 'Utilisateurs & Rôles', icon: UserCog, badge: null, section: 'admin' },
  { href: '/rapports', label: 'Rapports & Finances', icon: BarChart3, badge: null, section: 'admin' },
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, isGerant, activePointVenteNom } = useAuth();

  const displayName = user?.nom?.split(' ')[0] || 'Admin';
  const displayInitial = displayName[0]?.toUpperCase() || 'A';
  const roleLabel = user?.role === 'ADMIN' ? 'Admin Global' : user?.role === 'GERANT' ? 'Gérant' : 'Vendeur';

  const renderNavItem = (item: (typeof navItems)[0]) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
      <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isActive
              ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/5'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg ${
                isActive ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span>{item.label}</span>
          </div>

          {item.badge && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {item.badge}
            </span>
          )}

          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-amber-400"
            />
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all border border-amber-400/30">
              <img
                src="/img/logo.jpg"
                alt="Logo SIDIBE SERVICE"
                className="w-full h-full object-cover"
              />
            </div>  
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white group-hover:text-amber-400 transition-colors leading-tight">
                  SIDIBE SERVICES
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Active Point de Vente */}
        <div className="px-5 py-2.5 bg-slate-900/50 border-b border-slate-800/40">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isAdmin ? 'Vue consolidée globale' : 'Boutique affectée :'}
            </span>
            <span className="font-semibold text-amber-400 text-[11px] truncate max-w-[130px]">
              {isAdmin ? activePointVenteNom || 'Toutes boutiques' : (user?.pointVenteNom || 'Non affecté')}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          {navItems.map(renderNavItem)}

          {/* Admin Section Divider */}
          {(isAdmin || isGerant) && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">
                  Administration
                </p>
              </div>
              {adminNavItems.map(renderNavItem)}
            </>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm">
              {displayInitial}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.nom || 'Utilisateur'}</p>
              <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {roleLabel}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
