'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Receipt,
  PieChart,
  Target,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

type Period = 'day' | 'week' | 'month' | 'year';

interface KPIs {
  chiffreAffaires: number;
  encaisse: number;
  creances: number;
  totalDepenses: number;
  beneficeNet: number;
  nombreVentes: number;
  panierMoyen: number;
  nouveauxClients: number;
  nombreDepenses: number;
}

interface VenteParMode {
  modePaiement: string;
  _sum: { total: number | null; montantPaye: number | null };
  _count: { _all: number };
}

interface DepenseParCategorie {
  categorie: string;
  _sum: { montant: number | null };
  _count: { _all: number };
}

interface TopProduit {
  nomProduit: string;
  _sum: { quantite: number | null; totalLigne: number | null };
}

interface VentePDV {
  pointVenteId: number;
  pointVenteNom: string | null;
  _sum: { total: number | null; montantPaye: number | null };
  _count: { _all: number };
}

interface EvolutionItem {
  label: string;
  chiffreAffaires: number;
  encaisse: number;
  depenses: number;
}

interface RapportData {
  period: string;
  dateDebut: string;
  dateFin: string;
  kpis: KPIs;
  ventesParMode: VenteParMode[];
  depensesParCategorie: DepenseParCategorie[];
  topProduits: TopProduit[];
  ventesParPDV: VentePDV[];
  evolutionData: EvolutionItem[];
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: 'Cette Semaine',
  month: 'Ce Mois',
  year: 'Cette Année',
};

