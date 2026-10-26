'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  CreditCard,
  RefreshCw,
  Mail,
  UserPlus,
  CheckCircle,
  FileText,
  Printer,
  Send,
  MessageCircle,
  ShoppingBag,
  Store,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import AnimatedModal from '@/components/AnimatedModal';
import { printInvoice, getWhatsAppInvoiceUrl, getEmailInvoiceUrl, InvoiceData } from '@/lib/invoicePdf';

interface VenteClient {
  id: number;
  reference: string;
  dateVente: string;
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
  factures?: Array<{
    id: number;
    numeroFacture: string;
    dateFacture: string;
    totalFacture: number;
    statut: string;
    lignes: Array<{
      id: number;
      description?: string;
      quantite: number;
      prixUnitaire: number;
      totalLigne: number;
    }>;
  }>;
  lignes?: Array<{
    id: number;
    nomProduit: string;
    varianteInfo?: string;
    quantite: number;
    prixUnitaire: number;
    totalLigne: number;
  }>;
}

interface Client {
  id: number;
  nom: string;
  codeClient?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  soldeDette: number;
  ventes?: VenteClient[];
}

export default function ClientsPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPurchasesOnly, setFilterPurchasesOnly] = useState(false);

  // Modal Historique et Factures du client
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // Add Client Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('Kankan');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const url = `/api/clients?q=${encodeURIComponent(searchTerm)}${
        filterPurchasesOnly ? '&avecAchats=true' : ''
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setClients(json.clients || []);
      }
    } catch (err) {
      console.error(err);
      showError('Impossible de charger la liste des clients.', 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [filterPurchasesOnly]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      showWarning('Veuillez renseigner le nom du client.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, telephone, email, adresse, ville }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setNom('');
        setTelephone('');
        setEmail('');
        setAdresse('');
        fetchClients();
        showSuccess('Le client a été enregistré.', 'Client créé');
      } else {
        showError(json.error || 'Erreur lors de la création', 'Erreur client');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de la création', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  // Convertit une vente en format InvoiceData prêt pour impression ou partage
  const buildInvoiceData = (client: Client, vente: VenteClient): InvoiceData => {
    const facture = vente.factures?.[0];
    const numeroFacture = facture?.numeroFacture || `FAC-${vente.reference.replace('VTE-', '')}`;
    const dateFacture = facture?.dateFacture || vente.dateVente;

    const lignes = (vente.lignes || []).map((l) => ({
      designation: l.nomProduit,
      varianteInfo: l.varianteInfo,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      totalLigne: l.totalLigne,
    }));

    return {
      numeroFacture,
      referenceVente: vente.reference,
      dateFacture,
      boutique: {
        nom: vente.pointVente?.nom || vente.pointVenteNom || 'Boutique Sidibe Services',
        ville: vente.pointVente?.ville || 'Kankan',
        adresse: vente.pointVente?.adresse || 'Centre Commercial',
        telephone: vente.pointVente?.telephone || '+224 622 48 81 61',
        codeBoutique: vente.pointVente?.codeBoutique,
      },
      client: {
        nom: client.nom,
        telephone: client.telephone,
        adresse: client.adresse,
        email: client.email,
        ville: client.ville,
      },
      lignes: lignes.length > 0 ? lignes : [{ designation: 'Achat divers', quantite: 1, prixUnitaire: vente.total, totalLigne: vente.total }],
      total: vente.total,
      montantPaye: vente.montantPaye,
      montantRestant: vente.montantRestant,
      modePaiement: vente.modePaiement,
    };
  };

  const handlePrint = (client: Client, vente: VenteClient) => {
    const invData = buildInvoiceData(client, vente);
    printInvoice(invData);
  };

  const handleWhatsApp = (client: Client, vente: VenteClient) => {
    if (!client.telephone) {
      showWarning('Ce client n\'a pas de numéro de téléphone pour WhatsApp.');
      return;
    }
    const invData = buildInvoiceData(client, vente);
    const url = getWhatsAppInvoiceUrl(invData);
    window.open(url, '_blank');
  };

  const handleEmail = (client: Client, vente: VenteClient) => {
    if (!client.email) {
      showWarning('Ce client n\'a pas d\'adresse email.');
      return;
    }
    const invData = buildInvoiceData(client, vente);
    window.location.href = getEmailInvoiceUrl(invData);
  };

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-6 h-6" />
            </span>
            Répertoire des Clients & Factures
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestion de {clients.length} client(s) — Téléchargement des factures PDF, envoi WhatsApp et Email.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClients}
            title="Rafraîchir"
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAddModalOpen(true)}
            className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau Client
          </motion.button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, code ou ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchClients()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Bouton de filtrage clients avec achats */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterPurchasesOnly(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !filterPurchasesOnly
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            Tous les clients
          </button>
          <button
            onClick={() => setFilterPurchasesOnly(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterPurchasesOnly
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Clients avec achats
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Chargement des clients et historiques d&apos;achats...
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Aucun client trouvé.
          </div>
        ) : (
          clients.map((c) => {
            const nbAchats = c.ventes?.length || 0;
            const totalDepense = (c.ventes || []).reduce((sum, v) => sum + v.total, 0);

            return (
              <motion.div
                key={c.id}
                whileHover={{ y: -3 }}
                className="glass-card p-5 rounded-3xl flex flex-col justify-between border border-slate-800 relative overflow-hidden group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {c.nom}
                      </h3>
                      <p className="text-xs text-slate-400">{c.codeClient || `CLI-${c.id}`}</p>
                    </div>
                    {c.soldeDette > 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        Dette : {formatCurrency(c.soldeDette)}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                        À jour
                      </span>
                    )}
                  </div>

                  {/* Coordonnées */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                    {c.telephone && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-white">{c.telephone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{c.ville || 'Kankan'}{c.adresse ? ` • ${c.adresse}` : ''}</span>
                    </div>
                  </div>

                  {/* Résumé des achats du client */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Achats</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-amber-400" />
                        {nbAchats} achat(s)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Dépensé</span>
                      <span className="font-black text-amber-400">{formatCurrency(totalDepense)}</span>
                    </div>
                  </div>
                </div>

                {/* Bouton Action : Historique & Factures */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => setSelectedClientForHistory(c)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Factures &amp; Historique ({nbAchats})</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          MODAL HISTORIQUE DES ACHATS & FACTURES AVEC TÉLÉCHARGEMENT PDF & WHATSAPP
      ========================================================================= */}
      <AnimatePresence>
        {selectedClientForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClientForHistory(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0b101c] border border-amber-500/40 rounded-3xl p-6 shadow-2xl z-10 text-white max-h-[90vh] flex flex-col"
            >
              {/* Entête Modal */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Factures &amp; Achats : {selectedClientForHistory.nom}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tél : {selectedClientForHistory.telephone || 'Non renseigné'} • Ville : {selectedClientForHistory.ville || 'Kankan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClientForHistory(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenu : Liste des factures */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {!selectedClientForHistory.ventes || selectedClientForHistory.ventes.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-sm font-bold text-slate-400">Aucun achat enregistré pour ce client</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Les ventes effectuées en caisse avec ce client apparaîtront automatiquement ici.
                    </p>
                  </div>
                ) : (
                  selectedClientForHistory.ventes.map((vente) => {
                    const facture = vente.factures?.[0];
                    const numFacture = facture?.numeroFacture || `FAC-${vente.reference}`;
                    const boutiqueNom = vente.pointVente?.nom || vente.pointVenteNom || 'Boutique Principale';

                    return (
                      <div
                        key={vente.id}
                        className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                              {numFacture}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Réf: {vente.reference}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {formatDate(vente.dateVente)}
                            </span>
                            <span className="flex items-center gap-1 text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-800">
                              <Store className="w-3.5 h-3.5 text-amber-400" />
                              {boutiqueNom}
                            </span>
                          </div>
                        </div>

                        {/* Articles de la facture */}
                        {vente.lignes && vente.lignes.length > 0 && (
                          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              Articles commandés :
                            </p>
                            <div className="space-y-1">
                              {vente.lignes.map((ligne, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-slate-300">
                                  <span>
                                    {ligne.nomProduit} {ligne.varianteInfo ? `(${ligne.varianteInfo})` : ''} ×{' '}
                                    <strong className="text-white">{ligne.quantite}</strong>
                                  </span>
                                  <span className="font-semibold text-amber-400/90">
                                    {formatCurrency(ligne.totalLigne)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Totaux & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Total Facture</span>
                              <span className="text-base font-black text-white">
                                {formatCurrency(vente.total)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Mode Paiement</span>
                              <span className="font-bold text-amber-400">{vente.modePaiement}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Statut</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  vente.montantRestant <= 0
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {vente.montantRestant <= 0 ? 'PAYÉE' : 'IMPAYÉE'}
                              </span>
                            </div>
                          </div>

                          {/* Boutons d'action pour la facture */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Bouton Télécharger / Imprimer PDF */}
                            <button
                              onClick={() => handlePrint(selectedClientForHistory, vente)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                              title="Télécharger / Imprimer la Facture PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Facture PDF</span>
                            </button>

                            {/* Bouton WhatsApp */}
                            <button
                              onClick={() => handleWhatsApp(selectedClientForHistory, vente)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                              title="Envoyer la facture directement sur WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Bouton Email */}
                            {selectedClientForHistory.email && (
                              <button
                                onClick={() => handleEmail(selectedClientForHistory, vente)}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Envoyer la facture par Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bas de Modal */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedClientForHistory(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AJOUT NOUVEAU CLIENT */}
      <AnimatedModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Créer un Nouveau Client"
        subtitle="Enregistrez les coordonnées du client dans l'annuaire"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nom complet du client *
            </label>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Oumar Coulibaly"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Numéro de téléphone
              </label>
              <input
                type="text"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+224 622 00 00 00"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Adresse Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Ville
              </label>
              <input
                type="text"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Adresse / Quartier
              </label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Kankan Centre..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Création...' : 'Enregistrer le Client'}
            </button>
          </div>
        </form>
      </AnimatedModal>
    </div>
  );
}
