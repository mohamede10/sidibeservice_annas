'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Plus,
  Search,
  Package,
  Trash2,
  CheckCircle,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Store,
  User,
  Phone,
  MapPin,
  DollarSign,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface PointDeVente {
  id: number;
  nom: string;
  codeBoutique: string;
  ville?: string;
}

interface Fournisseur {
  id: number;
  nom: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
}

interface Variante {
  id: number;
  taille?: string;
  couleur?: string;
  reference?: string;
  prix: number;
  coutAchat: number;
}

interface ProduitAvecVariantes {
  id: number;
  nom: string;
  variantes: Variante[];
}

interface AchatLigne {
  id: number;
  produitNom?: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  variante?: {
    id: number;
    taille?: string;
    couleur?: string;
    produit?: { id: number; nom: string };
  };
}

interface Achat {
  id: number;
  reference?: string;
  dateAchat: string;
  fournisseurNom?: string;
  telephone?: string;
  adresse?: string;
  totalAchat: number;
  statut: string;
  pointDeVente?: PointDeVente;
  utilisateur?: { id: number; nom: string };
  lignes: AchatLigne[];
}

interface CartLigne {
  varianteId?: number;
  produitNom: string;
  varianteInfo: string;
  quantite: number;
  prixUnitaireGros: number;
  prixVenteDetail: number;
}

