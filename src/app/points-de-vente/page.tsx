'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Users,
  Package,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  X,
  ChevronRight,
  ShoppingCart,
  Banknote,
  Edit3,
  UserPlus,
  Store,
  Globe,
  Pause,
  Play,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Vendeur {
  id: number;
  nom: string;
  login: string;
  role: string;
  active: boolean;
}

interface PointDeVente {
  id: number;
  nom: string;
  codeBoutique: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  active: boolean;
  gerant?: { id: number; nom: string; login: string } | null;
  vendeurs: Vendeur[];
  _count: { ventes: number; stocks: number; vendeurs: number };
  stats30j: {
    _sum: { total: number | null; montantPaye: number | null };
    _count: { _all: number };
  };
}

const VILLES_GUINEE = [
  'Conakry', 'Kindia', 'Labé', 'Kankan', 'Nzérékoré', 'Boké',
  'Mamou', 'Faranah', 'Coyah', 'Dubréka', 'Fria', 'Kamsar',
  'Guéckédou', 'Macenta', 'Kissidougou', 'Siguiri', 'Kérouané',
  'Dinguiraye', 'Télimélé', 'Pita', 'Dalaba', 'Tougué', 'Koubia',
  'Lélouma', 'Mali (Guinée)', 'Gaoual', 'Koundara', 'Boffa', 'Forécariah', 'Autre'
];

const VILLE_COLORS: Record<string, string> = {
  Conakry: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300',
  Kindia: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300',
  Labé: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
  Kankan: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
  'Nzérékoré': 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300',
  Boké: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-300',
  Mamou: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300',
  Faranah: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-300',
  Coyah: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-300',
  Siguiri: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300',
};

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <input
        id={id}
        {...props}
        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
      />
    </div>
  );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <select
        id={id}
        {...props}
        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

