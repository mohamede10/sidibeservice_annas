'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Smartphone,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

// ⚠️ NE PAS redéclarer BeforeInstallPromptEvent ici.
// Il est déclaré globalement dans src/types/pwa.d.ts

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);
  const [showPopBanner, setShowPopBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Détection si l'application est déjà lancée en mode PWA standalone (installée)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 2. Détection iOS (Safari)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    let timer: ReturnType<typeof setTimeout> | undefined;

    // 3. Écoute de l'événement PWA standard (Android, Chrome, Edge, Brave, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsSupportedBrowser(true);

      const dismissed = sessionStorage.getItem('sidibe_pwa_dismissed');
      if (!dismissed) {
        timer = setTimeout(() => {
          setShowPopBanner(true);
        }, 2500);
      }
    };

    // 4. Écoute de l'événement d'installation réussie
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPopBanner(false);
      setShowModal(false);
      setInstalledSuccess(true);
      setIsStandalone(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Sur iOS et pas encore en standalone, proposer également le pop
    if (isIosDevice) {
      setIsSupportedBrowser(true);
      const dismissed = sessionStorage.getItem('sidibe_pwa_dismissed');
      if (!dismissed) {
        timer = setTimeout(() => {
          setShowPopBanner(true);
        }, 3000);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Déclencher l'installation
  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowPopBanner(false);
          setShowModal(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Erreur lors du prompt PWA:', err);
      }
    } else {
      // iOS Safari ou navigateurs sans prompt direct : afficher les instructions
      setShowModal(true);
    }
  }, [deferredPrompt]);

  // Fermer le pop banner
  const dismissPop = () => {
    setShowPopBanner(false);
    sessionStorage.setItem('sidibe_pwa_dismissed', 'true');
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* =========================================================================
          1. BOUTON POP FLOTTANT EN BAS DE PAGE
      ========================================================================= */}
      <AnimatePresence>
        {showPopBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
          >
            <div className="relative rounded-3xl bg-[#0b101c]/95 border border-amber-500/40 p-4 sm:p-5 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

              <button
                onClick={dismissPop}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5 pr-6">
                <div className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/25">
                  <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center overflow-hidden">
                    <img
                      src="/img/logo.png"
                      alt="Logo Sidibe Multi-Services"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/icon-96x96.png';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center shadow">
                    ★
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Application Web
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                    Installer <span className="text-amber-400">Sidibe Multi-Services</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Installez l&apos;application sur votre téléphone ou PC pour commander en 1 clic et profiter d&apos;un accès rapide sans passer par le navigateur !
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Ultra Rapide
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Plein Écran
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  100% Gratuit
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={triggerInstall}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition-all"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Installer l&apos;Application</span>
                </button>
                <button
                  onClick={dismissPop}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          2. MODAL D'INSTRUCTIONS
      ========================================================================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-md bg-[#0b101c] border border-amber-500/40 rounded-3xl p-6 shadow-2xl shadow-black z-10 text-white"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 mx-auto mb-3 shadow-xl shadow-amber-500/20">
                  <div className="w-full h-full bg-[#0a0f1d] rounded-[22px] flex items-center justify-center overflow-hidden">
                    <img
                      src="/img/logo.png"
                      alt="Logo Sidibe Multi-Services"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/icon-192x192.png';
                      }}
                    />
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Installation Facile
                </span>
                <h3 className="text-lg font-black mt-2">
                  Installer <span className="text-amber-400">Sidibe Multi-Services</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {isIOS
                    ? "Suivez ces 3 étapes simples pour l'ajouter à votre écran d'accueil sur iPhone / iPad :"
                    : "Comment installer l'application sur votre appareil :"}
                </p>
              </div>

              {isIOS ? (
                <div className="space-y-3.5 mb-6 text-xs text-slate-200">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Touchez le bouton Partager <Share className="w-4 h-4 text-amber-400 inline" />
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Situé dans la barre en bas de votre écran sur Safari.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Sélectionnez &quot;Sur l&apos;écran d&apos;accueil&quot; <PlusSquare className="w-4 h-4 text-emerald-400 inline" />
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Faites défiler le menu des options vers le bas pour trouver cette ligne.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Touchez &quot;Ajouter&quot; en haut à droite
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        L&apos;icône Sidibe Multi-Services apparaîtra directement sur votre écran !
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 mb-6 text-xs text-slate-200">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <Download className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Sur Google Chrome ou Edge :</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Cliquez sur l&apos;icône d&apos;installation <span className="text-amber-400 font-bold">⊞</span> ou les trois points ⋮ en haut à droite puis &quot;Installer Sidibe Multi-Services&quot;.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Sur Android :</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Touchez les 3 points du navigateur puis sélectionnez &quot;Installer l&apos;application&quot; ou &quot;Ajouter à l&apos;écran d&apos;accueil&quot;.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
              >
                J&apos;ai compris
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          3. TOAST SUCCÈS D'INSTALLATION
      ========================================================================= */}
      <AnimatePresence>
        {installedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>🎉 Félicitations ! L&apos;application Sidibe Multi-Services est installée avec succès.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// COMPOSANT BOUTON D'INSTALLATION DÉDIÉ
// =============================================================================
export function InstallAppButton({
  className = '',
  variant = 'header',
}: {
  className?: string;
  variant?: 'header' | 'hero' | 'pill' | 'card';
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const { showInfo } = useToast();

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(isStandaloneMode));

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (isStandalone) {
      showInfo("L'application Sidibe Multi-Services est déjà installée sur votre appareil !", 'Application installée');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone && variant === 'header') {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>App Installée</span>
      </span>
    );
  }

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-bold text-xs transition-all shadow-md group ${className}`}
          title="Installer l'application Sidibe Multi-Services sur votre appareil"
        >
          <div className="relative">
            <Smartphone className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <span className="hidden sm:inline">Installer l&apos;App</span>
          <span className="sm:hidden">Installer</span>
        </button>
      )}

      {variant === 'hero' && (
        <button
          onClick={handleClick}
          className={`py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all ${className}`}
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Installer l&apos;application Sidibe Multi-Services</span>
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0b101c] border border-amber-500/40 rounded-3xl p-6 shadow-2xl z-10 text-white"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-4">
                <Smartphone className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h3 className="text-base font-black">Installation Sidibe Multi-Services</h3>
                <p className="text-xs text-slate-300 mt-1">
                  {isIOS
                    ? "Sur Safari iOS : Appuyez sur Partager ⎋ puis 'Sur l'écran d'accueil' ➕"
                    : "Sur votre navigateur, cliquez sur l'icône d'installation dans la barre d'adresses ou le menu ⋮ pour installer."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl btn-gold text-slate-950 font-bold text-xs"
              >
                D&apos;accord
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}