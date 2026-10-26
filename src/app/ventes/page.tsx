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
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

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
  };
  client?: {
    nom: string;
    telephone?: string;
    adresse?: string;
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
  const { user, isAdmin, isVendeur, activePointVenteId } = useAuth();
  const { showError } = useToast();

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [boutiquesList, setBoutiquesList] = useState<BoutiqueItem[]>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(
    isVendeur && user?.pointVenteId ? String(user.pointVenteId) : (activePointVenteId ? String(activePointVenteId) : '')
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);

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
    window.print();
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
                      <button
                        onClick={() => setSelectedVente(v)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voir</span>
                      </button>
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
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">SIDIBE SERVICES</h2>
                <p className="text-[11px] text-slate-500">
                  {selectedVente?.pointVente?.nom || selectedVente?.pointVenteNom || 'Kankan, Guinée'} • Tél: +224 622 48 81 61
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded bg-slate-100 font-bold text-slate-800">
                  FACTURE OFFICIELLE
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">{selectedVente?.reference}</p>
                <p className="text-[11px] text-slate-500">{formatDate(selectedVente?.dateVente)}</p>
              </div>
            </div>

            {/* Client info */}
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 space-y-0.5">
              <p className="font-bold text-slate-900">Client : {selectedVente?.nomClient || selectedVente?.client?.nom || 'Client Comptant'}</p>
              {selectedVente?.telephoneClient && (
                <p className="text-slate-500">Tél : {selectedVente.telephoneClient}</p>
              )}
              {selectedVente?.pointVente?.nom && (
                <p className="text-slate-500">Point de Vente : {selectedVente.pointVente.nom}</p>
              )}
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handlePrint}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              Imprimer la Facture
            </button>
            <button
              onClick={() => setSelectedVente(null)}
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
