'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Search,
  CheckCircle,
  Clock,
  Banknote,
  DollarSign,
  Receipt,
  User,
  RefreshCw,
  Printer,
  ChevronRight,
  Store,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface ClientDette {
  id: number;
  nom: string;
  telephone?: string;
  ville?: string;
  soldeDette: number;
  ventes: Array<{
    id: number;
    reference: string;
    dateVente: string;
    total: number;
    montantPaye: number;
    montantRestant: number;
    statutPaiement: string;
    pointVente?: { nom: string };
  }>;
  paiements: Array<{
    id: number;
    montant: number;
    modePaiement: string;
    datePaiement: string;
    referenceRecu?: string;
  }>;
}

interface BoutiqueItem {
  id: number;
  nom: string;
  ville: string;
}

export default function DettesPage() {
  const { user, isAdmin, isVendeur, activePointVenteId } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [clients, setClients] = useState<ClientDette[]>([]);
  const [totalDettes, setTotalDettes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [boutiquesList, setBoutiquesList] = useState<BoutiqueItem[]>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(
    isVendeur && user?.pointVenteId ? String(user.pointVenteId) : (activePointVenteId ? String(activePointVenteId) : '')
  );

  // Settle Debt Modal
  const [selectedClient, setSelectedClient] = useState<ClientDette | null>(null);
  const [montantRemboursement, setMontantRemboursement] = useState('');
  const [modeRemboursement, setModeRemboursement] = useState('ESPECES');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success Receipt Modal
  const [lastPayment, setLastPayment] = useState<{
    nomClient: string;
    montant: number;
    modePaiement: string;
    date: string;
    reference: string;
    nouveauSolde: number;
  } | null>(null);

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

  const fetchDettes = async () => {
    try {
      setLoading(true);
      let url = '/api/dettes';

      if (isVendeur && user?.pointVenteId) {
        url += `?pointVenteId=${user.pointVenteId}`;
      } else if (isAdmin && selectedBoutiqueId) {
        url += `?pointVenteId=${selectedBoutiqueId}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setClients(json.clients || []);
        setTotalDettes(json.totalDettes || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDettes();
  }, [selectedBoutiqueId, isVendeur, user?.pointVenteId]);

  const handleOpenPaiement = (client: ClientDette) => {
    setSelectedClient(client);
    setMontantRemboursement(String(client.soldeDette));
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !montantRemboursement) {
      showWarning('Veuillez saisir un montant de remboursement.');
      return;
    }
    if (parseFloat(montantRemboursement) <= 0) {
      showWarning('Le montant du remboursement doit être supérieur à zéro.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/dettes/payer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          montant: parseFloat(montantRemboursement),
          modePaiement: modeRemboursement,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setLastPayment({
          nomClient: selectedClient.nom,
          montant: parseFloat(montantRemboursement),
          modePaiement: modeRemboursement,
          date: new Date().toISOString(),
          reference: json.data?.paiement?.referenceRecu || `REC-${Date.now().toString().slice(-6)}`,
          nouveauSolde: json.data?.nouveauSolde || 0,
        });

        setSelectedClient(null);
        setMontantRemboursement('');
        fetchDettes();
        showSuccess('Le remboursement a été enregistré.', 'Encaissement validé');
      } else {
        showError(json.error || 'Erreur lors du remboursement', 'Erreur remboursement');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors du remboursement', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = clients.filter((c) =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telephone && c.telephone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <CreditCard className="w-6 h-6" />
            </span>
            Suivi des Dettes & Créances Clients
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isVendeur
              ? `Créances et ventes à crédit enregistrées pour votre boutique (${user?.pointVenteNom || 'Ma Boutique'}).`
              : 'Recouvrement consolidé, acomptes partiels et créances de toutes les boutiques.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-right">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
              {isAdmin && !selectedBoutiqueId ? 'Total Créances Générales' : 'Créances Dues Boutique'}
            </p>
            <p className="text-xl font-black text-rose-400">{formatCurrency(totalDettes)}</p>
          </div>

          <button
            onClick={fetchDettes}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Boutique Notice / Filter */}
      {isVendeur ? (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Boutique Affectée : <strong className="text-amber-400 font-bold">{user?.pointVenteNom || 'Boutique Principale'}</strong>. Seules les dettes générées par votre boutique sont affichées ici.
          </span>
        </div>
      ) : (
        isAdmin && (
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 font-semibold">Périmètre des Dettes :</span>
              <select
                value={selectedBoutiqueId}
                onChange={(e) => setSelectedBoutiqueId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                <option value="">🌟 Toutes les Boutiques (Consolidé)</option>
                {boutiquesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏬 {b.nom} ({b.ville})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-400">
              Nombre de débiteurs : <strong className="text-white">{filtered.length}</strong>
            </div>
          </div>
        )
      )}

      {/* Search filter */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client débiteur (nom, téléphone)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Debtors List */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Client & Coordonnées</th>
                <th className="px-6 py-4">Ville / Adresse</th>
                <th className="px-6 py-4">Factures en Souffrance</th>
                <th className="px-6 py-4">Solde Dette à Payer</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Chargement des créances...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Aucune créance en cours trouvée pour ce périmètre.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white text-sm">{c.nom}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.telephone || 'Sans téléphone'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {c.ville || 'Kankan'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="flex flex-wrap gap-1">
                        {c.ventes?.map((v) => (
                          <span
                            key={v.id}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-300"
                          >
                            {v.reference} ({formatCurrency(v.montantRestant)})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-rose-400 text-base">
                      {formatCurrency(c.soldeDette)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenPaiement(c)}
                        className="btn-gold px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 inline-flex items-center gap-1.5"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Encaisser Acompte</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECOUVREMENT DETTE */}
      <AnimatedModal
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        title="Encaisser un Remboursement"
        subtitle={`Règlement de dette pour : ${selectedClient?.nom || ''}`}
      >
        <form onSubmit={handleSettleDebt} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total dette actuelle</p>
              <p className="text-lg font-black text-rose-400">
                {formatCurrency(selectedClient?.soldeDette || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Téléphone</p>
              <p className="text-xs font-semibold text-white">
                {selectedClient?.telephone || 'Non renseigné'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Montant à Encaisser (GNF) *
            </label>
            <input
              type="number"
              required
              min={1}
              max={selectedClient?.soldeDette}
              value={montantRemboursement}
              onChange={(e) => setMontantRemboursement(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Mode de Règlement
            </label>
            <select
              value={modeRemboursement}
              onChange={(e) => setModeRemboursement(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="ESPECES">Espèces (Cash)</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="WAVE">Wave</option>
              <option value="VIREMENT">Virement / Chèque</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Notes & Référence (optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Reste payé par le frère du client"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedClient(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
            >
              {submitting ? 'Validation...' : 'Valider l\'Encaissement'}
            </button>
          </div>
        </form>
      </AnimatedModal>

      {/* MODAL: REÇU DE PAIEMENT DETTE */}
      <AnimatedModal
        isOpen={Boolean(lastPayment)}
        onClose={() => setLastPayment(null)}
        title="Reçu de Paiement Confirmé"
        subtitle="Règlement de créance validé avec succès"
      >
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-xl space-y-3">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900">SIDIBE SERVICES</h3>
                <p className="text-[11px] text-slate-500">Reçu d&apos;encaissement dette</p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  ENCAISSÉ
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">{lastPayment?.reference}</p>
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-700">
              <p>Client : <strong className="text-slate-900">{lastPayment?.nomClient}</strong></p>
              <p>Montant Encaissé : <strong className="text-emerald-700 text-sm">{formatCurrency(lastPayment?.montant || 0)}</strong></p>
              <p>Mode : <strong>{lastPayment?.modePaiement}</strong></p>
              <p>Nouveau Solde Restant : <strong className="text-rose-600 font-bold">{formatCurrency(lastPayment?.nouveauSolde || 0)}</strong></p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Reçu
            </button>
            <button
              onClick={() => setLastPayment(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
