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
  Store,
  ShieldCheck,
  Lock,
  Filter,
  Layers,
  Boxes,
  Banknote,
  ArrowLeftRight,
  Truck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface BoutiqueItem {
  id: number;
  nom: string;
  codeBoutique: string;
  ville: string;
}

interface BoutiqueBreakdown {
  pointVenteId: number;
  nom: string;
  codeBoutique: string;
  ville: string;
  active: boolean;
  chiffreAffaires: number;
  montantEncaisse: number;
  totalDettes: number;
  nombreVentes: number;
  montantTotalStock: number;
  quantiteTotalStock: number;
  referencesEnStock: number;
}

export default function DashboardPage() {
  const { user, isAdmin, isVendeur, activePointVenteId, activePointVenteNom, setActivePointVente } = useAuth();

  const [data, setData] = useState<{
    isFiltered?: boolean;
    pointDeVente?: { id: number; nom: string; codeBoutique: string; ville: string };
    stats: {
      totalProduits: number;
      totalClients: number;
      totalVentes: number;
      chiffreAffaires: number;
      montantEncaisse: number;
      totalDettes: number;
      montantTotalStock: number;
      totalStockArticles: number;
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
      pointVente?: { nom: string };
      pointVenteNom?: string;
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
    boutiquesBreakdown?: BoutiqueBreakdown[];
  } | null>(null);

  const [boutiquesList, setBoutiquesList] = useState<BoutiqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger la liste des boutiques pour le filtre Admin
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/points-de-vente')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.pointsDeVente) {
            setBoutiquesList(
              json.pointsDeVente.map((p: any) => ({
                id: p.id,
                nom: p.nom,
                codeBoutique: p.codeBoutique,
                ville: p.ville,
              }))
            );
          }
        })
        .catch(console.error);
    }
  }, [isAdmin]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      let url = '/api/dashboard';

      // Si l'utilisateur est un vendeur, forcer le filtrage sur sa boutique
      if (isVendeur && user?.pointVenteId) {
        url += `?pointVenteId=${user.pointVenteId}`;
      } else if (isAdmin && activePointVenteId) {
        url += `?pointVenteId=${activePointVenteId}`;
      }

      const res = await fetch(url);
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
  }, [activePointVenteId, isVendeur, user?.pointVenteId]);

  const handleBoutiqueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setActivePointVente(null, 'Vue Consolidée (Toutes les Villes)');
    } else {
      const pvId = parseInt(val);
      const target = boutiquesList.find((b) => b.id === pvId);
      setActivePointVente(pvId, target?.nom || `Boutique #${pvId}`);
    }
  };

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
              {isAdmin ? 'Tableau de bord exécutif • Vue Multi-Boutiques' : 'Espace de Vente & Gestion'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bienvenue sur <span className="text-gold-gradient">SIDIBE SERVICES</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {isAdmin
                ? 'Supervision globale de toutes les boutiques de Guinée : chiffre d\'affaires, valeur des stocks en magasin, factures et créances clients.'
                : `Gestion exclusive de votre boutique (${user?.pointVenteNom || 'Boutique Principale'}) : ventes, caisse POS, valeur du stock et créances.`}
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
            <Link href="/virements">
              <button className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-sm font-bold flex items-center gap-2 transition-all">
                <Banknote className="w-4 h-4" />
                <span>Caisse Virement</span>
              </button>
            </Link>
            <Link href="/transferts">
              <button className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white text-sm font-bold flex items-center gap-2 transition-all">
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">Transferts</span>
              </button>
            </Link>
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

        {/* Sélecteur de boutique pour l'Admin OR Badge d'affectation pour le Vendeur */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {isAdmin ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Store className="w-4 h-4" />
                <span>Périmètre des Chiffres :</span>
              </div>
              <div className="relative">
                <select
                  value={activePointVenteId || ''}
                  onChange={handleBoutiqueChange}
                  className="px-4 py-2 pr-10 rounded-xl bg-slate-950 border border-amber-500/40 text-sm font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-lg"
                >
                  <option value="">🌟 Toutes les Boutiques (Vue Globale Consolidée)</option>
                  {boutiquesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏬 {b.nom} ({b.ville} - {b.codeBoutique})
                    </option>
                  ))}
                </select>
              </div>
              {activePointVenteId && (
                <button
                  onClick={() => setActivePointVente(null, 'Vue Consolidée (Toutes les Villes)')}
                  className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
                >
                  Revenir à la vue consolidée
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Boutique Affectée :</span>
                <strong className="text-amber-400 font-bold">{user?.pointVenteNom || 'Ma Boutique'}</strong>
              </div>
              <span className="text-[11px] text-slate-400">
                (Vos chiffres d&apos;affaires, stocks, factures et créances sont cloisonnés à votre magasin)
              </span>
            </div>
          )}

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Données en temps réel</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Grid — 5 CARDS AVEC VALEUR DU STOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sales */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isAdmin && !activePointVenteId ? 'CA Global' : 'Chiffre d\'Affaires'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white">
              {loading ? '...' : formatCurrency(data?.stats.chiffreAffaires)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{data?.stats.totalVentes || 0} ventes</span>
            </div>
          </div>
        </motion.div>

        {/* Total Collected */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Encaissé</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {loading ? '...' : formatCurrency(data?.stats.montantEncaisse)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Trésorerie cash</div>
          </div>
        </motion.div>

        {/* Total Debts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isAdmin && !activePointVenteId ? 'Créances Générales' : 'Créances Boutique'}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              {loading ? '...' : formatCurrency(data?.stats.totalDettes)}
            </div>
            <Link href="/dettes" className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline">
              <span>Recouvrement</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* VALEUR TOTALE DU STOCK — CARD 4 SPÉCIALE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              {isAdmin && !activePointVenteId ? 'Valeur Stock Global' : 'Valeur Stock Boutique'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {loading ? '...' : formatCurrency(data?.stats.montantTotalStock)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-300">
              <Package className="w-3 h-3 text-emerald-400" />
              <span><strong>{data?.stats.totalStockArticles || 0}</strong> unités en réserve</span>
            </div>
          </div>
        </motion.div>

        {/* Catalog / Products */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Produits</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{data?.stats.totalProduits || 0}</div>
              <div className="text-[11px] text-slate-400">Réf. actives</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-amber-400">{data?.stats.totalClients || 0}</div>
              <div className="text-[11px] text-slate-400">Clients</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* =========================================================================
          POUR L'ADMIN UNIQUEMENT : VUE DÉTAILLÉE PAR BOUTIQUE (CA, DETTES ET STOCK)
      ========================================================================= */}
      {isAdmin && !activePointVenteId && data?.boutiquesBreakdown && data.boutiquesBreakdown.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Chiffre d&apos;Affaires, Créances & Stock par Boutique (Guinée)
            </h2>
            <Link href="/points-de-vente" className="text-xs text-amber-400 hover:underline">
              Gérer les Boutiques
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {data.boutiquesBreakdown.map((b) => (
              <div
                key={b.pointVenteId}
                onClick={() => setActivePointVente(b.pointVenteId, b.nom)}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all hover:scale-[1.01] shadow-xl group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-xs">
                      {b.codeBoutique || 'PDV'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        {b.nom}
                      </h3>
                      <p className="text-[11px] text-slate-400">{b.ville}, Guinée</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${b.active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                      {b.active ? 'Active' : 'En Pause'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>

                {/* Stock Highlight Box */}
                <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                        Montant Total en Stock
                      </span>
                      <span className="text-sm font-black text-emerald-400">
                        {formatCurrency(b.montantTotalStock)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Unités en Réserve</span>
                    <span className="text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                      {b.quantiteTotalStock} articles
                    </span>
                  </div>
                </div>

                {/* Ventes & Dettes */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chiffre d&apos;Affaires</span>
                    <span className="font-black text-white text-sm">{formatCurrency(b.chiffreAffaires)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Dettes Restantes</span>
                    <span className="font-black text-rose-400 text-sm">{formatCurrency(b.totalDettes)}</span>
                  </div>
                  <div className="col-span-2 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{b.nombreVentes} ventes enregistrées</span>
                    <span className="text-emerald-400 font-semibold">Encaissé : {formatCurrency(b.montantEncaisse)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Recent Sales & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Sales Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              {isAdmin && !activePointVenteId ? 'Dernières Ventes Globales' : 'Dernières Ventes de la Boutique'}
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
                    {isAdmin && !activePointVenteId && <th className="px-5 py-3.5">Boutique</th>}
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Montant</th>
                    <th className="px-5 py-3.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        Chargement des ventes...
                      </td>
                    </tr>
                  ) : data?.recentVentes?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        Aucune vente récente enregistrée pour cette boutique.
                      </td>
                    </tr>
                  ) : (
                    data?.recentVentes?.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-white">{v.reference}</td>
                        <td className="px-5 py-3.5 text-slate-300">{v.nomClient || 'Client Comptant'}</td>
                        {isAdmin && !activePointVenteId && (
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {v.pointVente?.nom || v.pointVenteNom || 'Boutique'}
                          </td>
                        )}
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
                {isAdmin && !activePointVenteId ? 'Clients Débiteurs (Global)' : 'Créances Boutique'}
              </h3>
              <Link href="/dettes" className="text-xs text-amber-400 hover:underline">
                Voir tout
              </Link>
            </div>

            <div className="space-y-2.5">
              {data?.clientsDebiteurs?.length === 0 ? (
                <p className="text-xs text-slate-500">Aucune dette client en cours pour cette sélection.</p>
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