// Modal de création d'un point de vente
// Modal de création ou modification d'un point de vente
function PDVFormModal({
  pdv,
  onClose,
  onSuccess,
}: {
  pdv?: PointDeVente | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!pdv;
  const [form, setForm] = useState({
    nom: pdv?.nom || '',
    codeBoutique: pdv?.codeBoutique || '',
    ville: pdv?.ville || 'Conakry',
    adresse: pdv?.adresse || '',
    telephone: pdv?.telephone || '',
    email: pdv?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = isEdit ? { id: pdv!.id, ...form } : form;
      const res = await fetch('/api/points-de-vente', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || 'Erreur lors de l\'enregistrement');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate code boutique (uniquement en création)
  const handleVilleChange = (ville: string) => {
    if (!isEdit) {
      const prefix = ville.substring(0, 3).toUpperCase();
      const code = form.codeBoutique.match(/^[A-Z]{3}-/) ? form.codeBoutique.replace(/^[A-Z]{3}/, prefix) : `${prefix}-`;
      setForm((f) => ({ ...f, ville, codeBoutique: code }));
    } else {
      setForm((f) => ({ ...f, ville }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {isEdit ? 'Modifier le Point de Vente' : 'Nouveau Point de Vente'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? `Édition de ${pdv!.nom} (${pdv!.codeBoutique})` : 'Créer une boutique ou agence'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Nom de la boutique *"
            id="nom"
            placeholder="Ex: Agence Hamdallaye ACI"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Ville *"
              id="ville"
              value={form.ville}
              onChange={(e) => handleVilleChange(e.target.value)}
            >
              {VILLES_GUINEE.map((v) => <option key={v} value={v}>{v}</option>)}
            </SelectField>
            <InputField
              label="Code Boutique *"
              id="codeBoutique"
              placeholder="Ex: BAM-02"
              value={form.codeBoutique}
              onChange={(e) => setForm((f) => ({ ...f, codeBoutique: e.target.value.toUpperCase() }))}
              required
            />
          </div>
          <InputField
            label="Adresse"
            id="adresse"
            placeholder="Quartier, Rue..."
            value={form.adresse}
            onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Téléphone"
              id="telephone"
              placeholder="Ex :622 48 81 61"
              value={form.telephone}
              onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
            />
            <InputField
              label="Email"
              id="email"
              type="email"
              placeholder="boutique@sidibe.ml"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-2xl btn-gold font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement...</>
              ) : isEdit ? (
                <><Edit3 className="w-4 h-4" />Enregistrer</>
              ) : (
                <><Plus className="w-4 h-4" />Créer la Boutique</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Modal de détails d'un point de vente
function PDVDetailModal({
  pdv,
  onClose,
  onEdit,
  onTogglePause,
  isAdmin,
}: {
  pdv: PointDeVente;
  onClose: () => void;
  onEdit: (pdv: PointDeVente) => void;
  onTogglePause: (pdv: PointDeVente) => void;
  isAdmin: boolean;
}) {
  const villeColor = VILLE_COLORS[pdv.ville] || 'from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br ${villeColor} border-b border-slate-800`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-black/30 border border-white/10">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{pdv.nom}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold opacity-80 font-mono">{pdv.codeBoutique}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${pdv.active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                    {pdv.active ? '● Boutique Active' : '⏸ En Pause (Suspendue)'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-black/30 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Alerte si le point de vente est en pause */}
          {!pdv.active && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className="font-bold">Boutique en pause</p>
                <p className="text-slate-400">Les opérations et ventes de cette boutique sont temporairement suspendues.</p>
              </div>
            </div>
          )}

          {/* Infos */}
          <div className="space-y-2">
            {pdv.ville && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>{pdv.ville}, Guinée</span>
              </div>
            )}
            {pdv.adresse && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>{pdv.adresse}</span>
              </div>
            )}
            {pdv.telephone && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{pdv.telephone}</span>
              </div>
            )}
            {pdv.email && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>{pdv.email}</span>
              </div>
            )}
          </div>

          {/* Stats 30j */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <ShoppingCart className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-black text-white">{pdv.stats30j._count._all}</p>
              <p className="text-[10px] text-slate-400">Ventes / 30j</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <Banknote className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-sm font-black text-amber-400">{formatCurrency(pdv.stats30j._sum.total)}</p>
              <p className="text-[10px] text-slate-400">CA / 30j</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <Package className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-black text-white">{pdv._count.stocks}</p>
              <p className="text-[10px] text-slate-400">Réf. Stock</p>
            </div>
          </div>

          {/* Équipe */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Équipe ({pdv._count.vendeurs} vendeur(s))
            </h3>
            {pdv.gerant && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                  {pdv.gerant.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{pdv.gerant.nom}</p>
                  <p className="text-xs text-amber-400">Gérant</p>
                </div>
              </div>
            )}
            {pdv.vendeurs.filter((v) => v.id !== pdv.gerant?.id).map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700 mb-1.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                  {v.nom[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{v.nom}</p>
                  <p className="text-xs text-slate-400">@{v.login}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${v.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {v.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
            {pdv.vendeurs.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Aucun vendeur affecté à cette boutique</p>
            )}
          </div>

          {/* Boutons d'actions d'administration — Admin uniquement */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => onEdit(pdv)}
                className="flex-1 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Modifier</span>
              </button>
              <button
                onClick={() => onTogglePause(pdv)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all border shadow-lg ${
                  pdv.active
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-amber-500/5'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/5'
                }`}
              >
                {pdv.active ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Mettre en pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Réactiver</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PointsDeVentePage() {
  const { user, isAdmin, isGerant } = useAuth();
  const [points, setPoints] = useState<PointDeVente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPDV, setEditingPDV] = useState<PointDeVente | null>(null);
  const [selectedPDV, setSelectedPDV] = useState<PointDeVente | null>(null);
  const [filterVille, setFilterVille] = useState<string>('all');

  const handleTogglePause = async (pdv: PointDeVente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/points-de-vente', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pdv.id, active: !pdv.active }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPoints();
        if (selectedPDV && selectedPDV.id === pdv.id) {
          setSelectedPDV((prev) => prev ? { ...prev, active: !prev.active } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/points-de-vente');
      const json = await res.json();
      if (json.success) setPoints(json.pointsDeVente || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const villes = ['all', ...Array.from(new Set(points.map((p) => p.ville))).sort()];
  const filtered = filterVille === 'all' ? points : points.filter((p) => p.ville === filterVille);

  // Summary stats
  const totalCA = points.reduce((s, p) => s + (p.stats30j._sum.total || 0), 0);
  const totalVentes = points.reduce((s, p) => s + p.stats30j._count._all, 0);
  const totalVendeurs = points.reduce((s, p) => s + p._count.vendeurs, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building2 className="w-6 h-6" />
            </span>
            Points de Vente
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {points.length} boutique(s) actives — Vue multi-villes Sidibe Services
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPoints}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gold text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Boutique
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Boutiques', value: points.length, icon: Store, color: 'text-amber-400' },
          { label: 'CA Total 30j', value: formatCurrency(totalCA), icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Ventes 30j', value: totalVentes, icon: ShoppingCart, color: 'text-blue-400' },
          { label: 'Vendeurs', value: totalVendeurs, icon: Users, color: 'text-purple-400' },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            {loading ? (
              <div className="h-6 w-3/4 rounded bg-slate-800 animate-pulse" />
            ) : (
              <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Ville Filter */}
      {villes.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {villes.map((v) => (
            <button
              key={v}
              onClick={() => setFilterVille(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                filterVille === v
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {v === 'all' ? '🌍 Toutes les villes' : `📍 ${v}`}
            </button>
          ))}
        </div>
      )}

      {/* Grid of Points of Sale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-56 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun point de vente trouvé.</p>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 rounded-xl btn-gold text-sm font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer la première boutique
              </button>
            )}
          </div>
        ) : (
          filtered.map((p, i) => {
            const villeColor = VILLE_COLORS[p.ville] || 'from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-300';
            const tauxEncaissement = (p.stats30j._sum.total || 0) > 0
              ? Math.round(((p.stats30j._sum.montantPaye || 0) / (p.stats30j._sum.total || 1)) * 100)
              : 0;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card rounded-3xl border border-slate-800 overflow-hidden flex flex-col cursor-pointer"
                onClick={() => setSelectedPDV(p)}
                whileHover={{ y: -3 }}
              >
                {/* Card Header */}
                <div className={`p-5 bg-gradient-to-br ${villeColor}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base leading-tight">{p.nom}</h3>
                        <span className="text-[10px] font-bold font-mono opacity-70 bg-black/20 px-2 py-0.5 rounded-full">
                          {p.codeBoutique}
                        </span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${p.active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{p.adresse ? `${p.adresse}, ` : ''}{p.ville}, Guinée</span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide">Ventes/30j</p>
                      <p className="text-base font-black text-white mt-0.5">{p.stats30j._count._all}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide">CA/30j</p>
                      <p className="text-xs font-black text-amber-400 mt-0.5">{formatCurrency(p.stats30j._sum.total)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide">Vendeurs</p>
                      <p className="text-base font-black text-blue-400 mt-0.5">{p._count.vendeurs}</p>
                    </div>
                  </div>

                  {/* Encaissement rate */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Taux d&apos;encaissement</span>
                      <span className={`font-bold ${tauxEncaissement >= 80 ? 'text-emerald-400' : tauxEncaissement >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {tauxEncaissement}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tauxEncaissement}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${tauxEncaissement >= 80 ? 'bg-emerald-400' : tauxEncaissement >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      />
                    </div>
                  </div>

                  {/* Gérant */}
                  {p.gerant && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="w-6 h-6 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">
                        {p.gerant.nom[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.gerant.nom}</p>
                        <p className="text-[10px] text-amber-400">Gérant</p>
                      </div>
                    </div>
                  )}

                  {/* Actions Rapides — Admin uniquement */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPDV(p);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>

                      <button
                        onClick={(e) => handleTogglePause(p, e)}
                        title={p.active ? "Mettre en pause les activités de cette boutique" : "Réactiver la boutique"}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                          p.active
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {p.active ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Mettre en pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Réactiver</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Footer CTA */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPDV(p); }}
                    className="mt-auto flex items-center justify-between w-full text-xs text-slate-400 hover:text-amber-400 transition-colors pt-2 border-t border-slate-800/60"
                  >
                    <span>Voir les détails complets</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <PDVFormModal
            onClose={() => setShowCreate(false)}
            onSuccess={fetchPoints}
          />
        )}
        {editingPDV && (
          <PDVFormModal
            pdv={editingPDV}
            onClose={() => setEditingPDV(null)}
            onSuccess={fetchPoints}
          />
        )}
        {selectedPDV && (
          <PDVDetailModal
            pdv={selectedPDV}
            onClose={() => setSelectedPDV(null)}
            onEdit={(pdv) => {
              setSelectedPDV(null);
              setEditingPDV(pdv);
            }}
            onTogglePause={(pdv) => handleTogglePause(pdv)}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
