'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Sun,
  Moon,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Building2,
  Sparkles,
  Lock,
  User,
  RefreshCw,
  Info,
  Check,
  Bell,
  Mail,
  MessageSquare,
  Package,
  DollarSign,
  Shield,
  Server,
  ToggleLeft,
  ToggleRight,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  UserCog,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';

// ─── Toggle Switch Component ──────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  colorClass = 'bg-amber-500',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ElementType;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
          checked ? colorClass : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Section Header Component ─────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {badge && (
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ParametresPage() {
  const { user, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { showSuccess, showError, showWarning } = useToast();

  // ── Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ── Identité entreprise
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [telephone, setTelephone] = useState('');
  const [emailEntreprise, setEmailEntreprise] = useState('');
  const [adresse, setAdresse] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // ── Notifications
  const [notifEmailActive, setNotifEmailActive] = useState(false);
  const [notifSmsActive, setNotifSmsActive] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [adminEmailNotif, setAdminEmailNotif] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);

  // ── Stock & Commerce
  const [seuilStockFaible, setSeuilStockFaible] = useState(5);
  const [devise, setDevise] = useState('GNF');
  const [symboleDevise, setSymboleDevise] = useState('GNF');
  const [tvaTaux, setTvaTaux] = useState(18);
  const [tvaActive, setTvaActive] = useState(false);
  const [savingCommerce, setSavingCommerce] = useState(false);

  // ── Sécurité
  const [tentativesConnexionMax, setTentativesConnexionMax] = useState(5);
  const [dureeSessionHeures, setDureeSessionHeures] = useState(8);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // ── Mot de passe (admin uniquement)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Synchronise les états locaux avec les settings chargés
  useEffect(() => {
    setCompanyName(settings.companyName || 'SIDIBE SERVICES');
    setDescription(settings.description || '');
    setTelephone(settings.telephone || '+224 622 48 81 61');
    setEmailEntreprise(settings.email || '');
    setAdresse(settings.adresse || '');
    setNotifEmailActive(settings.notifEmailActive ?? false);
    setNotifSmsActive(settings.notifSmsActive ?? true);
    setSmtpHost(settings.smtpHost || '');
    setSmtpPort(settings.smtpPort ?? 587);
    setSmtpUser(settings.smtpUser || '');
    setSmtpPassword(settings.smtpPassword || '');
    setSmtpFrom(settings.smtpFrom || '');
    setAdminEmailNotif(settings.adminEmailNotif || '');
    setSeuilStockFaible(settings.seuilStockFaible ?? 5);
    setDevise(settings.devise || 'GNF');
    setSymboleDevise(settings.symboleDevise || 'GNF');
    setTvaTaux(settings.tvaTaux ?? 18);
    setTvaActive(settings.tvaActive ?? false);
    setTentativesConnexionMax(settings.tentativesConnexionMax ?? 5);
    setDureeSessionHeures(settings.dureeSessionHeures ?? 8);
  }, [settings]);

  // ── Handlers logo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).', 'Fichier invalide');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("L'image ne doit pas dépasser 5 Mo.", 'Fichier trop lourd');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) return;
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', selectedFile);
      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData });
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

  // ── Handler identité entreprise
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCompany(true);
      const ok = await updateSettings({ companyName, description, telephone, email: emailEntreprise, adresse });
      if (ok) showSuccess("Les informations de l'entreprise ont été enregistrées.", 'Succès');
      else showError("Erreur lors de l'enregistrement.", 'Erreur');
    } finally {
      setSavingCompany(false);
    }
  };

  // ── Handler notifications
  const handleSaveNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingNotif(true);
      const ok = await updateSettings({
        notifEmailActive,
        notifSmsActive,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpFrom,
        adminEmailNotif,
      });
      if (ok) showSuccess('Configuration des notifications sauvegardée.', 'Notifications');
      else showError('Erreur lors de la sauvegarde.', 'Erreur');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingNotif(true);
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', to: adminEmailNotif || emailEntreprise }),
      });
      const data = await res.json();
      if (data.success) showSuccess("Email de test envoyé avec succès !", 'Test Email');
      else showError(data.error || "Échec de l'envoi de l'email de test.", 'Test Email');
    } catch {
      showError('Erreur réseau lors du test.', 'Erreur');
    } finally {
      setTestingNotif(false);
    }
  };

  // ── Handler stock & commerce
  const handleSaveCommerce = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCommerce(true);
      const ok = await updateSettings({ seuilStockFaible, devise, symboleDevise, tvaTaux, tvaActive });
      if (ok) showSuccess('Paramètres commerciaux enregistrés.', 'Commerce');
      else showError('Erreur lors de la sauvegarde.', 'Erreur');
    } finally {
      setSavingCommerce(false);
    }
  };

  // ── Handler sécurité
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSecurity(true);
      const ok = await updateSettings({ tentativesConnexionMax, dureeSessionHeures });
      if (ok) showSuccess('Paramètres de sécurité enregistrés.', 'Sécurité');
      else showError('Erreur lors de la sauvegarde.', 'Erreur');
    } finally {
      setSavingSecurity(false);
    }
  };

  // ── Handler mot de passe (admin uniquement)
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
        body: JSON.stringify({ id: user.id, motDePasse: newPassword }),
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

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
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
            Paramètres &amp; Configuration
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin
              ? "Gérez le thème, l'identité de marque, les notifications, le stock, la monnaie et la sécurité de l'ERP."
              : `Personnalisez votre thème d'affichage (${user?.pointVenteNom || 'Boutique'}).`}
          </p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Rôle actif</span>
          <span className="text-xs font-bold text-amber-400">
            {isAdmin ? '👑 Admin Global' : '🛒 Vendeur'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 : THÈME D'AFFICHAGE (ADMIN + VENDEURS)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <SectionHeader
          icon={theme === 'dark' ? Moon : Sun}
          title="Thème d'Affichage"
          subtitle="Basculez entre le Mode Sombre et le Mode Clair. Préférences sauvegardées automatiquement."
          badge={theme === 'dark' ? '🌙 Mode Sombre' : '☀️ Mode Clair'}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark */}
          <div
            onClick={() => { setTheme('dark'); showSuccess('Mode Sombre activé.', 'Thème'); }}
            className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {theme === 'dark' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
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
              Palette ardoise sombre et or brillant. Idéale pour les longues journées de vente et préserver la batterie.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-[#090d16] border border-slate-800 space-y-1.5 pointer-events-none">
              <div className="h-2 w-1/3 rounded bg-amber-500/80" />
              <div className="h-1.5 w-full rounded bg-slate-800" />
              <div className="h-1.5 w-4/5 rounded bg-slate-800" />
            </div>
          </div>

          {/* Light */}
          <div
            onClick={() => { setTheme('light'); showSuccess('Mode Clair activé.', 'Thème'); }}
            className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
              theme === 'light'
                ? 'bg-slate-100 border-amber-500 shadow-xl shadow-amber-500/10'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {theme === 'light' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
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
              Palette blanche et ardoise claire. Excellente lisibilité en extérieur ou sous forte lumière.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 pointer-events-none shadow-sm">
              <div className="h-2 w-1/3 rounded bg-amber-500" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
              <div className="h-1.5 w-4/5 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTIONS ADMIN UNIQUEMENT ───────────────────────────────────────── */}
      {isAdmin ? (
        <>
          {/* ════════════════════════════════════════════════════════════════════
              SECTION 2 : LOGO & IDENTITÉ VISUELLE (ADMIN)
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader
              icon={ImageIcon}
              title="Logo & Identité Visuelle"
              subtitle="Modifiez le logo officiel affiché sur l'ERP, les factures et la boutique en ligne."
              badge="Admin"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Aperçu logo */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Aperçu du Logo</span>
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

              {/* Upload zone */}
              <div className="md:col-span-2 space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-6 text-center transition-all bg-amber-500/5 hover:bg-amber-500/10"
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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
                      {uploadingLogo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Enregistrer ce logo</span>
                    </button>
                    <button
                      onClick={() => { setSelectedFile(null); setLogoPreview(null); }}
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

            {/* Formulaire coordonnées */}
            <form onSubmit={handleSaveCompany} className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Coordonnées Commerciales</span>
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
                    value={emailEntreprise}
                    onChange={(e) => setEmailEntreprise(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                    placeholder="contact@sidibeservices.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Villes &amp; Adresses</label>
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
                {savingCompany ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer les coordonnées</span>
              </button>
            </form>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 3 : NOTIFICATIONS EMAIL & SMS (ADMIN)
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8">
            <SectionHeader
              icon={Bell}
              title="Notifications Email & SMS"
              subtitle="Configurez les alertes automatiques pour commandes, virements et stock faible."
              badge="Admin"
            />

            <form onSubmit={handleSaveNotif} className="space-y-6">
              {/* Toggles on/off */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleSwitch
                  checked={notifSmsActive}
                  onChange={setNotifSmsActive}
                  label="Notifications SMS"
                  description="Alertes via l'API TextBee / Orange"
                  icon={MessageSquare}
                  colorClass="bg-green-500"
                />
                <ToggleSwitch
                  checked={notifEmailActive}
                  onChange={setNotifEmailActive}
                  label="Notifications Email"
                  description="Alertes via SMTP (Gmail, Brevo…)"
                  icon={Mail}
                  colorClass="bg-blue-500"
                />
              </div>

              {/* Config SMTP si email activé */}
              {notifEmailActive && (
                <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Configuration SMTP (Email sortant)</span>
                  </h3>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
                    <strong>Gmail gratuit :</strong> Hôte : <code className="bg-slate-900/60 px-1 rounded">smtp.gmail.com</code> · Port : <code className="bg-slate-900/60 px-1 rounded">587</code> · Mot de passe : créez un&nbsp;
                    <strong>Mot de passe d&apos;application</strong> dans votre compte Google (Sécurité → Connexion à Google → Mots de passe d&apos;application).
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Hôte SMTP</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Port SMTP</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Email expéditeur (login SMTP)</label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="moncompte@gmail.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Mot de passe d&apos;application</label>
                      <div className="relative">
                        <input
                          type={showSmtpPass ? 'text' : 'password'}
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder="xxxx xxxx xxxx xxxx"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Nom affiché de l&apos;expéditeur</label>
                      <input
                        type="text"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="SIDIBE SERVICES"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Email de réception des alertes admin</label>
                      <input
                        type="email"
                        value={adminEmailNotif}
                        onChange={(e) => setAdminEmailNotif(e.target.value)}
                        placeholder="admin@sidibeservices.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testingNotif || !smtpHost || !smtpUser}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm inline-flex items-center gap-2 transition-all"
                  >
                    {testingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Envoyer un email de test</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={savingNotif}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md"
              >
                {savingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer la configuration notifications</span>
              </button>
            </form>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 4 : STOCK & COMMERCE (ADMIN)
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8">
            <SectionHeader
              icon={Package}
              title="Stock & Commerce"
              subtitle="Définissez le seuil d'alerte stock faible, la devise et la TVA applicables à toutes les boutiques."
              badge="Admin"
            />

            <form onSubmit={handleSaveCommerce} className="space-y-6">
              {/* Seuil stock */}
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Alerte Stock Faible</span>
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Quantité minimale avant alerte (unités)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={seuilStockFaible}
                      onChange={(e) => setSeuilStockFaible(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[80px]">
                    <span className="text-2xl font-black text-amber-400">{seuilStockFaible}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">unités</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Une notification SMS/Email sera envoyée automatiquement lorsqu&apos;un article passe sous ce seuil.
                </p>
              </div>

              {/* Devise */}
              <div className="p-5 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Devise &amp; Monnaie</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Code devise (ex : GNF, USD, EUR)</label>
                    <input
                      type="text"
                      value={devise}
                      onChange={(e) => setDevise(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                      placeholder="GNF"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Symbole affiché (ex : GNF, $, €)</label>
                    <input
                      type="text"
                      value={symboleDevise}
                      onChange={(e) => setSymboleDevise(e.target.value)}
                      maxLength={6}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                      placeholder="GNF"
                    />
                  </div>
                </div>

                {/* TVA */}
                <div className="pt-2 space-y-3">
                  <ToggleSwitch
                    checked={tvaActive}
                    onChange={setTvaActive}
                    label="Activer la TVA sur les ventes"
                    description="Affiche et calcule la TVA sur les factures POS et boutique en ligne"
                    icon={DollarSign}
                    colorClass="bg-emerald-500"
                  />
                  {tvaActive && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Taux de TVA (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tvaTaux}
                        onChange={(e) => setTvaTaux(Number(e.target.value))}
                        className="w-48 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCommerce}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md"
              >
                {savingCommerce ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer Stock &amp; Commerce</span>
              </button>
            </form>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 5 : SÉCURITÉ (ADMIN)
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8">
            <SectionHeader
              icon={Shield}
              title="Sécurité & Accès"
              subtitle="Paramétrez les règles de connexion et la durée des sessions utilisateurs."
              badge="Admin"
            />

            <form onSubmit={handleSaveSecurity} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Tentatives de connexion</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Nombre maximum d&apos;essais autorisés avant le blocage temporaire d&apos;un compte.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={tentativesConnexionMax}
                      onChange={(e) => setTentativesConnexionMax(Number(e.target.value))}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all text-center font-bold text-lg"
                    />
                    <span className="text-sm text-slate-400">tentatives max</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Durée de session</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Durée en heures avant expiration automatique de la session de l&apos;utilisateur.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={dureeSessionHeures}
                      onChange={(e) => setDureeSessionHeures(Number(e.target.value))}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all text-center font-bold text-lg"
                    />
                    <span className="text-sm text-slate-400">heures</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Ces paramètres sont indicatifs et permettent de configurer les règles de sécurité. 
                  La mise en application complète nécessite une intégration côté serveur (middleware d&apos;authentification).
                </span>
              </div>

              <button
                type="submit"
                disabled={savingSecurity}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md"
              >
                {savingSecurity ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer les paramètres de sécurité</span>
              </button>
            </form>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 6 (BIS) : ADMINISTRATION — Boutiques & Utilisateurs
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8">
            <SectionHeader
              icon={Building2}
              title="Administration"
              subtitle="Gérez les boutiques, dépôts et les comptes utilisateurs de l'ERP."
              badge="Admin"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Boutiques & Dépôts */}
              <Link href="/points-de-vente" className="group block">
                <div className="p-5 rounded-2xl border border-slate-700 hover:border-amber-500/50 bg-slate-900/60 hover:bg-amber-500/5 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500/30 transition-all">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all mt-1" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Boutiques &amp; Dépôts</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Créez, configurez et gérez toutes vos boutiques et dépôts. Consultez les stocks, l&apos;équipe et la caisse de chaque point de vente.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:gap-2.5 transition-all">
                    <span>Gérer les boutiques</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>

              {/* Utilisateurs & Rôles */}
              <Link href="/utilisateurs" className="group block">
                <div className="p-5 rounded-2xl border border-slate-700 hover:border-amber-500/50 bg-slate-900/60 hover:bg-amber-500/5 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-all">
                      <UserCog className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all mt-1" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Utilisateurs &amp; Rôles</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ajoutez et gérez les comptes vendeurs et administrateurs. Attribuez les rôles et affectez chaque vendeur à sa boutique.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:gap-2.5 transition-all">
                    <span>Gérer les utilisateurs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 6 : PROFIL ADMIN & MOT DE PASSE
          ═══════════════════════════════════════════════════════════════════ */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader
              icon={User}
              title="Mon Profil & Sécurité"
              subtitle="Consultez vos informations de compte et modifiez votre mot de passe d'accès."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Nom complet</span>
                <span className="text-sm font-bold text-white mt-1 block">{user?.nom || 'Administrateur'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Identifiant (Login)</span>
                <span className="text-sm font-bold text-amber-400 mt-1 block">@{user?.login || 'admin'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Rôle</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">👑 Admin Global</span>
              </div>
            </div>

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
        </>
      ) : (
        /* ════════════════════════════════════════════════════════════════════
            VUE VENDEUR : identité en lecture seule + PAS de modification mdp
        ═══════════════════════════════════════════════════════════════════ */
        <>
          {/* Identité en lecture seule */}
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
                <img src={settings.logoUrl || '/img/logo.jpeg'} alt="Logo Officiel" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{settings.companyName || 'SIDIBE SERVICES'}</p>
                <p className="text-xs text-amber-400">{settings.telephone}</p>
                <p className="text-[11px] text-slate-400">{settings.adresse}</p>
              </div>
            </div>
          </section>

          {/* Profil vendeur — lecture seule, sans modification de mdp */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
            <SectionHeader
              icon={User}
              title="Mon Profil"
              subtitle="Informations de votre compte utilisateur. Pour toute modification, contactez l'administrateur."
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Nom complet</span>
                <span className="text-sm font-bold text-white mt-1 block">{user?.nom || 'Vendeur'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Identifiant (Login)</span>
                <span className="text-sm font-bold text-amber-400 mt-1 block">@{user?.login || 'login'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Boutique affectée</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{user?.pointVenteNom || 'Non affecté'}</span>
              </div>
            </div>

            {/* Message d'information pour le vendeur */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-300">Modification du mot de passe</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  La modification du mot de passe est réservée à l&apos;administrateur. Contactez la Direction Générale Sidibé si vous souhaitez changer votre mot de passe d&apos;accès.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
