'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Phone,
  MapPin,
  User,
  FileText,
  MessageCircle,
  AlertTriangle,
  Store,
  Tag,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { downloadInvoicePdf, sendInvoiceViaWhatsApp, InvoiceData } from '@/lib/invoicePdf';

interface LigneCommande {
  id: number;
  nomProduit: string;
  varianteInfo?: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  produit?: {
    id: number;
    nom: string;
    imageUrl?: string;
  };
  variante?: {
    id: number;
    taille?: string;
    couleur?: string;
    prix: number;
  };
}

interface Commande {
  id: number;
  reference: string;
  dateVente: string;
  nomClient?: string;
  telephoneClient?: string;
  total: number;
  montantPaye: number;
  montantRestant: number;
  modePaiement: string;
  statutPaiement: string;
  typeVente: string;
  pointVenteNom?: string;
  notes?: string;
  pointVente?: {
    id: number;
    nom: string;
    ville?: string;
  };
  client?: {
    nom: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
  };
  lignes: LigneCommande[];
  factures: { numeroFacture: string }[];
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  EN_ATTENTE: {
    label: 'En attente',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: Clock,
  },
  PAYE: {
    label: 'Validée',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  ANNULEE: {
    label: 'Annulée',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    icon: XCircle,
  },
  IMPAYE: {
    label: 'Non réglée',
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    icon: AlertTriangle,
  },
};

function parseNotes(notes?: string) {
  if (!notes) return {};
  const result: Record<string, string> = {};
  const parts = notes.split(' | ');
  for (const part of parts) {
    if (part.includes('Livraison:')) result.livraison = part.replace('Livraison:', '').trim();
    if (part.includes('Ville:')) result.ville = part.replace('Ville:', '').trim();
    if (part.includes('Adresse:')) result.adresse = part.replace('Adresse:', '').trim();
    if (part.includes('Paiement souhaité:')) result.paiement = part.replace('Paiement souhaité:', '').trim();
    if (part.includes('Précisions client:')) result.precision = part.replace('Précisions client:', '').trim();
  }
  return result;
}

export default function CommandesPage() {
  const { isAdmin, isGerant } = useAuth();
  const { showSuccess, showError } = useToast();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('EN_ATTENTE');
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ commande: Commande; action: 'VALIDER' | 'ANNULER' } | null>(null);
  const [processing, setProcessing] = useState(false);

  const canManage = isAdmin || isGerant;

