'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Filter,
  RefreshCw,
  Calendar,
  User,
  CreditCard,
  FileText,
  Store,
  Lock,
  MessageCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  sendInvoiceViaWhatsApp,
  downloadInvoicePdf,
  printInvoice,
  InvoiceData,
} from '@/lib/invoicePdf';

interface Vente {
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
  pointVenteNom?: string;
  pointVente?: {
    id: number;
    nom: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    codeBoutique?: string;
  };
  client?: {
    nom: string;
    telephone?: string;
    adresse?: string;
    email?: string;
    ville?: string;
  };
  vendeur?: {
    id: number;
    nom: string;
  };
  lignes: Array<{
    id: number;
    nomProduit: string;
    varianteInfo?: string;
    quantite: number;
    prixUnitaire: number;
    totalLigne: number;
  }>;
  factures: Array<{
    numeroFacture: string;
  }>;
}

interface BoutiqueItem {
  id: number;
  nom: string;
  ville: string;
}

export default function VentesPage() {
  const { user, isAdmin, isGerant, isVendeur, activePointVenteId } = useAuth();
  const { showError, showSuccess } = useToast();

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [boutiquesList, setBoutiquesList] = useState<BoutiqueItem[]>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(
    isVendeur && user?.pointVenteId ? String(user.pointVenteId) : (activePointVenteId ? String(activePointVenteId) : '')
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [venteToDelete, setVenteToDelete] = useState<Vente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDeleteInvoice = isAdmin || isGerant;

  const handleConfirmDelete = async () => {
    if (!venteToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/ventes?id=${venteToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message || 'Facture supprimée avec succès.', 'Facture supprimée');
        setVentes((prev) => prev.filter((v) => v.id !== venteToDelete.id));
        if (selectedVente?.id === venteToDelete.id) {
          setSelectedVente(null);
        }
        setVenteToDelete(null);
      } else {
        showError(data.error || 'Erreur lors de la suppression de la facture.', 'Erreur');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de la suppression de la facture.', 'Erreur réseau');
    } finally {
      setDeleting(false);
    }
  };

  // Charger la liste des boutiques si admin
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
                ville: p.ville,
              }))
            );
          }
        })
        .catch(console.error);
    }
  }, [isAdmin]);

  const fetchVentes = async () => {
    try {
      setLoading(true);
      let url = `/api/ventes?q=${encodeURIComponent(searchTerm)}&statut=${statutFilter}`;

      if (isVendeur && user?.pointVenteId) {
        url += `&pointVenteId=${user.pointVenteId}`;
      } else if (isAdmin && selectedBoutiqueId) {
        url += `&pointVenteId=${selectedBoutiqueId}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setVentes(json.ventes || []);
      } else {
        showError(json.error || 'Impossible de charger les ventes.', 'Erreur ventes');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors du chargement des ventes.', 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentes();
  }, [statutFilter, selectedBoutiqueId, isVendeur, user?.pointVenteId]);

  const handlePrint = () => {
    if (selectedVente) {
      const inv = buildVenteInvoiceData(selectedVente);
      printInvoice(inv);
    } else {
      window.print();
    }
  };

  const buildVenteInvoiceData = (vente: Vente): InvoiceData => {
    const numFacture =
      vente.factures && vente.factures.length > 0
        ? vente.factures[0].numeroFacture
        : `FAC-${vente.reference.replace(/^VTE-/, '')}`;

    const bVille = vente.pointVente?.ville || 'Guinée';
    const bAdresse = vente.pointVente?.adresse || '';
    const bTel = vente.pointVente?.telephone || '+224 622 48 81 61';

    return {
      numeroFacture: numFacture,
      referenceVente: vente.reference,
      dateFacture: vente.dateVente,
      boutique: {
        nom: vente.pointVente?.nom || vente.pointVenteNom || 'Sidibe Services',
        ville: bVille,
        adresse: bAdresse,
        telephone: bTel,
        codeBoutique: vente.pointVente?.codeBoutique,
      },
      client: {
        nom: vente.client?.nom || vente.nomClient || 'Client Comptant',
        telephone: vente.client?.telephone || vente.telephoneClient,
        adresse: vente.client?.adresse || undefined,
        email: vente.client?.email || undefined,
        ville: vente.client?.ville || bVille,
      },
      lignes:
        vente.lignes && vente.lignes.length > 0
          ? vente.lignes.map((l) => ({
              designation: l.nomProduit,
              varianteInfo: l.varianteInfo,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              totalLigne: l.totalLigne,
            }))
          : [
              {
                designation: 'Achat divers',
                quantite: 1,
                prixUnitaire: vente.total,
                totalLigne: vente.total,
              },
            ],
      total: vente.total,
      montantPaye: vente.montantPaye,
      montantRestant: vente.montantRestant,
      modePaiement: vente.modePaiement,
      vendeurNom: vente.vendeur?.nom,
    };
  };

  const handleDownloadPdf = (vente: Vente) => {
    const inv = buildVenteInvoiceData(vente);
    downloadInvoicePdf(inv);
  };

  const handleWhatsAppPdf = async (vente: Vente) => {
    const inv = buildVenteInvoiceData(vente);
    await sendInvoiceViaWhatsApp(inv);
  };

  const totalMontantVentes = ventes.reduce((sum, v) => sum + v.total, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Receipt className="w-6 h-6" />
            </span>
            Historique des Ventes & Factures
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isVendeur
              ? `Factures et ventes exclusives de votre boutique (${user?.pointVenteNom || 'Ma Boutique'}).`
              : 'Consultation consolidée de toutes les factures et réimpression.'}
          </p>
        </div>

        <button
          onClick={fetchVentes}
          className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Boutique notice / filter */}
      {isVendeur ? (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Boutique Affectée : <strong className="text-amber-400 font-bold">{user?.pointVenteNom || 'Boutique Principale'}</strong>. Seules les factures enregistrées dans votre boutique sont affichées.
          </span>
        </div>
      ) : (
        isAdmin && (
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 font-semibold">Filtrer par Boutique :</span>
              <select
                value={selectedBoutiqueId}
                onChange={(e) => setSelectedBoutiqueId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                <option value="">🌟 Toutes les Boutiques (Global)</option>
                {boutiquesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏬 {b.nom} ({b.ville})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-400">
              Total affiché : <strong className="text-amber-400">{formatCurrency(totalMontantVentes)}</strong> ({ventes.length} facture{ventes.length > 1 ? 's' : ''})
            </div>
          </div>
        )
      )}

      {/* Filter and Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, nom de client ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVentes()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: '', label: 'Toutes les factures' },
            { id: 'PAYE', label: 'Payées' },
            { id: 'PARTIEL', label: 'Acomptes' },
            { id: 'IMPAYE', label: 'À Crédit' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatutFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statutFilter === s.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Réf. Facture / Vente</th>
                <th className="px-6 py-4">Client</th>
                {isAdmin && !selectedBoutiqueId && <th className="px-6 py-4">Boutique</th>}
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Règlement</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Facture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Chargement des ventes...
                  </td>
                </tr>
              ) : ventes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Aucune vente trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                ventes.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {v.reference}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {v.nomClient || v.client?.nom || 'Client Comptant'}
                    </td>
                    {isAdmin && !selectedBoutiqueId && (
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {v.pointVente?.nom || v.pointVenteNom || 'Boutique'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(v.dateVente)}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                      {v.modePaiement}
                    </td>
                    <td className="px-6 py-4 font-black text-amber-400">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedVente(v)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                          title="Visualiser et imprimer la facture"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir</span>
                        </button>
                        {canDeleteInvoice && (
                          <button
                            onClick={() => setVenteToDelete(v)}
                            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                            title="Supprimer cette facture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: FACTURE COMPLETE */}
      <AnimatedModal
        isOpen={Boolean(selectedVente)}
        onClose={() => setSelectedVente(null)}
        title="Facture de Vente"
        subtitle={`Facture N° ${selectedVente?.reference || ''}`}
      >
        <div className="space-y-4">
          <div id="printable-area" className="p-6 rounded-2xl bg-white text-slate-900 shadow-xl space-y-4">
            {/* Header avec Logo officiel */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="/img/logo.jpeg"
                  alt="Logo Sidibé Services"
                  className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shadow-sm"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-wide flex items-center gap-1.5">
                    SIDIBE <span className="text-amber-600">SERVICES</span>
                  </h2>
                  <p className="text-xs font-bold text-slate-700">
                    {selectedVente?.pointVente?.nom || selectedVente?.pointVenteNom || 'Boutique'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedVente?.pointVente?.adresse ? `${selectedVente.pointVente.adresse} • ` : ''}
                    {selectedVente?.pointVente?.ville || 'Guinée'} • Tél: {selectedVente?.pointVente?.telephone || '+224 622 48 81 61'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded font-black uppercase ${
                  (selectedVente?.montantRestant || 0) <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {(selectedVente?.montantRestant || 0) <= 0 ? 'FACTURE PAYÉE' : 'AVOIR / CRÉDIT'}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">{selectedVente?.reference}</p>
                <p className="text-[11px] text-slate-500">{formatDate(selectedVente?.dateVente)}</p>
              </div>
            </div>

            {/* Cartouches Vendeur et Client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Émise par (Boutique)</p>
                <p className="font-bold text-slate-900">{selectedVente?.pointVente?.nom || selectedVente?.pointVenteNom || 'Boutique'}</p>
                <p className="text-slate-600">Ville : <strong className="text-slate-900">{selectedVente?.pointVente?.ville || 'Guinée'}</strong></p>
                {selectedVente?.pointVente?.adresse && (
                  <p className="text-slate-600">Adresse : {selectedVente.pointVente.adresse}</p>
                )}
                <p className="text-slate-600">Tél : {selectedVente?.pointVente?.telephone || '+224 622 48 81 61'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client Facturé</p>
                <p className="font-bold text-slate-900">{selectedVente?.nomClient || selectedVente?.client?.nom || 'Client Comptant'}</p>
                <p className="text-slate-600">
                  Ville : <strong className="text-slate-900">{selectedVente?.client?.ville || selectedVente?.pointVente?.ville || 'Guinée'}</strong>
                </p>
                {selectedVente?.telephoneClient && (
                  <p className="text-slate-600">Tél : {selectedVente.telephoneClient}</p>
                )}
                {selectedVente?.client?.adresse && (
                  <p className="text-slate-600">Adresse : {selectedVente.client.adresse}</p>
                )}
              </div>
            </div>

            {/* Articles Table */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2 text-left">Désignation</th>
                  <th className="py-2 text-center">Qté</th>
                  <th className="py-2 text-right">Prix Unitaire</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedVente?.lignes?.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2">
                      <p className="font-bold text-slate-900">{l.nomProduit}</p>
                      {l.varianteInfo && (
                        <p className="text-[10px] text-slate-500">{l.varianteInfo}</p>
                      )}
                    </td>
                    <td className="py-2 text-center font-bold">{l.quantite}</td>
                    <td className="py-2 text-right">{formatCurrency(l.prixUnitaire)}</td>
                    <td className="py-2 text-right font-bold">{formatCurrency(l.totalLigne)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between font-black text-sm text-slate-900">
                <span>TOTAL FACTURE</span>
                <span>{formatCurrency(selectedVente?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Montant Réglé ({selectedVente?.modePaiement})</span>
                <span className="font-bold text-emerald-600">{formatCurrency(selectedVente?.montantPaye || 0)}</span>
              </div>
              {(selectedVente?.montantRestant || 0) > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Reste à Payer (Créance)</span>
                  <span>{formatCurrency(selectedVente?.montantRestant || 0)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              <p>Merci pour votre fidélité • SIDIBE SERVICES Guinée</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            {selectedVente && (
              <>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedVente)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 hover:bg-amber-500/30 transition-colors cursor-pointer"
                  title="Télécharger le fichier PDF officiel"
                >
                  <FileText className="w-4 h-4" />
                  Télécharger PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsAppPdf(selectedVente)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                  title="Envoyer la facture en format PDF sur WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp (PDF)
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>

            {canDeleteInvoice && selectedVente && (
              <button
                type="button"
                onClick={() => setVenteToDelete(selectedVente)}
                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                title="Supprimer définitivement cette facture"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}

            <button
              onClick={() => setSelectedVente(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </AnimatedModal>

      {/* MODAL CONFIRMATION SUPPRESSION FACTURE */}
      <AnimatedModal
        isOpen={Boolean(venteToDelete)}
        onClose={() => !deleting && setVenteToDelete(null)}
        title="Supprimer la Facture"
        subtitle={`Confirmation d'annulation définitive`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Attention : Action irréversible</p>
              <p className="text-xs text-rose-200/90 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement la facture{' '}
                <strong className="text-white font-mono">{venteToDelete?.reference}</strong> ?
              </p>
              <ul className="text-xs text-slate-300 list-disc list-inside mt-2 space-y-1">
                <li>Montant : <strong>{formatCurrency(venteToDelete?.total || 0)}</strong></li>
                <li>Client : <strong>{venteToDelete?.nomClient || venteToDelete?.client?.nom || 'Client Comptant'}</strong></li>
                <li>Les articles de cette vente seront automatiquement réintégrés dans le stock de la boutique.</li>
                <li>Si ce client avait une créance sur cette vente, elle sera également déduite de son solde dette.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setVenteToDelete(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Suppression en cours...' : 'Oui, supprimer la facture'}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