const MODE_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  ESPECES: { icon: Banknote, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Espèces' },
  WAVE: { icon: Smartphone, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Wave' },
  ORANGE_MONEY: { icon: Smartphone, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Orange Money' },
  CARTE: { icon: CreditCard, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Carte Bancaire' },
  CREDIT: { icon: Receipt, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Crédit Client' },
};

const DEPENSE_COLORS: Record<string, string> = {
  LOYER: 'bg-blue-500',
  ELECTRICITE: 'bg-yellow-500',
  TRANSPORT: 'bg-indigo-500',
  SALAIRE: 'bg-green-500',
  DIVERS: 'bg-slate-500',
};

// Simple bar chart component (no external lib needed)
function MiniBarChart({ data, maxHeight = 80 }: { data: EvolutionItem[]; maxHeight?: number }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.chiffreAffaires), 1);

  return (
    <div className="flex items-end gap-1 h-full" style={{ height: maxHeight }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <p className="font-semibold">{item.label}</p>
            <p className="text-amber-400">CA: {formatCurrency(item.chiffreAffaires)}</p>
            <p className="text-emerald-400">Enc: {formatCurrency(item.encaisse)}</p>
            <p className="text-rose-400">Dep: {formatCurrency(item.depenses)}</p>
          </div>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.chiffreAffaires / maxVal) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
            className="w-full rounded-t-sm bg-gradient-to-t from-amber-600 to-amber-400 min-h-[2px]"
          />
          <span className="text-[8px] text-slate-500 truncate w-full text-center">{item.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

// Donut/pie chart component
function DonutChart({ segments, size = 80 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="text-slate-500 text-xs text-center">Aucune donnée</div>;

  let cumulative = 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316'];

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" style={{ width: size, height: size }}>
      {segments.map((seg, i) => {
        const fraction = seg.value / total;
        const dashArray = `${fraction * circumference} ${circumference}`;
        const rotation = (cumulative / total) * 360 - 90;
        cumulative += seg.value;
        return (
          <circle
            key={i}
            cx="40" cy="40" r={radius}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth="12"
            strokeDasharray={dashArray}
            strokeDashoffset="0"
            transform={`rotate(${rotation}, 40, 40)`}
            className="transition-all duration-500"
          />
        );
      })}
      <circle cx="40" cy="40" r="24" fill="#0f172a" />
    </svg>
  );
}

export default function RapportsPage() {
  const { user, activePointVenteId } = useAuth();
  const { showError } = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<RapportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ventes' | 'depenses' | 'produits' | 'boutiques'>('overview');

  const fetchRapport = useCallback(async () => {
    setLoading(true);
    try {
      const pvParam = activePointVenteId ? `&pointVenteId=${activePointVenteId}` : '';
      const res = await fetch(`/api/rapports?period=${period}${pvParam}`);
      const json = await res.json();
      if (json.success) setData(json);
      else showError(json.error || 'Impossible de charger le rapport.', 'Erreur rapports');
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors du chargement du rapport.', 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [period, activePointVenteId, showError]);

  useEffect(() => {
    fetchRapport();
  }, [fetchRapport]);

  const kpis = data?.kpis;

  const kpiCards = [
    {
      label: "Chiffre d'Affaires",
      value: formatCurrency(kpis?.chiffreAffaires),
      icon: TrendingUp,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
      textColor: 'text-amber-400',
    },
    {
      label: 'Encaissements',
      value: formatCurrency(kpis?.encaisse),
      icon: Wallet,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Bénéfice Net',
      value: formatCurrency(kpis?.beneficeNet),
      icon: kpis && kpis.beneficeNet >= 0 ? ArrowUpRight : ArrowDownRight,
      color: kpis && kpis.beneficeNet >= 0
        ? 'from-green-500/20 to-green-600/5 border-green-500/30 text-green-400'
        : 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
      textColor: kpis && kpis.beneficeNet >= 0 ? 'text-green-400' : 'text-rose-400',
    },
    {
      label: 'Créances',
      value: formatCurrency(kpis?.creances),
      icon: Receipt,
      color: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
      textColor: 'text-rose-400',
    },
    {
      label: 'Total Dépenses',
      value: formatCurrency(kpis?.totalDepenses),
      icon: TrendingDown,
      color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
      textColor: 'text-purple-400',
    },
    {
      label: 'Nb. Ventes',
      value: String(kpis?.nombreVentes ?? 0),
      icon: ShoppingCart,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
      textColor: 'text-blue-400',
    },
    {
      label: 'Panier Moyen',
      value: formatCurrency(kpis?.panierMoyen),
      icon: Target,
      color: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400',
      textColor: 'text-indigo-400',
    },
    {
      label: 'Nvx Clients',
      value: String(kpis?.nouveauxClients ?? 0),
      icon: Users,
      color: 'from-teal-500/20 to-teal-600/5 border-teal-500/30 text-teal-400',
      textColor: 'text-teal-400',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Vue Globale', icon: BarChart3 },
    { id: 'ventes', label: 'Ventes', icon: ShoppingCart },
    { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
    { id: 'produits', label: 'Produits', icon: Package },
    { id: 'boutiques', label: 'Boutiques', icon: Building2 },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 no-print">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BarChart3 className="w-6 h-6" />
            </span>
            Rapports Financiers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyse des performances — {PERIOD_LABELS[period]}
            {data && (
              <span className="ml-2 text-slate-500 text-xs">
                ({new Date(data.dateDebut).toLocaleDateString('fr-FR')} — {new Date(data.dateFin).toLocaleDateString('fr-FR')})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchRapport}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800 w-fit">
        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              period === key
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass-card p-4 rounded-2xl border bg-gradient-to-br ${card.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.textColor}`} />
            </div>
            {loading ? (
              <div className="h-7 w-3/4 rounded bg-slate-800 animate-pulse" />
            ) : (
              <p className={`text-xl font-black ${card.textColor}`}>{card.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Evolution Chart */}
            {data?.evolutionData && data.evolutionData.length > 0 && (
              <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-1">Évolution du Chiffre d&apos;Affaires</h3>
                <p className="text-xs text-slate-400 mb-4">Chiffre d&apos;affaires journalier sur la période</p>
                <div className="h-32">
                  <MiniBarChart data={data.evolutionData} maxHeight={128} />
                </div>
              </div>
            )}

            {/* Modes de paiement */}
            <div className="glass-card rounded-3xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Modes de Paiement
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-800 animate-pulse" />)}
                </div>
              ) : data?.ventesParMode && data.ventesParMode.length > 0 ? (
                <div className="space-y-3">
                  {data.ventesParMode.map((m) => {
                    const info = MODE_ICONS[m.modePaiement] || { icon: DollarSign, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', label: m.modePaiement };
                    const total = data.kpis.chiffreAffaires || 1;
                    const pct = Math.round(((m._sum.total || 0) / total) * 100);
                    return (
                      <div key={m.modePaiement} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg border text-xs ${info.color}`}>
                              <info.icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-slate-300 font-medium">{info.label}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{formatCurrency(m._sum.total)}</p>
                            <p className="text-xs text-slate-400">{m._count._all} vente(s)</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">Aucune vente sur cette période</p>
              )}
            </div>

            {/* Résumé financier */}
            <div className="glass-card rounded-3xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-400" />
                Résumé Financier
              </h3>
              {loading ? (
                <div className="h-32 rounded-xl bg-slate-800 animate-pulse" />
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "CA Total", val: kpis?.chiffreAffaires || 0, color: 'text-amber-400', bar: 'bg-amber-400' },
                    { label: "Encaissé", val: kpis?.encaisse || 0, color: 'text-emerald-400', bar: 'bg-emerald-400' },
                    { label: "Créances", val: kpis?.creances || 0, color: 'text-rose-400', bar: 'bg-rose-400' },
                    { label: "Dépenses", val: kpis?.totalDepenses || 0, color: 'text-purple-400', bar: 'bg-purple-400' },
                    { label: "Bénéfice Net", val: kpis?.beneficeNet || 0, color: kpis && kpis.beneficeNet >= 0 ? 'text-green-400' : 'text-red-400', bar: kpis && kpis.beneficeNet >= 0 ? 'bg-green-400' : 'bg-red-400' },
                  ].map((row) => {
                    const max = kpis?.chiffreAffaires || 1;
                    const pct = Math.min(Math.abs(row.val) / max * 100, 100);
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <p className="text-xs text-slate-400 w-24 flex-shrink-0">{row.label}</p>
                        <div className="flex-1 h-2 rounded-full bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            className={`h-full rounded-full ${row.bar}`}
                          />
                        </div>
                        <p className={`text-sm font-bold ${row.color} w-28 text-right`}>{formatCurrency(row.val)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'ventes' && (
          <motion.div
            key="ventes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {/* Ventilation par mode */}
            <div className="glass-card rounded-3xl border border-slate-800 p-6 md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-4">Ventilation par Mode de Règlement</h3>
              {loading ? <div className="h-48 rounded-xl bg-slate-800 animate-pulse" /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(MODE_ICONS).map(([mode, info]) => {
                    const found = data?.ventesParMode.find((m) => m.modePaiement === mode);
                    return (
                      <div key={mode} className={`p-4 rounded-2xl border ${info.color} flex flex-col items-center gap-2 text-center`}>
                        <info.icon className="w-6 h-6" />
                        <p className="text-xs font-semibold">{info.label}</p>
                        <p className="text-lg font-black text-white">{formatCurrency(found?._sum.total)}</p>
                        <p className="text-xs text-slate-400">{found?._count._all || 0} vente(s)</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Evolution */}
            {data?.evolutionData && data.evolutionData.length > 0 && (
              <div className="glass-card rounded-3xl border border-slate-800 p-6 md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-1">Évolution des Ventes</h3>
                <p className="text-xs text-slate-400 mb-4">Survolez les barres pour le détail</p>
                <div className="h-40">
                  <MiniBarChart data={data.evolutionData} maxHeight={160} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'depenses' && (
          <motion.div
            key="depenses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <div className="glass-card rounded-3xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                Dépenses par Catégorie
              </h3>
              <p className="text-xs text-slate-400 mb-4">Total : {formatCurrency(kpis?.totalDepenses)} — {kpis?.nombreDepenses} dépense(s)</p>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-800 animate-pulse" />)}
                </div>
              ) : data?.depensesParCategorie && data.depensesParCategorie.length > 0 ? (
                <div className="space-y-3">
                  {data.depensesParCategorie.map((d) => {
                    const pct = Math.round(((d._sum.montant || 0) / (kpis?.totalDepenses || 1)) * 100);
                    return (
                      <div key={d.categorie} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">{d.categorie}</span>
                          <div className="text-right">
                            <p className="font-bold text-white">{formatCurrency(d._sum.montant)}</p>
                            <p className="text-xs text-slate-400">{d._count._all} opération(s) · {pct}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className={`h-full rounded-full ${DEPENSE_COLORS[d.categorie] || 'bg-slate-500'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">Aucune dépense sur cette période</p>
              )}
            </div>

            <div className="glass-card rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center gap-6">
              <h3 className="text-lg font-bold text-white">Répartition Dépenses</h3>
              {data?.depensesParCategorie && data.depensesParCategorie.length > 0 ? (
                <>
                  <DonutChart
                    size={140}
                    segments={data.depensesParCategorie.map((d) => ({
                      value: d._sum.montant || 0,
                      color: DEPENSE_COLORS[d.categorie] || '#64748b',
                      label: d.categorie,
                    }))}
                  />
                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.depensesParCategorie.map((d, i) => {
                      const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-orange-500'];
                      return (
                        <span key={d.categorie} className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                          {d.categorie}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm">Aucune dépense</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'produits' && (
          <motion.div
            key="produits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="glass-card rounded-3xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                Top 10 Produits Vendus
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-800 animate-pulse" />)}
                </div>
              ) : data?.topProduits && data.topProduits.length > 0 ? (
                <div className="space-y-3">
                  {data.topProduits.map((p, i) => {
                    const maxCA = data.topProduits[0]?._sum.totalLigne || 1;
                    const pct = Math.round(((p._sum.totalLigne || 0) / maxCA) * 100);
                    return (
                      <div key={p.nomProduit} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white font-medium truncate max-w-xs">{p.nomProduit}</span>
                            <div className="text-right ml-4 flex-shrink-0">
                              <p className="font-bold text-amber-400">{formatCurrency(p._sum.totalLigne)}</p>
                              <p className="text-xs text-slate-400">{p._sum.quantite || 0} unité(s)</p>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">Aucune vente sur cette période</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'boutiques' && (
          <motion.div
            key="boutiques"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="glass-card rounded-3xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                Performance par Point de Vente
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />)}
                </div>
              ) : data?.ventesParPDV && data.ventesParPDV.length > 0 ? (
                <div className="space-y-4">
                  {data.ventesParPDV.map((pdv, i) => {
                    const maxCA = data.ventesParPDV[0]?._sum.total || 1;
                    const pct = Math.round(((pdv._sum.total || 0) / maxCA) * 100);
                    const taux = (pdv._sum.total || 0) > 0
                      ? Math.round(((pdv._sum.montantPaye || 0) / (pdv._sum.total || 1)) * 100)
                      : 0;
                    return (
                      <div key={pdv.pointVenteId} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center">
                              {i + 1}
                            </span>
                            <p className="font-bold text-white">{pdv.pointVenteNom || `Boutique #${pdv.pointVenteId}`}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            taux >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {taux}% encaissé
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                          <div>
                            <p className="text-xs text-slate-400">CA</p>
                            <p className="font-bold text-amber-400 text-sm">{formatCurrency(pdv._sum.total)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Encaissé</p>
                            <p className="font-bold text-emerald-400 text-sm">{formatCurrency(pdv._sum.montantPaye)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Ventes</p>
                            <p className="font-bold text-white text-sm">{pdv._count._all}</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">Aucune donnée par boutique sur cette période</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
