'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Package,
  Trash2,
  CheckCircle,
  Clock,
  Store,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface PointDeVente {
  id: number;
  nom: string;
  codeBoutique?: string;
  ville?: string;
}

interface Variante {
  id: number;
  taille?: string;
  couleur?: string;
  reference?: string;
  prix: number;
  stocksParPoint?: Array<{ pointDeVenteId: number; quantite: number }>;
}

interface ProduitAvecVariantes {
  id: number;
  nom: string;
  imageUrl?: string;
  variantes: Variante[];
}

interface TransfertLigne {
  id: number;
  nomArticle: string;
  quantite: number;
  variante?: {
    id: number;
    taille?: string;
    couleur?: string;
    produit?: { id: number; nom: string; imageUrl?: string };
  };
}

interface Transfert {
  id: number;
  reference: string;
  dateTransfert: string;
  statut: string;
  notes?: string;
  pointOrigine: PointDeVente;
  pointDestination: PointDeVente;
  initiePar?: { id: number; nom: string; role: string };
  lignes: TransfertLigne[];
}

interface CartLigne {
  varianteId: number;
  produitNom: string;
  varianteInfo: string;
  nomArticle: string;
  quantite: number;
  stockDispo: number;
}

export default function TransfertsPage() {
  const { user, isAdmin, isGerant, activePointVenteId } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [pointsDeVente, setPointsDeVente] = useState<PointDeVente[]>([]);
  const [produits, setProduits] = useState<ProduitAvecVariantes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPointVente, setFilterPointVente] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // New transfer modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [origineId, setOrigineId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [cartLignes, setCartLignes] = useState<CartLigne[]>([]);
  const [produitSearch, setProduitSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = filterPointVente ? `?pointVenteId=${filterPointVente}` : '';
      const res = await fetch(`/api/transferts${params}`);
      const json = await res.json();
      if (json.success) {
        setTransferts(json.transferts || []);
        setPointsDeVente(json.pointsDeVente || []);
        setProduits(json.produits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPointVente]);

  // Default origin to user's point de vente
  useEffect(() => {
    if (pointsDeVente.length > 0 && !origineId) {
      const myPdvId = user?.pointVenteId || activePointVenteId;
      if (myPdvId) {
        setOrigineId(String(myPdvId));
      } else {
        setOrigineId(String(pointsDeVente[0].id));
      }
    }
  }, [pointsDeVente, user]);

  const getStockDispo = (variante: Variante, pdvId: number) => {
    return variante.stocksParPoint?.find((s) => s.pointDeVenteId === pdvId)?.quantite ?? 0;
  };

  const addToCart = (produit: ProduitAvecVariantes, variante: Variante) => {
    if (!origineId) return;
    const stockDispo = getStockDispo(variante, parseInt(origineId));
    if (stockDispo <= 0) {
      showWarning('Stock insuffisant dans cette boutique pour cet article.');
      return;
    }
    const nomArticle = `${produit.nom} - ${variante.taille || ''} ${variante.couleur || ''}`.trim();
    setCartLignes((prev) => {
      const existing = prev.find((l) => l.varianteId === variante.id);
      if (existing) {
        if (existing.quantite >= stockDispo) {
          showWarning(`Stock max atteint (${stockDispo} disponibles)`);
          return prev;
        }
        return prev.map((l) => (l.varianteId === variante.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [
        ...prev,
        {
          varianteId: variante.id,
          produitNom: produit.nom,
          varianteInfo: `${variante.taille || ''} / ${variante.couleur || ''}`.trim(),
          nomArticle,
          quantite: 1,
          stockDispo,
        },
      ];
    });
  };

  const updateQte = (varianteId: number, delta: number) => {
    setCartLignes((prev) =>
      prev
        .map((l) => {
          if (l.varianteId === varianteId) {
            const newQty = l.quantite + delta;
            if (newQty > l.stockDispo) {
              showWarning(`Stock max: ${l.stockDispo}`);
              return l;
            }
            return newQty > 0 ? { ...l, quantite: newQty } : null;
          }
          return l;
        })
        .filter(Boolean) as CartLigne[]
    );
  };

  const handleSubmitTransfert = async () => {
    if (!origineId || !destinationId || cartLignes.length === 0) {
      showWarning('Veuillez renseigner les boutiques et au moins un article.');
      return;
    }
    if (origineId === destinationId) {
      showWarning('La source et la destination doivent être différentes.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/transferts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointOrigineId: origineId,
          pointDestinationId: destinationId,
          notes,
          initieParId: user?.id,
          lignes: cartLignes.map((l) => ({
            varianteId: l.varianteId,
            nomArticle: l.nomArticle,
            quantite: l.quantite,
          })),
        }),
      });
      let json: { success?: boolean; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        json = { success: false, error: 'Réponse serveur invalide ou délai d\'attente dépassé' };
      }
      if (json.success) {
        setIsModalOpen(false);
        setCartLignes([]);
        setNotes('');
        setDestinationId('');
        fetchData();
        showSuccess('Le transfert de stock a été enregistré.', 'Transfert effectué');
      } else {
        showError(json.error || 'Erreur lors du transfert', 'Erreur transfert');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = transferts.filter(
    (t) =>
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pointOrigine.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pointDestination.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProduits = produits.filter((p) =>
    p.nom.toLowerCase().includes(produitSearch.toLowerCase())
  );

  const statutBadge = (statut: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      EN_ATTENTE: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', label: 'En Attente' },
      EXPEDIE: { bg: 'bg-sky-500/15 border-sky-500/30', text: 'text-sky-400', label: 'Expédié' },
      VALIDE: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'Validé' },
      REFUSE: { bg: 'bg-rose-500/15 border-rose-500/30', text: 'text-rose-400', label: 'Refusé' },
    };
    const s = map[statut] || map['EN_ATTENTE'];
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ArrowLeftRight className="w-6 h-6" />
            </span>
            Transferts Inter-Boutiques
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Transférer des stocks d&apos;une boutique à une autre avec traçabilité complète.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nouveau Transfert
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence ou boutique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
          <select
            value={filterPointVente}
            onChange={(e) => setFilterPointVente(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value="">Toutes les Boutiques</option>
            {pointsDeVente.map((pdv) => (
              <option key={pdv.id} value={pdv.id}>
                {pdv.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transferts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            Chargement des transferts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun transfert trouvé.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="glass-panel rounded-2xl border border-slate-800 overflow-hidden"
            >
              {/* Row Header */}
              <div
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/20"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex-shrink-0">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-amber-400 font-bold">{t.reference}</span>
                      {statutBadge(t.statut)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
                      <span className="font-semibold text-white">{t.pointOrigine.nom}</span>
                      <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-white">{t.pointDestination.nom}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {new Date(t.dateTransfert).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{t.lignes.length} article(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.initiePar && (
                    <span className="text-xs text-slate-500 hidden sm:inline">par {t.initiePar.nom}</span>
                  )}
                  {expandedId === t.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedId === t.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800 p-4 space-y-3"
                  >
                    {t.notes && (
                      <p className="text-xs text-slate-400 italic">📝 {t.notes}</p>
                    )}
                    <div className="space-y-2">
                      {t.lignes.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{l.nomArticle}</p>
                              {l.variante && (
                                <p className="text-slate-500 text-[11px]">
                                  {l.variante.taille} / {l.variante.couleur}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-amber-400 text-sm">{l.quantite} u.</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* MODAL: NEW TRANSFER */}
      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouveau Transfert de Stock"
        subtitle="Déplacer des articles entre boutiques"
      >
        <div className="space-y-5">
          {/* Source & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Boutique Source (Expéditeur)
              </label>
              <select
                value={origineId}
                onChange={(e) => {
                  setOrigineId(e.target.value);
                  setCartLignes([]);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Choisir source --</option>
                {pointsDeVente.map((pdv) => (
                  <option key={pdv.id} value={pdv.id}>
                    {pdv.nom} {pdv.ville ? `(${pdv.ville})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Boutique Destination (Récepteur)
              </label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              >
                <option value="">-- Choisir destination --</option>
                {pointsDeVente
                  .filter((p) => String(p.id) !== origineId)
                  .map((pdv) => (
                    <option key={pdv.id} value={pdv.id}>
                      {pdv.nom} {pdv.ville ? `(${pdv.ville})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Product search & add */}
          {origineId && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Sélectionner les articles à transférer :
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={produitSearch}
                  onChange={(e) => setProduitSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredProduits.slice(0, 20).map((p) =>
                  p.variantes.map((v) => {
                    const dispo = getStockDispo(v, parseInt(origineId));
                    return (
                      <button
                        key={v.id}
                        onClick={() => addToCart(p, v)}
                        disabled={dispo <= 0}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all ${dispo > 0
                            ? 'bg-slate-800/80 border-slate-700 hover:border-amber-400/50 hover:bg-slate-800'
                            : 'bg-slate-900/50 border-slate-800/50 opacity-40 cursor-not-allowed'
                          }`}
                      >
                        <div>
                          <span className="font-semibold text-white">{p.nom}</span>
                          <span className="text-slate-400 ml-1.5">
                            {v.taille} / {v.couleur}
                          </span>
                        </div>
                        <span
                          className={`font-bold ${dispo <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}
                        >
                          {dispo} dispo
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Cart */}
          {cartLignes.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Articles à transférer ({cartLignes.length}) :
              </p>
              {cartLignes.map((l) => (
                <div
                  key={l.varianteId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{l.produitNom}</p>
                    <p className="text-slate-400">{l.varianteInfo} • max: {l.stockDispo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQte(l.varianteId, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-black text-amber-400 w-6 text-center">{l.quantite}</span>
                    <button
                      onClick={() => updateQte(l.varianteId, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setCartLignes((prev) => prev.filter((x) => x.varianteId !== l.varianteId))}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Notes / Motif du transfert (Facultatif) :
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Réappro urgente pour commande client..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Recap */}
          {origineId && destinationId && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Store className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">
                  {pointsDeVente.find((p) => String(p.id) === origineId)?.nom}
                </span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
                <span className="font-bold text-white">
                  {pointsDeVente.find((p) => String(p.id) === destinationId)?.nom}
                </span>
              </div>
              <span className="font-black text-amber-400">{cartLignes.length} article(s)</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Annuler
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={submitting || cartLignes.length === 0 || !origineId || !destinationId}
              onClick={handleSubmitTransfert}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Transfert en cours...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Valider le Transfert</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
