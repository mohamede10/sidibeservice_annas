'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';

interface Client {
  id: number;
  nom: string;
  codeClient?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  soldeDette: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Client Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('Bamako');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients?q=${encodeURIComponent(searchTerm)}`);
      const json = await res.json();
      if (json.success) {
        setClients(json.clients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

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
      } else {
        alert(json.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
            Répertoire des Clients & Tiers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestion de la base de {clients.length} clients, coordonnées et soldes de dettes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClients}
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

      {/* Search Filter */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 max-w-md">
        <div className="relative">
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
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Chargement des clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Aucun client trouvé.
          </div>
        ) : (
          clients.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -3 }}
              className="glass-card p-5 rounded-3xl flex flex-col justify-between border border-slate-800 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{c.nom}</h3>
                    <p className="text-xs text-slate-400">{c.codeClient || `CLI-${c.id}`}</p>
                  </div>
                  {c.soldeDette > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      Dette: {formatCurrency(c.soldeDette)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                      À jour
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  {c.telephone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>{c.telephone}</span>
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
                    <span>{c.ville || 'Bamako'}{c.adresse ? ` • ${c.adresse}` : ''}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

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
                placeholder="+223 70 00 00 00"
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
                placeholder="Hamdallaye ACI 2000..."
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
