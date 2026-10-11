'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Building2,
  Banknote,
  Smartphone,
  CreditCard,
  Search,
  Filter,
  Receipt,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Depense {
  id: number;
  categorie: string;
  motif: string;
  montant: number;
  modePaiement: string;
  beneficiaire?: string;
  dateDepense: string;
  pointDeVente: { id: number; nom: string; codeBoutique: string };
  utilisateur?: { id: number; nom: string } | null;
}

const CATEGORIES = ['LOYER', 'ELECTRICITE', 'TRANSPORT', 'SALAIRE', 'DIVERS'];
const MODES_PAIEMENT = ['ESPECES', 'WAVE', 'ORANGE_MONEY', 'CARTE'];

const CAT_COLORS: Record<string, string> = {
  LOYER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ELECTRICITE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  TRANSPORT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  SALAIRE: 'bg-green-500/20 text-green-300 border-green-500/30',
  DIVERS: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const MODE_ICONS: Record<string, React.ElementType> = {
  ESPECES: Banknote,
  WAVE: Smartphone,
  ORANGE_MONEY: Smartphone,
  CARTE: CreditCard,
};

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <input id={id} {...props} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-600" />
    </div>
  );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <select id={id} {...props} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all">{children}</select>
    </div>
  );
}

interface DepenseFormData {
  pointDeVenteId: string;
  categorie: string;
  motif: string;
  montant: string;
  modePaiement: string;
  beneficiaire: string;
}

function CreateDepenseModal({ pdvList, onClose, onSuccess, defaultPdvId }: {
  pdvList: { id: number; nom: string; codeBoutique: string }[];
  onClose: () => void;
  onSuccess: () => void;
  defaultPdvId?: number;
}) {
  const [form, setForm] = useState<DepenseFormData>({
    pointDeVenteId: defaultPdvId ? String(defaultPdvId) : (pdvList[0]?.id ? String(pdvList[0].id) : ''),
    categorie: 'DIVERS',
    motif: '',
    montant: '',
    modePaiement: 'ESPECES',
    beneficiaire: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof DepenseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.montant || parseFloat(form.montant) <= 0) { setError('Montant invalide'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/depenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) { onSuccess(); onClose(); }
      else setError(json.error || 'Erreur');
    } catch { setError('Erreur réseau'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Nouvelle Dépense</h2>
              <p className="text-xs text-slate-400">Enregistrer un frais d&apos;exploitation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Boutique *" id="pdv" value={form.pointDeVenteId} onChange={set('pointDeVenteId')}>
            {pdvList.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.codeBoutique})</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Catégorie *" id="cat" value={form.categorie} onChange={set('categorie')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Mode Paiement" id="mode" value={form.modePaiement} onChange={set('modePaiement')}>
              {MODES_PAIEMENT.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </SelectField>
          </div>
          <InputField label="Motif / Description *" id="motif" value={form.motif} onChange={set('motif')} placeholder="Ex: Loyer mois de janvier" required />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Montant (GNF) *" id="montant" type="number" min="1" step="1" value={form.montant} onChange={set('montant')} placeholder="0" required />
            <InputField label="Bénéficiaire" id="benef" value={form.beneficiaire} onChange={set('beneficiaire')} placeholder="Propriétaire..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold">Annuler</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold flex items-center justify-center gap-2 transition-colors">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement...</> : <><CheckCircle className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function DepensesPage() {
  const { user, activePointVenteId, isAdmin } = useAuth();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [pdvList, setPdvList] = useState<{ id: number; nom: string; codeBoutique: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMontant, setTotalMontant] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pvParam = activePointVenteId ? `?pointVenteId=${activePointVenteId}` : '';
      const [dRes, pRes] = await Promise.all([
        fetch(`/api/depenses${pvParam}`),
        fetch('/api/points-de-vente'),
      ]);
      const [dJson, pJson] = await Promise.all([dRes.json(), pRes.json()]);
      if (dJson.success) { setDepenses(dJson.depenses); setTotalMontant(dJson.totalMontant); }
      if (pJson.success) setPdvList(pJson.pointsDeVente || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [activePointVenteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = depenses.filter((d) => {
    const matchSearch = !search || d.motif.toLowerCase().includes(search.toLowerCase()) || d.beneficiaire?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || d.categorie === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <TrendingDown className="w-6 h-6" />
            </span>
            Dépenses & Charges
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {depenses.length} dépense(s) — Total : <span className="text-rose-400 font-bold">{formatCurrency(totalMontant)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" />Nouvelle Dépense
          </button>
        </div>
      </div>

      {/* Summary by Category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const total = depenses.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0);
          return (
            <div key={cat} className={`p-4 rounded-2xl border ${CAT_COLORS[cat]} text-center cursor-pointer transition-all ${filterCat === cat ? 'ring-2 ring-white/20' : ''}`}
              onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{cat}</p>
              <p className="text-base font-black">{formatCurrency(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par motif ou bénéficiaire..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all placeholder:text-slate-600" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune dépense enregistrée.</p>
          </div>
        ) : (
          filtered.map((d, i) => {
            const ModeIcon = MODE_ICONS[d.modePaiement] || Banknote;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-2xl border border-slate-800 p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl border flex-shrink-0 ${CAT_COLORS[d.categorie] || CAT_COLORS.DIVERS}`}>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-sm leading-tight">{d.motif}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {d.pointDeVente.nom} ({d.pointDeVente.codeBoutique})
                        {d.beneficiaire && ` · ${d.beneficiaire}`}
                      </p>
                    </div>
                    <p className="text-lg font-black text-rose-400 flex-shrink-0">{formatCurrency(d.montant)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[d.categorie] || CAT_COLORS.DIVERS}`}>
                      {d.categorie}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <ModeIcon className="w-3 h-3" />
                      {d.modePaiement.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto">{formatDate(d.dateDepense)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateDepenseModal
            pdvList={pdvList}
            defaultPdvId={activePointVenteId || undefined}
            onClose={() => setShowCreate(false)}
            onSuccess={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
