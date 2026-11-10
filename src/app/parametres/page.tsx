'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Sun,
  Moon,
  Image as ImageIcon,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Sparkles,
  Lock,
  User,
  Phone,
  Mail,
  RefreshCw,
  Store,
  Info,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';

export default function ParametresPage() {
  const { user, isAdmin, isVendeur } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { showSuccess, showError, showWarning } = useToast();

  // Logo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Company info form (Admin only)
  const [companyName, setCompanyName] = useState(settings.companyName || 'SIDIBE SERVICES');
  const [description, setDescription] = useState(settings.description || '');
  const [telephone, setTelephone] = useState(settings.telephone || '+224 622 48 81 61');
  const [email, setEmail] = useState(settings.email || 'sidibeoumar413@gmail.com');
  const [adresse, setAdresse] = useState(settings.adresse || 'Kankan • Siguiri • Conakry — République de Guinée');
  const [savingCompany, setSavingCompany] = useState(false);

  // Password change state (All users)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Logo file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).', 'Fichier invalide');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('L\'image ne doit pas dépasser 5 Mo.', 'Fichier trop lourd');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload logo (Admin only)
  const handleUploadLogo = async () => {
    if (!selectedFile) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', selectedFile);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.logoUrl) {
        await refreshSettings();
        setLogoPreview(null);
        setSelectedFile(null);
        showSuccess('Le logo officiel a été mis à jour avec succès.', 'Logo modifié');
      } else {
        showError(data.error || 'Erreur lors de la mise à jour du logo.', 'Erreur');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors du téléversement du logo.', 'Erreur');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Reset to default logo
  const handleResetDefaultLogo = async () => {
    const ok = await updateSettings({ logoUrl: '/img/logo.jpeg' });
    if (ok) {
      setLogoPreview(null);
      setSelectedFile(null);
      showSuccess('Le logo par défaut a été rétabli.', 'Logo réinitialisé');
    } else {
      showError('Impossible de réinitialiser le logo.', 'Erreur');
    }
  };

  // Save company details (Admin only)
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCompany(true);
      const ok = await updateSettings({
        companyName,
        description,
        telephone,
        email,
        adresse,
      });
      if (ok) {
        showSuccess('Les informations de l\'entreprise ont été enregistrées.', 'Succès');
      } else {
        showError('Erreur lors de l\'enregistrement des coordonnées.', 'Erreur');
      }
    } finally {
      setSavingCompany(false);
    }
  };

  // Change user password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showWarning('Le mot de passe doit comporter au moins 4 caractères.', 'Mot de passe trop court');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Les deux mots de passe ne correspondent pas.', 'Erreur de confirmation');
      return;
    }

    if (!user?.id) return;

    try {
      setChangingPassword(true);
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          motDePasse: newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showSuccess('Votre mot de passe a été mis à jour avec succès.', 'Sécurité');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(data.error || 'Erreur lors du changement de mot de passe.', 'Erreur');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de la mise à jour du mot de passe.', 'Erreur réseau');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-slate-900 border border-amber-500/20 backdrop-blur-xl shadow-xl shadow-amber-500/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {isAdmin ? 'Administration Globale' : 'Espace Utilisateur'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Settings className="w-6 h-6" />
            </span>
            Paramètres & Personnalisation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin
              ? 'Personnalisez le thème d\'affichage, l\'identité de marque (logo) et vos paramètres de profil.'
              : `Personnalisez votre thème d'affichage et vos préférences de compte (${user?.pointVenteNom || 'Boutique'}).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Rôle actif</span>
            <span className="text-xs font-bold text-amber-400">
              {isAdmin ? '👑 Admin Global' : '🛒 Vendeur'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : MODE DARK ET CLAIR (POUR TOUS : ADMIN & VENDEURS)             */}
      {/* ========================================================================= */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Thème d&apos;Affichage</h2>
              <p className="text-xs text-slate-400">
                Basculez entre le Mode Sombre et le Mode Clair. Vos préférences sont automatiquement sauvegardées sur cet appareil.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {theme === 'dark' ? '🌙 Mode Sombre Actif' : '☀️ Mode Clair Actif'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Dark Mode */}
          <div
            onClick={() => {
              setTheme('dark');
              showSuccess('Mode Sombre activé avec succès.', 'Thème');
            }}
            className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {theme === 'dark' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Mode Sombre (Dark)</h3>
                <span className="text-[11px] text-amber-400 font-semibold">Par défaut • Recommandé</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Palette ardoise sombre et or brillant. Idéale pour soulager les yeux lors des longues journées de vente et préserver la batterie.
            </p>

            {/* Mini preview */}
            <div className="mt-4 p-3 rounded-xl bg-[#090d16] border border-slate-800 space-y-1.5 pointer-events-none">
              <div className="h-2 w-1/3 rounded bg-amber-500/80" />
              <div className="h-1.5 w-full rounded bg-slate-800" />
              <div className="h-1.5 w-4/5 rounded bg-slate-800" />
            </div>
          </div>

          {/* Card Light Mode */}
          <div
            onClick={() => {
              setTheme('light');
              showSuccess('Mode Clair activé avec succès.', 'Thème');
            }}
            className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
              theme === 'light'
                ? 'bg-slate-100 border-amber-500 shadow-xl shadow-amber-500/10'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {theme === 'light' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Mode Clair (Light)</h3>
                <span className="text-[11px] text-amber-600 font-semibold">Épuré • Lumineux</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Palette blanche et ardoise claire, avec contrastes élevés. Excellente lisibilité en extérieur ou sous une forte lumière en boutique.
            </p>

            {/* Mini preview */}
            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 pointer-events-none shadow-sm">
              <div className="h-2 w-1/3 rounded bg-amber-500" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
              <div className="h-1.5 w-4/5 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 : LOGO ET IDENTITÉ (ADMIN UNIQUEMENT vs VENDEUR EN LECTURE)     */}
      {/* ========================================================================= */}
      {isAdmin ? (
        <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Logo & Identité Visuelle de l&apos;Entreprise</h2>
                <p className="text-xs text-slate-400">
                  Réservé à l&apos;administrateur : modifiez le logo officiel affiché sur l&apos;ERP, les factures et la boutique en ligne.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin Uniquement
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Visualisation actuelle du logo */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                Aperçu du Logo
              </span>
              <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-amber-500/40 p-1 bg-gradient-to-br from-amber-500/20 to-transparent shadow-xl shadow-amber-500/10 mb-3">
                <img
                  src={logoPreview || settings.logoUrl || '/img/logo.jpeg'}
                  alt="Logo Entreprise"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <p className="text-xs font-bold text-white">{settings.companyName || 'SIDIBE SERVICES'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Format recommandé : PNG ou JPG carré</p>
            </div>

            {/* Zone de téléversement */}
            <div className="md:col-span-2 space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-6 text-center transition-all bg-amber-500/5 hover:bg-amber-500/10"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white">
                  {selectedFile ? selectedFile.name : 'Cliquez pour importer un nouveau logo'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP jusqu&apos;à 5 Mo</p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                  >
                    {uploadingLogo ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Enregistrer ce nouveau logo</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setLogoPreview(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {settings.logoUrl !== '/img/logo.jpeg' && (
                <div className="pt-2">
                  <button
                    onClick={handleResetDefaultLogo}
                    className="text-xs text-slate-400 hover:text-amber-400 underline transition-colors"
                  >
                    Rétablir le logo original par défaut
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Formulaire coordonnées de marque */}
          <form onSubmit={handleSaveCompany} className="pt-4 border-t border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Coordonnées Commerciales Affichées sur les Factures</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nom de l&apos;Entreprise</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="SIDIBE SERVICES"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Téléphone Officiel</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="+224 622 48 81 61"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Officiel</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="contact@sidibeservices.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Villes & Adresses</label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="Kankan • Siguiri • Conakry"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Slogan</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                placeholder="Décoration, rideaux, linge de lit, tapis et mobilier en Guinée"
              />
            </div>

            <button
              type="submit"
              disabled={savingCompany}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md"
            >
              {savingCompany ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Enregistrer les coordonnées</span>
            </button>
          </form>
        </section>
      ) : (
        /* Vendeur : Information en lecture seule sur l'identité */
        <section className="glass-card rounded-3xl p-6 space-y-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-800 text-amber-400 border border-slate-700">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Identité de l&apos;Entreprise</h2>
              <p className="text-xs text-slate-400">
                Le logo et les coordonnées officielles sont gérés exclusivement par la Direction Générale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-amber-500/30 p-0.5 bg-black">
              <img
                src={settings.logoUrl || '/img/logo.jpeg'}
                alt="Logo Officiel"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{settings.companyName || 'SIDIBE SERVICES'}</p>
              <p className="text-xs text-amber-400">{settings.telephone}</p>
              <p className="text-[11px] text-slate-400">{settings.adresse}</p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3 : PROFIL UTILISATEUR & SÉCURITÉ (POUR TOUS)                     */}
      {/* ========================================================================= */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Mon Profil & Sécurité</h2>
            <p className="text-xs text-slate-400">
              Consultez vos informations de compte et modifiez votre mot de passe d&apos;accès.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Nom complet</span>
            <span className="text-sm font-bold text-white mt-1 block">{user?.nom || 'Utilisateur'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Identifiant (Login)</span>
            <span className="text-sm font-bold text-amber-400 mt-1 block">@{user?.login || 'login'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Boutique affectée</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">
              {isAdmin ? 'Toutes les boutiques' : (user?.pointVenteNom || 'Non affecté')}
            </span>
          </div>
        </div>

        {/* Changement de mot de passe */}
        <form onSubmit={handleChangePassword} className="pt-4 border-t border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Modifier mon Mot de Passe</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 4 caractères..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword || !newPassword}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md"
          >
            {changingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Mettre à jour le mot de passe</span>
          </button>
        </form>
      </section>
    </div>
  );
}

