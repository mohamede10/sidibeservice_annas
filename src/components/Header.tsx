'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  ShoppingCart,
  Bell,
  Search,
  Store,
  LogOut,
  ChevronDown,
  Clock,
  AlertTriangle,
  ArrowLeftRight,
  Truck,
  Banknote,
  ShoppingBag,
  ExternalLink,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { InstallAppButton } from '@/components/PWAInstallPrompt';

interface HeaderProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  destinataire: string;
  titre: string;
  message: string;
  dateEnvoi: string;
  statut: string;
  boutiqueNom?: string;
  reference?: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, activePointVenteNom, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'COMMANDE_CLIENT':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'STOCK_FAIBLE':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'TRANSFERT_STOCK':
        return <ArrowLeftRight className="w-4 h-4 text-purple-400" />;
      case 'ACHAT_FOURNISSEUR':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'VIREMENT_CAISSE':
        return <Banknote className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
      {/* Left section: Toggle + Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un produit, client ou facture..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Active Point de Vente */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Store className="w-3.5 h-3.5 text-amber-400" />
          <span className="max-w-[180px] truncate">
            {isAdmin ? (activePointVenteNom || 'Vue Globale') : (user?.pointVenteNom || 'Boutique')}
          </span>
        </div>

        {/* Quick New Sale */}
        <Link href="/pos">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle Vente (POS)</span>
            <span className="sm:hidden">Caisse</span>
          </motion.button>
        </Link>

        {/* PWA Install Button */}
        <InstallAppButton variant="header" />

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications et alertes SMS Admin"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
              </>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden z-50 text-left"
              >
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Alertes & SMS Admin</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {notifications.length} message{notifications.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Aucune alerte récente.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-800/40 transition-colors text-xs space-y-1">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 mt-0.5">
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold text-white truncate text-[11px]">{n.titre}</p>
                              <span className="text-[9px] text-slate-500 whitespace-nowrap">
                                {new Date(n.dateEnvoi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-300 whitespace-pre-line text-[11px] leading-relaxed line-clamp-3">
                              {n.message}
                            </p>
                            {n.boutiqueNom && (
                              <p className="text-[10px] text-amber-400/90 font-medium mt-1">
                                🏬 {n.boutiqueNom}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 bg-slate-950/70 text-center">
                  <Link
                    href="/commandes"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Voir les commandes en attente</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle (Dark / Light) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Paramètres Link */}
        <Link
          href="/parametres"
          title="Paramètres de l'application"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User menu / logout */}
        <button
          onClick={logout}
          title="Déconnexion"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
