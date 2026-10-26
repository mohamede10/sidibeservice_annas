'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  UserCheck,
  Building2,
  Calendar,
  DollarSign,
  Printer,
  CheckCircle,
  RefreshCw,
  Phone,
  Banknote,
  Smartphone,
  CreditCard,
  X,
  FileText,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface PointDeVente {
  id: number;
  nom: string;
  codeBoutique: string;
  ville?: string;
}

interface Vendeur {
  id: number;
  nom: string;
  telephone?: string;
  role: string;
  pointVenteDefaut?: { id: number; nom: string; codeBoutique: string };
}

interface SalaireRecord {
  id: number;
  pointDeVenteId: number;
  dateDepense: string;
  utilisateurId?: number;
  motif: string;
  montant: number;
  modePaiement: string;
  beneficiaire?: string;
  pointDeVente: PointDeVente;
  utilisateur?: { id: number; nom: string; role: string; telephone?: string };
}

export default function SalairesPage() {
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [salaires, setSalaires] = useState<SalaireRecord[]>([]);
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [pointsDeVente, setPointsDeVente] = useState<PointDeVente[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMontant, setTotalMontant] = useState(0);

  // Filters
  const [filterPdv, setFilterPdv] = useState('');
  const [filterVendeur, setFilterVendeur] = useState('');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVendeurId, setSelectedVendeurId] = useState('');
  const [selectedPdvId, setSelectedPdvId] = useState('');
  const [mois, setMois] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salaireBase, setSalaireBase] = useState('');
  const [prime, setPrime] = useState('');
  const [deductions, setDeductions] = useState('');
  const [modePaiement, setModePaiement] = useState('ESPECES');
  const [notes, setNotes] = useState('');

  // Selected receipt for printing
  const [receiptItem, setReceiptItem] = useState<SalaireRecord | null>(null);

  const fetchSalaires = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterPdv) params.append('pointVenteId', filterPdv);
      if (filterVendeur) params.append('utilisateurId', filterVendeur);

      const res = await fetch(`/api/salaires?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSalaires(json.salaires || []);
        setVendeurs(json.vendeurs || []);
        setPointsDeVente(json.pointsDeVente || []);
        setTotalMontant(json.totalMontant || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaires();
  }, [filterPdv, filterVendeur]);

  // When seller selected in modal, auto-fill boutique
  const handleSelectVendeur = (id: string) => {
    setSelectedVendeurId(id);
    const v = vendeurs.find((x) => String(x.id) === id);
    if (v?.pointVenteDefaut) {
      setSelectedPdvId(String(v.pointVenteDefaut.id));
    }
  };

  // Calculations
  const baseNum = parseFloat(salaireBase) || 0;
  const primeNum = parseFloat(prime) || 0;
  const deducNum = parseFloat(deductions) || 0;
  const netCalcule = Math.max(0, baseNum + primeNum - deducNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendeurId || !selectedPdvId || baseNum <= 0) {
      showWarning('Veuillez sélectionner un vendeur, une boutique et saisir le salaire de base.');
      return;
    }

    const v = vendeurs.find((x) => String(x.id) === selectedVendeurId);

    try {
      setSubmitting(true);
      const res = await fetch('/api/salaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilisateurId: selectedVendeurId,
          pointDeVenteId: selectedPdvId,
          mois,
          salaireBase: baseNum,
          prime: primeNum,
          deductions: deducNum,
          modePaiement,
          beneficiaire: v?.nom || '',
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        resetForm();
        fetchSalaires();
        showSuccess('Le salaire a été enregistré.', 'Salaire créé');
      } else {
        showError(json.error || 'Erreur lors de l\'enregistrement', 'Erreur salaire');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedVendeurId('');
    setSelectedPdvId('');
    setSalaireBase('');
    setPrime('');
    setDeductions('');
    setNotes('');
  };

  const handlePrint = (item: SalaireRecord) => {
    setReceiptItem(item);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const filtered = salaires.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.beneficiaire || '').toLowerCase().includes(q) ||
      (s.utilisateur?.nom || '').toLowerCase().includes(q) ||
      (s.motif || '').toLowerCase().includes(q) ||
      (s.pointDeVente?.nom || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </span>
            Paiement des Salaires Vendeurs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestion centrale des rémunérations, primes et bulletins de paie par boutique.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSalaires}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Payer un Salaire
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Masse Salariale Versée</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(totalMontant)}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paiements Effectués</p>
          <p className="text-xl font-black text-white mt-1">{salaires.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendeurs & Gérants</p>
          <p className="text-xl font-black text-sky-400 mt-1">{vendeurs.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boutiques Couvertes</p>
          <p className="text-xl font-black text-amber-400 mt-1">{pointsDeVente.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom de vendeur, boutique..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Boutique filter */}
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
          <select
            value={filterPdv}
            onChange={(e) => setFilterPdv(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value="">Toutes les Boutiques</option>
            {pointsDeVente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Vendeur filter */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 pointer-events-none" />
          <select
            value={filterVendeur}
            onChange={(e) => setFilterVendeur(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-sky-300 focus:outline-none cursor-pointer"
          >
            <option value="">Tous les Vendeurs</option>
            {vendeurs.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom} ({v.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table list */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            Chargement des salaires...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun paiement de salaire enregistré.</p>
          </div>
        ) : (
          filtered.map((s) => (
            <motion.div
              key={s.id}
              layout
              className="glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">
                      {s.beneficiaire || s.utilisateur?.nom || 'Vendeur'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      PAYÉ
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      {s.modePaiement}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-1">{s.motif}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                    <span className="text-amber-400 font-semibold">{s.pointDeVente.nom}</span>
                    <span>•</span>
                    <span>{formatDate(s.dateDepense)}</span>
                    {s.utilisateur?.telephone && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {s.utilisateur.telephone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Montant Net</p>
                  <p className="text-lg font-black text-emerald-400">{formatCurrency(s.montant)}</p>
                </div>
                <button
                  onClick={() => handlePrint(s)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bulletin</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* MODAL NOUVEAU PAIEMENT DE SALAIRE */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Paiement de Salaire</h2>
                    <p className="text-xs text-slate-400">Rémunération vendeur ou gérant de boutique</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Vendeur & Boutique */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Vendeur / Gérant *</label>
                    <select
                      value={selectedVendeurId}
                      onChange={(e) => handleSelectVendeur(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">-- Sélectionner --</option>
                      {vendeurs.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nom} ({v.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Boutique Rattachée *</label>
                    <select
                      value={selectedPdvId}
                      onChange={(e) => setSelectedPdvId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">-- Sélectionner --</option>
                      {pointsDeVente.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mois & Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Mois Concerné *</label>
                    <input
                      type="month"
                      value={mois}
                      onChange={(e) => setMois(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Mode de Paiement</label>
                    <select
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="ESPECES">Espèces</option>
                      <option value="ORANGE_MONEY">Orange Money Guinée</option>
                      <option value="WAVE">Wave</option>
                      <option value="VIREMENT">Virement Bancaire</option>
                      <option value="CHEQUE">Chèque</option>
                    </select>
                  </div>
                </div>

                {/* Salaire Base, Primes, Déductions */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Salaire Base *</label>
                      <input
                        type="number"
                        min="1"
                        value={salaireBase}
                        onChange={(e) => setSalaireBase(e.target.value)}
                        placeholder="0"
                        required
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">+ Primes</label>
                      <input
                        type="number"
                        min="0"
                        value={prime}
                        onChange={(e) => setPrime(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-emerald-400 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-rose-400 block mb-1">- Retenues</label>
                      <input
                        type="number"
                        min="0"
                        value={deductions}
                        onChange={(e) => setDeductions(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-rose-400 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Dynamic Net */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Salaire Net à Payer :</span>
                    <span className="text-base font-black text-emerald-400">{formatCurrency(netCalcule)}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Notes / Référence Reçu</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Prime d'objectif incluse..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || baseNum <= 0}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>Enregistrement...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Valider le Paiement</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Bulletin de Paie Modal / Section */}
      {receiptItem && (
        <div id="print-bulletin-container" className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-50">
          <div className="max-w-md mx-auto border-2 border-black p-6 space-y-4">
            <div className="text-center border-b pb-3">
              <h2 className="text-xl font-bold uppercase tracking-wider">SIDIBÉ MULTI-SERVICES</h2>
              <p className="text-xs text-gray-600">Commerce Général, Import-Export & Services</p>
              <p className="text-xs font-bold text-gray-800 mt-1">Boutique: {receiptItem.pointDeVente.nom}</p>
            </div>

            <div className="text-center py-1 bg-gray-100 border">
              <h3 className="text-sm font-black uppercase">BULLETIN / REÇU DE SALAIRE</h3>
            </div>

            <div className="text-xs space-y-1.5 border-b pb-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Date de paiement :</span>
                <span className="font-bold">{new Date(receiptItem.dateDepense).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bénéficiaire :</span>
                <span className="font-bold">{receiptItem.beneficiaire || receiptItem.utilisateur?.nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Téléphone :</span>
                <span>{receiptItem.utilisateur?.telephone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode de règlement :</span>
                <span className="font-bold">{receiptItem.modePaiement}</span>
              </div>
            </div>

            <div className="text-xs space-y-2 border-b pb-3">
              <p className="font-semibold text-gray-700">Détails :</p>
              <p className="text-gray-800 bg-gray-50 p-2 rounded border">{receiptItem.motif}</p>
            </div>

            <div className="flex justify-between items-center text-sm font-black pt-1">
              <span>MONTANT NET PERÇU :</span>
              <span className="text-base">{formatCurrency(receiptItem.montant)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 text-[11px] text-center">
              <div>
                <p className="font-semibold mb-8">Signature de l&apos;Employé</p>
                <div className="border-t border-gray-400 w-24 mx-auto"></div>
              </div>
              <div>
                <p className="font-semibold mb-8">Cachet & Signature Admin</p>
                <div className="border-t border-gray-400 w-24 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