  const fetchCommandes = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/boutique/commande?statut=${statutFilter}&all=${statutFilter === '' ? '1' : '0'}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const filtered = searchTerm
          ? json.commandes.filter((c: Commande) =>
              c.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (c.nomClient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (c.telephoneClient || '').includes(searchTerm)
            )
          : json.commandes;
        setCommandes(filtered);
      } else {
        showError(json.error || 'Erreur chargement commandes', 'Erreur');
      }
    } catch {
      showError('Erreur réseau lors du chargement', 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [statutFilter, searchTerm, showError]);

  useEffect(() => {
    fetchCommandes();
  }, [statutFilter]);

  const handleAction = async () => {
    if (!actionConfirm) return;
    try {
      setProcessing(true);
      const res = await fetch('/api/boutique/commande/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandeId: actionConfirm.commande.id,
          action: actionConfirm.action,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showSuccess(data.message, actionConfirm.action === 'VALIDER' ? 'Commande Validée ✓' : 'Commande Annulée');

        // Génération automatique du PDF si validation
        if (actionConfirm.action === 'VALIDER' && data.invoiceData) {
          try {
            downloadInvoicePdf(data.invoiceData as InvoiceData);
          } catch (e) {
            console.error('Erreur génération PDF:', e);
          }
        }

        setActionConfirm(null);
        setSelectedCommande(null);
        fetchCommandes();
      } else {
        showError(data.error || 'Erreur lors du traitement', 'Erreur');
      }
    } catch {
      showError('Erreur réseau lors du traitement', 'Erreur réseau');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = (commande: Commande) => {
    const notes = parseNotes(commande.notes);
    const inv: InvoiceData = {
      numeroFacture: commande.factures?.[0]?.numeroFacture || `FAC-${commande.reference}`,
      referenceVente: commande.reference,
      dateFacture: commande.dateVente,
      boutique: {
        nom: commande.pointVente?.nom || commande.pointVenteNom || 'Sidibe Services',
        ville: commande.pointVente?.ville || notes.ville || 'Kankan',
        adresse: 'Centre Commercial',
        telephone: '+224 622 48 81 61',
      },
      client: {
        nom: commande.client?.nom || commande.nomClient || 'Client',
        telephone: commande.client?.telephone || commande.telephoneClient || '',
        adresse: commande.client?.adresse || notes.adresse || notes.ville || 'Kankan',
      },
      lignes: commande.lignes.map((l) => ({
        designation: l.nomProduit,
        varianteInfo: l.varianteInfo,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        totalLigne: l.totalLigne,
      })),
      total: commande.total,
      montantPaye: commande.montantPaye,
      montantRestant: commande.montantRestant,
      modePaiement: commande.modePaiement,
    };
    downloadInvoicePdf(inv);
  };

  const handleWhatsAppPdf = async (commande: Commande) => {
    const notes = parseNotes(commande.notes);
    const inv: InvoiceData = {
      numeroFacture: commande.factures?.[0]?.numeroFacture || `FAC-${commande.reference}`,
      referenceVente: commande.reference,
      dateFacture: commande.dateVente,
      boutique: {
        nom: commande.pointVente?.nom || commande.pointVenteNom || 'Sidibe Services',
        ville: commande.pointVente?.ville || notes.ville || 'Kankan',
        adresse: 'Centre Commercial',
        telephone: '+224 622 48 81 61',
      },
      client: {
        nom: commande.client?.nom || commande.nomClient || 'Client',
        telephone: commande.client?.telephone || commande.telephoneClient || '',
        adresse: commande.client?.adresse || notes.adresse || 'Kankan',
      },
      lignes: commande.lignes.map((l) => ({
        designation: l.nomProduit,
        varianteInfo: l.varianteInfo,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        totalLigne: l.totalLigne,
      })),
      total: commande.total,
      montantPaye: commande.montantPaye,
      montantRestant: commande.montantRestant,
      modePaiement: commande.modePaiement,
    };
    await sendInvoiceViaWhatsApp(inv);
  };

  const nbEnAttente = commandes.filter(c => c.statutPaiement === 'EN_ATTENTE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShoppingBag className="w-6 h-6" />
            </span>
            Commandes Boutique En Ligne
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Validation et suivi des commandes passées depuis la boutique vitrine.
          </p>
        </div>
        <button
          onClick={fetchCommandes}
          className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En attente', value: commandes.filter(c => c.statutPaiement === 'EN_ATTENTE').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Validées', value: commandes.filter(c => c.statutPaiement === 'PAYE').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Annulées', value: commandes.filter(c => c.statutPaiement === 'ANNULEE').length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Total (affiché)', value: commandes.length, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Référence, nom du client, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCommandes()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {[
            { id: 'EN_ATTENTE', label: '🕐 En attente' },
            { id: 'PAYE', label: '✓ Validées' },
            { id: 'ANNULEE', label: '✗ Annulées' },
            { id: '', label: '📋 Toutes' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatutFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statutFilter === s.id
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Boutique</th>
                <th className="px-5 py-4">Articles</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Aucune commande trouvée pour ce filtre.
                  </td>
                </tr>
              ) : (
                commandes.map((cmd) => {
                  const cfg = STATUT_CONFIG[cmd.statutPaiement] || STATUT_CONFIG.IMPAYE;
                  const StatutIcon = cfg.icon;
                  const notes = parseNotes(cmd.notes);
                  return (
                    <motion.tr
                      key={cmd.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-white text-xs">
                        {cmd.reference}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white text-sm">{cmd.nomClient || cmd.client?.nom || 'Inconnu'}</p>
                        <p className="text-xs text-slate-500">{cmd.telephoneClient || cmd.client?.telephone}</p>
                        {notes.ville && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {notes.ville}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {cmd.pointVente?.nom || cmd.pointVenteNom || '-'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300">
                        <span className="font-bold text-sky-400">{cmd.lignes.length}</span> article{cmd.lignes.length > 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {formatDate(cmd.dateVente)}
                      </td>
                      <td className="px-5 py-4 font-black text-amber-400">
                        {formatCurrency(cmd.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          <StatutIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCommande(cmd)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-sky-400 hover:border-sky-400 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                            title="Voir détail commande"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir</span>
                          </button>
                          {canManage && cmd.statutPaiement === 'EN_ATTENTE' && (
                            <>
                              <button
                                onClick={() => setActionConfirm({ commande: cmd, action: 'VALIDER' })}
                                className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                                title="Valider cette commande"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>
                              <button
                                onClick={() => setActionConfirm({ commande: cmd, action: 'ANNULER' })}
                                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                                title="Annuler cette commande"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Refuser</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DÉTAIL COMMANDE */}
      <AnimatedModal
        isOpen={Boolean(selectedCommande)}
        onClose={() => setSelectedCommande(null)}
        title="Détail de la Commande"
        subtitle={selectedCommande?.reference}
      >
        {selectedCommande && (() => {
          const notes = parseNotes(selectedCommande.notes);
          const cfg = STATUT_CONFIG[selectedCommande.statutPaiement] || STATUT_CONFIG.IMPAYE;
          const StatutIcon = cfg.icon;
          return (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                <StatutIcon className={`w-5 h-5 ${cfg.color}`} />
                <div>
                  <p className={`text-sm font-black ${cfg.color}`}>Commande {cfg.label}</p>
                  <p className="text-xs text-slate-400">{formatDate(selectedCommande.dateVente)}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-lg font-black text-amber-400">{formatCurrency(selectedCommande.total)}</p>
                </div>
              </div>

              {/* Client & Livraison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Informations Client
                  </p>
                  <p className="text-sm font-bold text-white">{selectedCommande.client?.nom || selectedCommande.nomClient}</p>
                  {(selectedCommande.telephoneClient || selectedCommande.client?.telephone) && (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {selectedCommande.client?.telephone || selectedCommande.telephoneClient}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Livraison & Paiement
                  </p>
                  {notes.livraison && <p className="text-xs text-white">{notes.livraison}</p>}
                  {notes.ville && (
                    <p className="text-xs text-slate-300">Ville : <strong>{notes.ville}</strong></p>
                  )}
                  {notes.adresse && (
                    <p className="text-xs text-slate-300">Adresse : <strong>{notes.adresse}</strong></p>
                  )}
                  {notes.paiement && (
                    <p className="text-xs text-slate-300">Paiement : <strong>{notes.paiement}</strong></p>
                  )}
                </div>
              </div>

              {/* Boutique concernée */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <Store className="w-4 h-4 text-sky-400" />
                <div>
                  <p className="text-xs text-slate-400">Boutique assignée</p>
                  <p className="text-sm font-bold text-white">
                    {selectedCommande.pointVente?.nom || selectedCommande.pointVenteNom || 'Non définie'}
                  </p>
                </div>
              </div>

              {/* Précisions client */}
              {notes.precision && (
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">
                  <p className="font-bold mb-1">Précisions du client :</p>
                  <p>{notes.precision}</p>
                </div>
              )}

              {/* Articles */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Articles commandés ({selectedCommande.lignes.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedCommande.lignes.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      {/* Image produit ou placeholder */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                        {l.produit?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.produit.imageUrl}
                            alt={l.nomProduit}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{l.nomProduit}</p>
                        {l.varianteInfo && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {l.varianteInfo}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-amber-400">{formatCurrency(l.totalLigne)}</p>
                        <p className="text-xs text-slate-500">Qté : {l.quantite} × {formatCurrency(l.prixUnitaire)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-300">TOTAL COMMANDE</span>
                <span className="text-xl font-black text-amber-400">{formatCurrency(selectedCommande.total)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                {/* PDF / WhatsApp disponibles */}
                <button
                  onClick={() => handleDownloadPdf(selectedCommande)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 hover:bg-amber-500/30 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleWhatsAppPdf(selectedCommande)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>

                {/* Actions validation si en attente */}
                {canManage && selectedCommande.statutPaiement === 'EN_ATTENTE' && (
                  <>
                    <button
                      onClick={() => {
                        setActionConfirm({ commande: selectedCommande, action: 'VALIDER' });
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Valider la Commande
                    </button>
                    <button
                      onClick={() => {
                        setActionConfirm({ commande: selectedCommande, action: 'ANNULER' });
                      }}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Refuser / Annuler
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedCommande(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          );
        })()}
      </AnimatedModal>

      {/* MODAL CONFIRMATION ACTION */}
      <AnimatePresence>
        {actionConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !processing && setActionConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-5"
            >
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                actionConfirm.action === 'VALIDER'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                {actionConfirm.action === 'VALIDER' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-black text-white">
                    {actionConfirm.action === 'VALIDER' ? 'Valider la Commande' : 'Annuler / Refuser la Commande'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{actionConfirm.commande.reference}</p>
                </div>
              </div>

              <div className="text-sm text-slate-300 space-y-2">
                {actionConfirm.action === 'VALIDER' ? (
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                    <li>Les stocks seront <strong className="text-white">décrémentés</strong> pour chaque article.</li>
                    <li>Une <strong className="text-white">facture officielle</strong> sera générée et téléchargée automatiquement.</li>
                    <li>La vente sera enregistrée dans l&apos;historique avec statut <strong className="text-emerald-400">Payé</strong>.</li>
                    <li>Client : <strong className="text-white">{actionConfirm.commande.nomClient}</strong> — Total : <strong className="text-amber-400">{formatCurrency(actionConfirm.commande.total)}</strong></li>
                  </ul>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                    <li>La commande sera marquée <strong className="text-rose-400">Annulée</strong>.</li>
                    <li>Le stock <strong className="text-white">reste inchangé</strong> (aucune décrémentation).</li>
                    <li>Aucune facture ne sera émise.</li>
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  disabled={processing}
                  onClick={() => setActionConfirm(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  disabled={processing}
                  onClick={handleAction}
                  className={`px-6 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 ${
                    actionConfirm.action === 'VALIDER'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {processing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : actionConfirm.action === 'VALIDER' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {processing
                    ? 'Traitement...'
                    : actionConfirm.action === 'VALIDER'
                    ? 'Confirmer la Validation'
                    : 'Confirmer l\'Annulation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notice si pas admin */}
      {!canManage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Seuls les administrateurs et gérants peuvent valider ou annuler des commandes.
        </div>
      )}
    </div>
  );
}

