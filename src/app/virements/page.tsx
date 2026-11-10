'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  ArrowDownToLine,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Building2,
  RefreshCw,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  X,
  Store,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printVirementReceipt } from '@/lib/invoicePdf';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface PointDeVente {
  id: number;
  nom: string;
  codeBoutique: string;
  ville?: string;
  telephone?: string;
}

interface Vendeur {
  id: number;
  nom: string;
  role: string;
  pointVenteId?: number;
}

interface VirementRecord {
  id: number;
  reference: string;
  pointDeVenteId: number;
  dateCloture: string;
  utilisateurId: number;
  totalEspeces: number;
  soldeTheorique: number;
  soldeReel: number;
  ecart: number;
  statut: string; // EN_ATTENTE, VALIDEE
  notes?: string;
  pointDeVente: PointDeVente;
  utilisateur: { id: number; nom: string; telephone?: string };
}

interface SyntheseBoutique {
  pointDeVente: PointDeVente;
  venduEsp: number;
  depEsp: number;
  virValide: number;
  virAttente: number;
  ecartRestant: number;
}

export default function VirementsPage() {
  const { user, isAdmin, isGerant, activePointVenteId } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [virements, setVirements] = useState<VirementRecord[]>([]);
  const [pointsDeVente, setPointsDeVente] = useState<PointDeVente[]>([]);
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [synthese, setSynthese] = useState<SyntheseBoutique[]>([]);
  const [stats, setStats] = useState({
    totalVenduEspeces: 0,
    totalVenduGlobal: 0,
    totalDepensesEspeces: 0,
    totalVireValide: 0,
    totalVireEnAttente: 0,
    differenceCaisse: 0,
    soldeCaisseCentrale: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterPdv, setFilterPdv] = useState('');
  const [search, setSearch] = useState('');
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [virementToDelete, setVirementToDelete] = useState<VirementRecord | null>(null);
  const [deletingVirement, setDeletingVirement] = useState(false);

  const handleConfirmDeleteVirement = async () => {
    if (!virementToDelete) return;
    try {
      setDeletingVirement(true);
      const res = await fetch(`/api/virements?id=${virementToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message || 'Virement supprimé avec succès.', 'Virement supprimé');
        setVirements((prev) => prev.filter((v) => v.id !== virementToDelete.id));
        setVirementToDelete(null);
        fetchVirements();
      } else {
        showError(data.error || 'Erreur lors de la suppression du virement.', 'Erreur');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de la suppression du virement.', 'Erreur réseau');
    } finally {
      setDeletingVirement(false);
    }
  };

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPdvId, setSelectedPdvId] = useState('');
  const [selectedVendeurId, setSelectedVendeurId] = useState('');
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');

  // Printable receipt — géré via printVirementReceipt() dans invoicePdf.ts

  // Sécurisation stricte : Le vendeur (non-admin) ne doit voir QUE sa propre boutique
  const isVendeurOrRestricted = !isAdmin && !!(user?.pointVenteId || activePointVenteId);
  const userAssignedPdvId = user?.pointVenteId || activePointVenteId;

  const fetchVirements = async () => {
    try {
      setLoading(true);
      const effectivePdvId = isVendeurOrRestricted ? String(userAssignedPdvId) : filterPdv;
      const params = effectivePdvId ? `?pointVenteId=${effectivePdvId}` : '';
      const res = await fetch(`/api/virements${params}`);
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        setVirements(json.virements || []);
        setPointsDeVente(json.pointsDeVente || []);
        setVendeurs(json.vendeurs || []);
        setStats(json.statistiques || {});
        const rawSynthese: SyntheseBoutique[] = json.syntheseParBoutique || [];
        setSynthese(
          isVendeurOrRestricted && userAssignedPdvId
            ? rawSynthese.filter((s) => s.pointDeVente.id === userAssignedPdvId)
            : rawSynthese
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirements();
  }, [filterPdv, user?.pointVenteId, isAdmin, activePointVenteId]);

  // Set default boutique and seller when modal opens
  useEffect(() => {
    if (showModal) {
      const myPdv = userAssignedPdvId || (pointsDeVente[0]?.id ? String(pointsDeVente[0].id) : '');
      if (myPdv) setSelectedPdvId(String(myPdv));
      if (user?.id) setSelectedVendeurId(String(user.id));
    }
  }, [showModal, user, userAssignedPdvId, pointsDeVente]);

  // Current theoretical cash for selected boutique in modal
  const effectiveModalPdvId = isVendeurOrRestricted ? String(userAssignedPdvId) : selectedPdvId;
  const currentBoutiqueSynth = synthese.find((s) => String(s.pointDeVente.id) === effectiveModalPdvId);
  const soldeDisponibleBoutique = currentBoutiqueSynth ? Math.max(0, currentBoutiqueSynth.ecartRestant) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPdvId = isVendeurOrRestricted ? userAssignedPdvId : selectedPdvId;
    const targetVendeurId = isVendeurOrRestricted ? user?.id : selectedVendeurId;

    if (!targetPdvId || !targetVendeurId || !montant || parseFloat(montant) <= 0) {
      showWarning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/virements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointDeVenteId: targetPdvId,
          utilisateurId: targetVendeurId,
          montant: parseFloat(montant),
          notes,
          statut: isAdmin ? 'VALIDEE' : 'EN_ATTENTE',
        }),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        setShowModal(false);
        setMontant('');
        setNotes('');
        fetchVirements();
        showSuccess('Virement enregistré avec succès.', 'Virement créé');
      } else {
        showError(json?.error || 'Erreur lors de l\'enregistrement du virement', 'Erreur virement');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de l\'enregistrement du virement', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValiderReception = async (id: number) => {
    // Demander confirmation via état inline (pas de confirm() navigateur)
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setConfirmingId(null);

    try {
      setValidatingId(id);
      const res = await fetch('/api/virements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statut: 'VALIDEE' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchVirements();
        showSuccess('Réception d\'espèces confirmée et enregistrée.', 'Virement validé');
      } else {
        showError(json.error || 'Erreur', 'Erreur validation');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Erreur réseau');
    } finally {
      setValidatingId(null);
    }
  };

  const handlePrint = (item: VirementRecord) => {
    printVirementReceipt({
      reference: item.reference,
      dateCloture: item.dateCloture,
      boutique: {
        nom: item.pointDeVente.nom,
        codeBoutique: item.pointDeVente.codeBoutique,
        ville: item.pointDeVente.ville,
        telephone: item.pointDeVente.telephone,
      },
      vendeur: {
        nom: item.utilisateur?.nom || 'Vendeur',
        telephone: item.utilisateur?.telephone,
      },
      montant: item.soldeReel,
      statut: item.statut,
      notes: item.notes,
      soldeTheorique: item.soldeTheorique,
    });
  };

  const filteredVirements = virements.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.reference.toLowerCase().includes(q) ||
      v.pointDeVente.nom.toLowerCase().includes(q) ||
      (v.utilisateur?.nom || '').toLowerCase().includes(q) ||
      (v.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Banknote className="w-6 h-6" />
            </span>
            Caisse de Virement & Rapprochement Espèces
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Virement d&apos;espèces des boutiques vers la caisse Admin avec calcul de la différence et du montant restant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVirements}
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
            Nouveau Virement d&apos;Espèces
          </motion.button>
        </div>
      </div>

      {/* KPI Cards: The exact requested 4 metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendu Espèces */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendu (Espèces)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{formatCurrency(stats.totalVenduEspeces)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Recettes en liquide générées</p>
        </div>

        {/* Total Viré à l'Admin */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Montant Viré & Encaissé</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{formatCurrency(stats.totalVireValide)}</p>
          <p className="text-[11px] text-emerald-300/70 mt-1">Reçu dans la caisse centrale Admin</p>
        </div>

        {/* Virements en attente */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Virements En Attente</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{formatCurrency(stats.totalVireEnAttente)}</p>
          <p className="text-[11px] text-amber-300/70 mt-1">Expédiés par vendeurs, à valider</p>
        </div>

        {/* La Différence (Total Vendu - Total Viré) */}
        <div className={`glass-panel p-5 rounded-3xl border relative overflow-hidden ${
          stats.differenceCaisse > 0
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Différence / Reste Boutique</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{formatCurrency(stats.differenceCaisse)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Espèces en tiroir non encore virées (hors EN ATTENTE)
          </p>
        </div>
      </div>

      {/* Rapprochement & Synthèse par Boutique */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-400" />
          {isVendeurOrRestricted
            ? `Caisse & Rapprochement de votre Boutique (${user?.pointVenteNom || 'Ma Boutique'})`
            : 'Rapprochement par Boutique'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {synthese
            .filter((s) => !isVendeurOrRestricted || s.pointDeVente.id === userAssignedPdvId)
            .map((s) => (
            <div
              key={s.pointDeVente.id}
              className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{s.pointDeVente.nom}</h3>
                  <p className="text-[11px] text-slate-400">{s.pointDeVente.codeBoutique} • {s.pointDeVente.ville}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  s.ecartRestant > 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {s.ecartRestant > 0 ? 'À Virer' : 'Équilibré'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Ventes Espèces :</span>
                  <span className="font-semibold text-white">{formatCurrency(s.venduEsp)}</span>
                </div>
                {s.depEsp > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Dépenses Espèces :</span>
                    <span className="font-semibold">-{formatCurrency(s.depEsp)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-400">
                  <span>Viré à l&apos;Admin :</span>
                  <span className="font-semibold">{formatCurrency(s.virValide)}</span>
                </div>
                {s.virAttente > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>En attente validation :</span>
                    <span className="font-semibold">{formatCurrency(s.virAttente)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-800 font-bold">
                  <span className="text-slate-300">Reste en Caisse :</span>
                  <span className={s.ecartRestant > 0 ? 'text-amber-400 font-black' : 'text-emerald-400'}>
                    {formatCurrency(s.ecartRestant)}
                  </span>
                </div>
              </div>

              {s.ecartRestant > 0 && (
                <button
                  onClick={() => {
                    setSelectedPdvId(String(s.pointDeVente.id));
                    setMontant(String(s.ecartRestant));
                    setShowModal(true);
                  }}
                  className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Virer ce solde vers Admin
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, boutique, vendeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {isAdmin ? (
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
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-300 shadow-sm">
            <Store className="w-4 h-4 text-amber-400" />
            <span>Boutique : {user?.pointVenteNom || 'Ma Boutique'}</span>
          </div>
        )}
      </div>

      {/* History of Remittances */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
          Historique des Virements vers l&apos;Admin
        </h2>

        {loading ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            Chargement des virements...
          </div>
        ) : filteredVirements.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun virement d&apos;espèces enregistré pour cette sélection.</p>
          </div>
        ) : (
          filteredVirements.map((v) => {
            const isAttente = v.statut === 'EN_ATTENTE';
            return (
              <motion.div
                key={v.id}
                layout
                className="glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`p-3 rounded-xl border flex-shrink-0 ${
                      isAttente
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {isAttente ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">{v.reference}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isAttente
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isAttente ? 'EN ATTENTE RÉCEPTION' : 'REÇU & ENCAISSÉ ADMIN'}
                      </span>
                    </div>

                    <p className="text-xs text-white font-semibold mt-1">
                      {v.pointDeVente.nom} • {v.utilisateur?.nom || 'Vendeur'}
                    </p>

                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(v.dateCloture)} {v.notes && `• ${v.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Montant Espèces Viré</p>
                    <p className="text-lg font-black text-amber-400">{formatCurrency(v.soldeReel)}</p>
                  </div>

                  {/* Admin action: Confirm receipt — confirmation inline (sans popup navigateur) */}
                  {isAdmin && isAttente && (
                    confirmingId === v.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-300 font-bold whitespace-nowrap">Confirmer réception ?</span>
                        <button
                          onClick={() => handleValiderReception(v.id)}
                          disabled={validatingId === v.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Oui</span>
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleValiderReception(v.id)}
                        disabled={validatingId === v.id}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{validatingId === v.id ? 'Validation...' : 'Valider Réception'}</span>
                      </button>
                    )
                  )}


                  <button
                    onClick={() => handlePrint(v)}
                    className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Imprimer décharge / reçu"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setVirementToDelete(v)}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors"
                      title="Supprimer définitivement ce virement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL: NOUVEAU VIREMENT D'ESPÈCES */}
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
              className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Virement d&apos;Espèces</h2>
                    <p className="text-xs text-slate-400">Transférer le cash boutique vers la caisse Admin</p>
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
                {/* Boutique */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Boutique Émettrice *</label>
                  {isVendeurOrRestricted ? (
                    <div className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-amber-300 font-bold flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-400" />
                      <span>{user?.pointVenteNom || 'Votre Boutique'}</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPdvId}
                      onChange={(e) => setSelectedPdvId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Sélectionner --</option>
                      {pointsDeVente.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom} ({p.codeBoutique})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Vendeur émetteur */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vendeur / Responsable *</label>
                  {isVendeurOrRestricted ? (
                    <div className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{user?.nom || 'Vous-même'}</span>
                    </div>
                  ) : (
                    <select
                      value={selectedVendeurId}
                      onChange={(e) => setSelectedVendeurId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Sélectionner --</option>
                      {vendeurs.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nom} ({v.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Info solde disponible */}
                {selectedPdvId && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Espèces disponibles en boutique :</span>
                    <span className="font-bold text-amber-400">{formatCurrency(soldeDisponibleBoutique)}</span>
                  </div>
                )}

                {/* Montant viré */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-amber-400">Montant en Espèces à Virer (GNF) *</label>
                    {soldeDisponibleBoutique > 0 && (
                      <button
                        type="button"
                        onClick={() => setMontant(String(soldeDisponibleBoutique))}
                        className="text-[11px] text-amber-400 underline hover:text-amber-300 font-bold"
                      >
                        Virer la totalité
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Motif / Notes / Réf. Bordereau</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Versement recettes de la journée..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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
                    disabled={submitting || !montant || parseFloat(montant) <= 0}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>Enregistrement...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirmer le Virement</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMATION SUPPRESSION VIREMENT */}
      <AnimatedModal
        isOpen={Boolean(virementToDelete)}
        onClose={() => !deletingVirement && setVirementToDelete(null)}
        title="Supprimer le Virement d'Espèces"
        subtitle={`Réf: ${virementToDelete?.reference || ''}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Attention : Annulation définitive</p>
              <p className="text-xs text-rose-200/90 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement le virement{' '}
                <strong className="text-white font-mono">{virementToDelete?.reference}</strong> ?
              </p>
              <ul className="text-xs text-slate-300 list-disc list-inside mt-2 space-y-1">
                <li>Boutique : <strong>{virementToDelete?.pointDeVente.nom}</strong></li>
                <li>Montant : <strong className="text-amber-400">{formatCurrency(virementToDelete?.soldeReel || 0)}</strong></li>
                <li>Statut : <strong className="uppercase">{virementToDelete?.statut}</strong></li>
                <li>Émetteur : <strong>{virementToDelete?.utilisateur?.nom || 'Vendeur'}</strong></li>
                <li className="text-slate-400">Ce versement sera retiré des totaux virés et réajustera la caisse.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={deletingVirement}
              onClick={() => setVirementToDelete(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={deletingVirement}
              onClick={handleConfirmDeleteVirement}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deletingVirement ? 'Suppression en cours...' : 'Oui, supprimer le virement'}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
