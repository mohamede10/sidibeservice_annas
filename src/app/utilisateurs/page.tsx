'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  User,
  Shield,
  Store,
  Edit3,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Phone,
  Key,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface PointDeVenteSimple {
  id: number;
  nom: string;
  codeBoutique: string;
  ville: string;
}

interface UserData {
  id: number;
  nom: string;
  login: string;
  telephone?: string;
  email?: string;
  profil?: string;
  role: string;
  active: boolean;
  ville?: string;
  pointVenteId?: number;
  pointVenteDefaut?: PointDeVenteSimple | null;
  dateCreation: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN: { label: 'Administrateur', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Shield },
  GERANT: { label: 'Gérant', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Building2 },
  VENDEUR: { label: 'Vendeur', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Store },
};

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <input
        id={id}
        {...props}
        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
      />
    </div>
  );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <select
        id={id}
        {...props}
        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

interface UserFormData {
  nom: string;
  login: string;
  telephone: string;
  email: string;
  role: string;
  pointVenteId: string;
  ville: string;
  profil: string;
}

function UserModal({
  user,
  pdvList,
  onClose,
  onSuccess,
}: {
  user?: UserData;
  pdvList: PointDeVenteSimple[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>({
    nom: user?.nom || '',
    login: user?.login || '',
    telephone: user?.telephone || '',
    email: user?.email || '',
    role: user?.role || 'VENDEUR',
    pointVenteId: user?.pointVenteId ? String(user.pointVenteId) : '',
    ville: user?.ville || 'Kankan',
    profil: user?.profil || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = isEdit ? { id: user!.id, ...form } : form;
      const res = await fetch('/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          isEdit ? 'Les informations ont été mises à jour.' : 'Le compte a été créé avec succès.',
          isEdit ? 'Utilisateur modifié' : 'Utilisateur créé'
        );
        onSuccess();
        onClose();
      } else {
        const msg = json.error || 'Erreur lors de l\'enregistrement';
        setError(msg);
        showError(msg, 'Erreur utilisateur');
      }
    } catch {
      setError('Erreur réseau');
      showError('Erreur réseau lors de l\'enregistrement', 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{isEdit ? 'Modifier' : 'Nouvel'} Utilisateur</h2>
              <p className="text-xs text-slate-400">{isEdit ? `Édition de ${user!.nom}` : 'Ajouter un vendeur ou gérant'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nom complet *" id="nom" value={form.nom} onChange={set('nom')} placeholder="Prénom Nom" required />
            <InputField label="Login *" id="login" value={form.login} onChange={set('login')} placeholder="vendeur.Kankan" required disabled={isEdit} />
          </div>

          <SelectField label="Rôle *" id="role" value={form.role} onChange={set('role')}>
            <option value="VENDEUR">Vendeur</option>
            <option value="GERANT">Gérant</option>
            <option value="ADMIN">Administrateur Général</option>
          </SelectField>

          <SelectField
            label="Point de vente affecté"
            id="pdv"
            value={form.pointVenteId}
            onChange={(e) => {
              const selectedId = e.target.value;
              const pdv = pdvList.find((p) => String(p.id) === selectedId);
              setForm((f) => ({
                ...f,
                pointVenteId: selectedId,
                ville: pdv ? pdv.ville : f.ville,
              }));
            }}
          >
            <option value="">-- Aucun (accès global ADMIN) --</option>
            {pdvList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} ({p.codeBoutique}) — {p.ville}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <InputField label="Téléphone" id="tel" value={form.telephone} onChange={set('telephone')} placeholder="Ex : 622 48 81 61" />
            <InputField label="Email" id="email" type="email" value={form.email} onChange={set('email')} placeholder="Ex : sidibeoumar@gmail.com" />
          </div>

          <InputField label="Profil / Poste" id="profil" value={form.profil} onChange={set('profil')} placeholder="Ex: Caissier Principal" />

          {!isEdit && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <Key className="w-4 h-4 flex-shrink-0" />
              Mot de passe par défaut : <strong>123456</strong> (à changer à la première connexion)
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:text-white transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-2xl btn-gold font-bold flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement...</>
                : <><CheckCircle className="w-4 h-4" />{isEdit ? 'Enregistrer' : 'Créer'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function UsersPage() {
  const { user, isAdmin, isGerant } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pdvList, setPdvList] = useState<PointDeVenteSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserData | undefined>();
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/points-de-vente'),
      ]);
      const [uJson, pJson] = await Promise.all([uRes.json(), pRes.json()]);
      if (uJson.success) setUsers(uJson.users);
      if (pJson.success) setPdvList(pJson.pointsDeVente || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleActive = async (u: UserData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, active: !u.active }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          u.active ? `${u.nom} a été désactivé.` : `${u.nom} a été réactivé.`,
          u.active ? 'Compte désactivé' : 'Compte activé'
        );
        fetchData();
      } else {
        showError(json.error || 'Impossible de modifier le statut', 'Erreur statut');
      }
    } catch {
      showError('Erreur réseau lors du changement de statut', 'Erreur réseau');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeletingUser(true);
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setUserToDelete(null);
        fetchData();
        showSuccess('Utilisateur supprimé avec succès.', 'Suppression réussie');
      } else {
        showError(json.error || 'Erreur lors de la suppression', 'Erreur suppression');
      }
    } catch (err) {
      console.error('Erreur suppression utilisateur:', err);
      showError('Erreur réseau lors de la suppression', 'Erreur réseau');
    } finally {
      setDeletingUser(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.nom.toLowerCase().includes(search.toLowerCase()) || u.login.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-6 h-6" />
            </span>
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {users.length} compte(s) — Vendeurs, Gérants et Administrateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {(isAdmin || isGerant) && (
            <button
              onClick={() => { setEditUser(undefined); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gold text-sm font-bold shadow-lg shadow-amber-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Nouvel Utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou login..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'ADMIN', 'GERANT', 'VENDEUR'].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filterRole === role ? 'bg-amber-500 text-black' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'}`}
            >
              {role === 'all' ? 'Tous' : ROLE_CONFIG[role]?.label || role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          filtered.map((u, i) => {
            const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.VENDEUR;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card rounded-3xl border border-slate-800 p-5 flex flex-col gap-3 ${!u.active ? 'opacity-60' : ''}`}
              >
                {/* User Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black border ${roleConf.color}`}>
                      {u.nom[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">{u.nom}</p>
                      <p className="text-xs text-slate-400 font-mono">@{u.login}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${roleConf.color}`}>
                    <roleConf.icon className="w-3 h-3" />
                    {roleConf.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  {u.pointVenteDefaut && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Store className="w-3.5 h-3.5 text-amber-400" />
                      <span>{u.pointVenteDefaut.nom} ({u.pointVenteDefaut.codeBoutique})</span>
                    </div>
                  )}
                  {u.ville && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.ville}, Guinée</span>
                    </div>
                  )}
                  {u.telephone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.telephone}</span>
                    </div>
                  )}
                  {u.profil && (
                    <p className="text-xs text-slate-500 italic">{u.profil}</p>
                  )}
                </div>

                {/* Status + Actions */}
                {(isAdmin || isGerant) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors ${u.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}
                    >
                      {u.active ? <><ToggleRight className="w-3.5 h-3.5" />Actif</> : <><ToggleLeft className="w-3.5 h-3.5" />Inactif</>}
                    </button>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditUser(u); setShowModal(true); }}
                        title="Modifier l'utilisateur"
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setUserToDelete(u)}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'Vous ne pouvez pas supprimer votre propre compte' : 'Supprimer cet utilisateur'}
                          className={`p-2 rounded-xl transition-colors ${u.id === user?.id
                              ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30'
                            }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal Edition / Creation */}
      <AnimatePresence>
        {showModal && (
          <UserModal
            user={editUser}
            pdvList={pdvList}
            onClose={() => { setShowModal(false); setEditUser(undefined); }}
            onSuccess={fetchData}
          />
        )}
      </AnimatePresence>

      {/* Modal Confirmation Suppression Utilisateur */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => !deletingUser && setUserToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Supprimer l&apos;utilisateur</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Êtes-vous sûr de vouloir supprimer le compte de <strong>{userToDelete.nom}</strong> (@{userToDelete.login}) ?
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p>• Rôle : <strong className="text-amber-400">{userToDelete.role}</strong></p>
                <p>• Point de Vente : <strong>{userToDelete.pointVenteDefaut?.nom || 'Non rattaché'}</strong></p>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 mt-2">
                  Si cet utilisateur figure sur des factures ou ventes existantes, son compte sera automatiquement désactivé et archivé pour préserver l&apos;historique comptable sans rupture.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => setUserToDelete(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={handleConfirmDeleteUser}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingUser ? 'Suppression...' : 'Confirmer la Suppression'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