export default function AchatsPage() {
  const { user, activePointVenteId } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [achats, setAchats] = useState<Achat[]>([]);
  const [pointsDeVente, setPointsDeVente] = useState<PointDeVente[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [produits, setProduits] = useState<ProduitAvecVariantes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPointVente, setFilterPointVente] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // New achat modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState('');
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [fournisseurTelephone, setFournisseurTelephone] = useState('');
  const [fournisseurAdresse, setFournisseurAdresse] = useState('');
  const [fournisseurVille, setFournisseurVille] = useState('');
  const [pointDeVenteId, setPointDeVenteId] = useState('');
  const [fraisTransport, setFraisTransport] = useState('');
  const [cartLignes, setCartLignes] = useState<CartLigne[]>([]);
  const [produitSearch, setProduitSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manual line (if product not in catalog)
  const [manualNom, setManualNom] = useState('');
  const [manualQte, setManualQte] = useState('');
  const [manualPrixGros, setManualPrixGros] = useState('');
  const [manualPrixDetail, setManualPrixDetail] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = filterPointVente ? `?pointVenteId=${filterPointVente}` : '';
      const res = await fetch(`/api/achats${params}`);
      const json = await res.json();
      if (json.success) {
        setAchats(json.achats || []);
        setPointsDeVente(json.pointsDeVente || []);
        setFournisseurs(json.fournisseurs || []);
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

  useEffect(() => {
    if (pointsDeVente.length > 0 && !pointDeVenteId) {
      const myPdv = user?.pointVenteId || activePointVenteId;
      setPointDeVenteId(myPdv ? String(myPdv) : String(pointsDeVente[0].id));
    }
  }, [pointsDeVente, user]);

  const handleSelectFournisseur = (id: string) => {
    setSelectedFournisseur(id);
    const f = fournisseurs.find((x) => x.id === parseInt(id));
    if (f) {
      setFournisseurNom(f.nom);
      setFournisseurTelephone(f.telephone || '');
      setFournisseurAdresse(f.adresse || '');
      setFournisseurVille(f.ville || '');
    }
  };

  const addProduitToCart = (produit: ProduitAvecVariantes, variante: Variante) => {
    setCartLignes((prev) => {
      const existing = prev.find((l) => l.varianteId === variante.id);
      if (existing) {
        return prev.map((l) =>
          l.varianteId === variante.id ? { ...l, quantite: l.quantite + 1 } : l
        );
      }
      return [
        ...prev,
        {
          varianteId: variante.id,
          produitNom: produit.nom,
          varianteInfo: `${variante.taille || ''} / ${variante.couleur || ''}`.trim(),
          quantite: 1,
          prixUnitaireGros: variante.coutAchat || 0,
          prixVenteDetail: variante.prix || 0,
        },
      ];
    });
    setProduitSearch('');
  };

  const addManualLine = () => {
    if (!manualNom || !manualQte || !manualPrixGros) {
      showWarning('Renseignez le nom, la quantité et le prix de gros.');
      return;
    }
    setCartLignes((prev) => [
      ...prev,
      {
        produitNom: manualNom,
        varianteInfo: 'Saisie manuelle',
        quantite: parseInt(manualQte),
        prixUnitaireGros: parseFloat(manualPrixGros),
        prixVenteDetail: parseFloat(manualPrixDetail) || 0,
      },
    ]);
    setManualNom('');
    setManualQte('');
    setManualPrixGros('');
    setManualPrixDetail('');
  };

  const updateCartLine = (index: number, field: keyof CartLigne, value: string | number) => {
    setCartLignes((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } : l
      )
    );
  };

  const removeLine = (index: number) => {
    setCartLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const totalGros = cartLignes.reduce((s, l) => s + l.prixUnitaireGros * l.quantite, 0);
  const totalTransport = parseFloat(fraisTransport) || 0;
  const totalGeneral = totalGros + totalTransport;

  const handleSubmitAchat = async () => {
    if (cartLignes.length === 0 || !pointDeVenteId) {
      showWarning('Ajoutez des articles et sélectionnez la boutique.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/achats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fournisseurId: selectedFournisseur || null,
          fournisseurNom,
          fournisseurTelephone,
          fournisseurAdresse,
          fournisseurVille,
          pointDeVenteId,
          utilisateurId: user?.id,
          fraisTransport: fraisTransport || '0',
          lignes: cartLignes.map((l) => ({
            varianteId: l.varianteId || null,
            produitNom: l.produitNom,
            quantite: l.quantite,
            prixUnitaireGros: l.prixUnitaireGros,
            prixVenteDetail: l.prixVenteDetail,
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
        resetForm();
        fetchData();
        showSuccess('L\'achat a été enregistré et le stock mis à jour.', 'Achat créé');
      } else {
        showError(json.error || 'Erreur lors de l\'enregistrement', 'Erreur achat');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCartLignes([]);
    setFournisseurNom('');
    setFournisseurTelephone('');
    setFournisseurAdresse('');
    setFournisseurVille('');
    setSelectedFournisseur('');
    setFraisTransport('');
  };

  const filteredAchats = achats.filter(
    (a) =>
      (a.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.fournisseurNom || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProduits = produits.filter((p) =>
    p.nom.toLowerCase().includes(produitSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Truck className="w-6 h-6" />
            </span>
            Achats Fournisseurs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enregistrement des approvisionnements avec prix de gros et prix de vente détail.
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
            Nouvel Achat
          </motion.button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Achats</p>
          <p className="text-xl font-black text-amber-400 mt-1">{achats.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Valeur Totale</p>
          <p className="text-xl font-black text-white mt-1">
            {formatCurrency(achats.reduce((s, a) => s + a.totalAchat, 0))}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Fournisseurs</p>
          <p className="text-xl font-black text-sky-400 mt-1">{fournisseurs.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Dernier Achat</p>
          <p className="text-sm font-bold text-slate-300 mt-1">
            {achats[0] ? new Date(achats[0].dateAchat).toLocaleDateString('fr-FR') : '—'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence ou fournisseur..."
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

      {/* Achats List */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            Chargement des achats...
          </div>
        ) : filteredAchats.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 border border-slate-800">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun achat fournisseur enregistré.</p>
          </div>
        ) : (
          filteredAchats.map((a) => (
            <motion.div
              key={a.id}
              layout
              className="glass-panel rounded-2xl border border-slate-800 overflow-hidden"
            >
              <div
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/20"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-amber-400 font-bold">{a.reference || 'N/A'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {a.statut}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
                      {a.fournisseurNom && (
                        <span className="font-semibold text-white">{a.fournisseurNom}</span>
                      )}
                      {a.pointDeVente && (
                        <>
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-300">{a.pointDeVente.nom}</span>
                        </>
                      )}
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {new Date(a.dateAchat).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{a.lignes.length} article(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-lg font-black text-amber-400">{formatCurrency(a.totalAchat)}</span>
                  {expandedId === a.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === a.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800 p-4 space-y-3"
                  >
                    {/* Fournisseur details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {a.fournisseurNom && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <User className="w-3 h-3" /> {a.fournisseurNom}
                        </div>
                      )}
                      {a.telephone && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3" /> {a.telephone}
                        </div>
                      )}
                      {a.adresse && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3 h-3" /> {a.adresse}
                        </div>
                      )}
                    </div>

                    {/* Lines table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="text-left py-2 px-2">Produit</th>
                            <th className="text-right py-2 px-2">Qté</th>
                            <th className="text-right py-2 px-2">Prix Gros (U)</th>
                            <th className="text-right py-2 px-2">Total Ligne</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.lignes.map((l) => (
                            <tr key={l.id} className="border-b border-slate-800/50">
                              <td className="py-2 px-2 text-white font-semibold">
                                {l.variante?.produit?.nom || l.produitNom || 'N/A'}
                                {l.variante && (
                                  <span className="text-slate-400 ml-1">
                                    ({l.variante.taille} / {l.variante.couleur})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right text-slate-300">{l.quantite}</td>
                              <td className="py-2 px-2 text-right text-slate-300">
                                {formatCurrency(l.prixUnitaire)}
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-amber-400">
                                {formatCurrency(l.totalLigne)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-700">
                            <td colSpan={3} className="py-2 px-2 text-right font-bold text-white">
                              TOTAL
                            </td>
                            <td className="py-2 px-2 text-right font-black text-amber-400">
                              {formatCurrency(a.totalAchat)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* MODAL NEW PURCHASE */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10 my-8"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Nouvel Achat Fournisseur</h2>
                    <p className="text-xs text-slate-400">Approvisionner le stock depuis un fournisseur</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
                {/* Fournisseur */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Informations Fournisseur
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Fournisseur existant</label>
                      <select
                        value={selectedFournisseur}
                        onChange={(e) => handleSelectFournisseur(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="">-- Nouveau fournisseur --</option>
                        {fournisseurs.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nom du Fournisseur *</label>
                      <input
                        type="text"
                        value={fournisseurNom}
                        onChange={(e) => setFournisseurNom(e.target.value)}
                        placeholder="Ex: Ets Diallo Import"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={fournisseurTelephone}
                        onChange={(e) => setFournisseurTelephone(e.target.value)}
                        placeholder="6XX XX XX XX"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Adresse</label>
                      <input
                        type="text"
                        value={fournisseurAdresse}
                        onChange={(e) => setFournisseurAdresse(e.target.value)}
                        placeholder="Marché, Quartier..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Boutique destination + Transport */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" /> Boutique Destination *
                    </label>
                    <select
                      value={pointDeVenteId}
                      onChange={(e) => setPointDeVenteId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      {pointsDeVente.map((pdv) => (
                        <option key={pdv.id} value={pdv.id}>
                          {pdv.nom} ({pdv.codeBoutique})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Frais de Transport (GNF)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fraisTransport}
                      onChange={(e) => setFraisTransport(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* Sélection produits du catalogue */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Ajouter des articles depuis le catalogue
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit..."
                      value={produitSearch}
                      onChange={(e) => setProduitSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  {produitSearch.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredProduits.slice(0, 15).map((p) =>
                        p.variantes.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => addProduitToCart(p, v)}
                            className="w-full text-left px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-emerald-400/50 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-white">{p.nom}</span>
                              <span className="text-slate-400 ml-1">
                                {v.taille} / {v.couleur}
                              </span>
                            </div>
                            <span className="text-slate-400">
                              Gros: {formatCurrency(v.coutAchat)} | Détail: {formatCurrency(v.prix)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Manual line entry */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Ou ajouter un article manuellement
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Nom produit"
                      value={manualNom}
                      onChange={(e) => setManualNom(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Quantité"
                      value={manualQte}
                      onChange={(e) => setManualQte(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Prix Gros (U)"
                      value={manualPrixGros}
                      onChange={(e) => setManualPrixGros(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Prix Détail (U)"
                      value={manualPrixDetail}
                      onChange={(e) => setManualPrixDetail(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <button
                    onClick={addManualLine}
                    disabled={!manualNom || !manualQte || !manualPrixGros}
                    className="px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    Ajouter
                  </button>
                </div>

                {/* Cart / Articles list */}
                {cartLignes.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Articles achetés ({cartLignes.length}) :
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-amber-500/30 text-amber-300/70">
                            <th className="text-left py-1.5 px-1">Produit</th>
                            <th className="text-right py-1.5 px-1 w-16">Qté</th>
                            <th className="text-right py-1.5 px-1">Gros (U)</th>
                            <th className="text-right py-1.5 px-1">Détail (U)</th>
                            <th className="text-right py-1.5 px-1">Total</th>
                            <th className="py-1.5 px-1 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartLignes.map((l, idx) => (
                            <tr key={idx} className="border-b border-slate-800/50">
                              <td className="py-1.5 px-1 text-white font-semibold">
                                {l.produitNom}
                                <span className="text-slate-400 ml-1 text-[10px]">{l.varianteInfo}</span>
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={l.quantite}
                                  onChange={(e) => updateCartLine(idx, 'quantite', e.target.value)}
                                  className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white text-right focus:outline-none focus:border-amber-400"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={l.prixUnitaireGros}
                                  onChange={(e) => updateCartLine(idx, 'prixUnitaireGros', e.target.value)}
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white text-right focus:outline-none focus:border-amber-400"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={l.prixVenteDetail}
                                  onChange={(e) => updateCartLine(idx, 'prixVenteDetail', e.target.value)}
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-emerald-400 text-right focus:outline-none focus:border-emerald-400"
                                />
                              </td>
                              <td className="py-1.5 px-1 text-right font-bold text-amber-400">
                                {formatCurrency(l.prixUnitaireGros * l.quantite)}
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <button
                                  onClick={() => removeLine(idx)}
                                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="pt-3 border-t border-amber-500/30 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Sous-total Articles :</span>
                        <span className="font-bold">{formatCurrency(totalGros)}</span>
                      </div>
                      {totalTransport > 0 && (
                        <div className="flex justify-between text-sky-300">
                          <span>Frais de Transport :</span>
                          <span className="font-bold">{formatCurrency(totalTransport)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white text-sm font-black pt-1 border-t border-slate-700">
                        <span>TOTAL ACHAT :</span>
                        <span className="text-amber-400">{formatCurrency(totalGeneral)}</span>
                      </div>
                    </div>
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
                    disabled={submitting || cartLignes.length === 0 || !pointDeVenteId}
                    onClick={handleSubmitAchat}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>Enregistrement...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Enregistrer l&apos;Achat</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
