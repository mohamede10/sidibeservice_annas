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
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';

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
  }>;
  paiements: Array<{
    id: number;
    montant: number;
    modePaiement: string;
    datePaiement: string;
    referenceRecu?: string;
  }>;
}

export default function DettesPage() {
  const [clients, setClients] = useState<ClientDette[]>([]);
  const [totalDettes, setTotalDettes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchDettes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dettes');
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
  }, []);

  const handleOpenPaiement = (client: ClientDette) => {
    setSelectedClient(client);
    setMontantRemboursement(String(client.soldeDette));
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !montantRemboursement) return;

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
      } else {
        alert(json.error || 'Erreur lors du remboursement');
      }
    } catch (err) {
      console.error(err);
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
            Recouvrement, acomptes partiels et encaissement des ventes à crédit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-right">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
              Total Créances Dues
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
                    Aucun client avec dette en cours. Bravo !
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{c.nom}</div>
                      <div className="text-xs text-slate-400">{c.telephone || 'Sans téléphone'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {c.ville || 'Bamako'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {c.ventes.length > 0 ? (
                        <div className="space-y-1">
                          {c.ventes.slice(0, 2).map((v) => (
                            <span
                              key={v.id}
                              className="inline-block mr-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
                            >
                              {v.reference} ({formatCurrency(v.montantRestant)})
                            </span>
                          ))}
                          {c.ventes.length > 2 && (
                            <span className="text-slate-500 text-[10px]">+{c.ventes.length - 2} autres</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Solde antérieur</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-rose-400">
                        {formatCurrency(c.soldeDette)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleOpenPaiement(c)}
                        className="btn-gold px-4 py-2 rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
                      >
                        <Banknote className="w-4 h-4" />
                        Encaisser un Règlement
                      </motion.button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ENCAISSEMENT REGLEMENT DETTE */}
      <AnimatedModal
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        title="Encaisser un Remboursement / Acompte"
        subtitle={`Client : ${selectedClient?.nom || ''} • Dette actuelle : ${formatCurrency(selectedClient?.soldeDette)}`}
      >
        <form onSubmit={handleSettleDebt} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Montant versé par le client (GNF) *
            </label>
            <input
              type="number"
              required
              value={montantRemboursement}
              onChange={(e) => setMontantRemboursement(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-extrabold text-lg focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Mode d&apos;encaissement
            </label>
            <select
              value={modeRemboursement}
              onChange={(e) => setModeRemboursement(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="ESPECES">Espèces (Cash)</option>
              <option value="WAVE">Wave Mobile</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="CARTE_BANCAIRE">Carte Bancaire</option>
              <option value="VIREMENT">Virement / Chèque</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Notes / Observation
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Acompte sur solde veste ou costume..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {selectedClient && montantRemboursement && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex justify-between">
              <span>Nouveau solde après règlement :</span>
              <span className="font-bold">
                {formatCurrency(Math.max(0, selectedClient.soldeDette - (parseFloat(montantRemboursement) || 0)))}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Validation...' : 'Valider le Règlement'}
            </button>
          </div>
        </form>
      </AnimatedModal>

      {/* MODAL: REÇU DE PAIEMENT DETTE */}
      <AnimatedModal
        isOpen={Boolean(lastPayment)}
        onClose={() => setLastPayment(null)}
        title="Reçu d'Encaissement Dette"
        subtitle={`Réf: ${lastPayment?.reference || ''}`}
      >
        <div className="space-y-4">
          <div id="printable-area" className="p-6 rounded-2xl bg-white text-slate-900 shadow-lg space-y-3">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h3 className="font-black text-lg text-slate-900">SIDIBE SERVICE</h3>
              <p className="text-xs text-slate-500">REÇU DE RÈGLEMENT DE CRÉANCE</p>
            </div>

            <div className="text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Réf Reçu :</span>
                <span className="font-bold text-slate-900">{lastPayment?.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-bold text-slate-900">{lastPayment?.nomClient}</span>
              </div>
              <div className="flex justify-between">
                <span>Date :</span>
                <span>{lastPayment?.date ? new Date(lastPayment.date).toLocaleString('fr-FR') : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode :</span>
                <span className="font-semibold">{lastPayment?.modePaiement}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-sm font-black text-emerald-700">
                <span>Montant Réglé :</span>
                <span>{formatCurrency(lastPayment?.montant)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Nouveau Solde Restant :</span>
                <span>{formatCurrency(lastPayment?.nouveauSolde)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setLastPayment(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Fermer
            </button>
            <button
              onClick={() => window.print()}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Reçu
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
