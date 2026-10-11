'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<{
    stats: {
      totalProduits: number;
      totalClients: number;
      totalVentes: number;
      chiffreAffaires: number;
      montantEncaisse: number;
      totalDettes: number;
    };
    recentVentes: Array<{
      id: number;
      reference: string;
      dateVente: string;
      nomClient?: string;
      total: number;
      montantPaye: number;
      statutPaiement: string;
      modePaiement: string;
    }>;
    lowStockVariantes: Array<{
      id: number;
      taille?: string;
      couleur?: string;
      quantiteStock: number;
      produit: {
        nom: string;
        ref?: string;
        categorieNom?: string;
      };
    }>;
    clientsDebiteurs: Array<{
      id: number;
      nom: string;
      telephone?: string;
      soldeDette: number;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-slate-900 border border-amber-500/20 backdrop-blur-xl shadow-2xl shadow-amber-500/5"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Tableau de bord exécutif
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bienvenue sur <span className="text-gold-gradient">SIDIBE SERVICES</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Système de gestion intégré : Point de vente (POS), suivi des stocks multi-boutiques, factures et créances clients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <Link href="/pos">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                Ouvrir la Caisse POS
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chiffre d&apos;Affaires</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">
              {loading ? '...' : formatCurrency(data?.stats.chiffreAffaires)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{data?.stats.totalVentes || 0} ventes enregistrées</span>
            </div>
          </div>
        </motion.div>

        {/* Total Collected */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Montant Encaissé</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-emerald-400">
              {loading ? '...' : formatCurrency(data?.stats.montantEncaisse)}
            </div>
            <div className="mt-1 text-xs text-slate-400">Trésorerie effective</div>
          </div>
        </motion.div>

        {/* Total Debts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Créances Clients</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-rose-400">
              {loading ? '...' : formatCurrency(data?.stats.totalDettes)}
            </div>
            <Link href="/dettes" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-400 hover:underline">
              <span>Recouvrement des dettes</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* Catalog / Products */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalogue & Tiers</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-white">{data?.stats.totalProduits || 0}</div>
              <div className="text-xs text-slate-400">Articles actifs</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-400">{data?.stats.totalClients || 0}</div>
              <div className="text-xs text-slate-400">Clients enregistrés</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Recent Sales & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Sales Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Dernières Ventes & Factures
            </h2>
            <Link href="/ventes" className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1">
              Voir tout l&apos;historique
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Réf. Vente</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Montant</th>
                    <th className="px-5 py-3.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        Chargement des ventes...
                      </td>
                    </tr>
                  ) : data?.recentVentes?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        Aucune vente récente enregistrée.
                      </td>
                    </tr>
                  ) : (
                    data?.recentVentes?.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-white">{v.reference}</td>
                        <td className="px-5 py-3.5 text-slate-300">{v.nomClient || 'Client Comptant'}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(v.dateVente)}</td>
                        <td className="px-5 py-3.5 font-bold text-amber-400">{formatCurrency(v.total)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              v.statutPaiement === 'PAYE'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : v.statutPaiement === 'PARTIEL'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {v.statutPaiement === 'PAYE' ? 'Payé' : v.statutPaiement === 'PARTIEL' ? 'Acompte' : 'À crédit'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Debtors */}
        <div className="space-y-6">
          {/* Low Stock Widget */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Alertes Stock Faible
              </h3>
              <Link href="/produits" className="text-xs text-amber-400 hover:underline">
                Gérer
              </Link>
            </div>

            <div className="space-y-2.5">
              {data?.lowStockVariantes?.length === 0 ? (
                <p className="text-xs text-slate-500">Tous les stocks sont à un niveau optimal.</p>
              ) : (
                data?.lowStockVariantes?.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{v.produit?.nom}</p>
                      <p className="text-[11px] text-slate-400">
                        {v.taille || 'Standard'} • {v.couleur || 'Classique'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        {v.quantiteStock} restant{v.quantiteStock > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Debtors Widget */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-400" />
                Clients avec Dettes
              </h3>
              <Link href="/dettes" className="text-xs text-amber-400 hover:underline">
                Voir tout
              </Link>
            </div>

            <div className="space-y-2.5">
              {data?.clientsDebiteurs?.length === 0 ? (
                <p className="text-xs text-slate-500">Aucune dette client en cours.</p>
              ) : (
                data?.clientsDebiteurs?.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{c.nom}</p>
                      <p className="text-[11px] text-slate-400">{c.telephone || 'Sans tél'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-rose-400">{formatCurrency(c.soldeDette)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
