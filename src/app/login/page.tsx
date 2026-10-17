'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Particle = {
  width: number;
  height: number;
  left: string;
  top: string;
  background: string;
  boxShadow: string;
  animateX: number;
  duration: number;
  delay: number;
};

type SideParticle = {
  position: string;
  top: string;
  animateY: number;
  animateX: number;
  duration: number;
  delay: number;
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ✅ État pour les particules générées côté client uniquement
  const [particles, setParticles] = useState<Particle[]>([]);
  const [leftParticles, setLeftParticles] = useState<SideParticle[]>([]);
  const [rightParticles, setRightParticles] = useState<SideParticle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Génération des particules UNIQUEMENT après hydratation côté client
    const generated: Particle[] = [...Array(40)].map((_, i) => ({
      width: Math.random() * 6 + 2,
      height: Math.random() * 6 + 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      background:
        i % 4 === 0
          ? 'rgba(251,191,36,0.9)'
          : i % 4 === 1
            ? 'rgba(59,130,246,0.8)'
            : i % 4 === 2
              ? 'rgba(168,85,247,0.8)'
              : 'rgba(16,185,129,0.8)',
      boxShadow:
        i % 4 === 0
          ? '0 0 10px rgba(251,191,36,0.8)'
          : i % 4 === 1
            ? '0 0 10px rgba(59,130,246,0.8)'
            : i % 4 === 2
              ? '0 0 10px rgba(168,85,247,0.8)'
              : '0 0 10px rgba(16,185,129,0.8)',
      animateX: Math.random() * 60 - 30,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    }));

    const generatedLeft: SideParticle[] = [...Array(10)].map(() => ({
      position: `${Math.random() * 15}%`,
      top: `${Math.random() * 100}%`,
      animateY: -100,
      animateX: 60,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 4,
    }));

    const generatedRight: SideParticle[] = [...Array(10)].map(() => ({
      position: `${Math.random() * 15}%`,
      top: `${Math.random() * 100}%`,
      animateY: 100,
      animateX: -60,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 4,
    }));

    setParticles(generated);
    setLeftParticles(generatedLeft);
    setRightParticles(generatedRight);
    setMounted(true);
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: username, password }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        login(data.user);
        router.push('/');
      } else {
        setErrorMsg(data.error || 'Erreur lors de la connexion');
      }
    } catch {
      setErrorMsg('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* ===== ANIMATIONS DE FOND DERRIÈRE LE FORMULAIRE ===== */}

      {/* Grille animée en perspective */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite',
          }}
        />
      </div>

      {/* ===== COLONNES LUMINEUSES VERTICALES (GAUCHE & DROITE) ===== */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-amber-400 to-transparent pointer-events-none"
        animate={{
          opacity: [0.2, 1, 0.2],
          scaleY: [0.8, 1, 0.8],
          boxShadow: [
            '0 0 10px rgba(251,191,36,0.3)',
            '0 0 30px rgba(251,191,36,0.9)',
            '0 0 10px rgba(251,191,36,0.3)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-blue-400 to-transparent pointer-events-none"
        animate={{
          opacity: [0.2, 1, 0.2],
          scaleY: [0.8, 1, 0.8],
          boxShadow: [
            '0 0 10px rgba(59,130,246,0.3)',
            '0 0 30px rgba(59,130,246,0.9)',
            '0 0 10px rgba(59,130,246,0.3)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* ===== ORBES LATÉRAUX GAUCHE (AMBRE) ===== */}
      <motion.div
        className="absolute -left-32 top-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0.1) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, 80, 0],
          y: [0, -60, 0],
          scale: [1, 1.4, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -left-20 bottom-1/4 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, 120, 0],
          y: [0, 80, 0],
          scale: [1.2, 0.9, 1.2],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* ===== ORBES LATÉRAUX DROITE (BLEU) ===== */}
      <motion.div
        className="absolute -right-32 top-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 1.4, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
      />
      <motion.div
        className="absolute -right-20 bottom-1/3 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0.1) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, -120, 0],
          y: [0, -80, 0],
          scale: [1.1, 0.8, 1.1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* ===== LIGNES DE SCAN HORIZONTALES ===== */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none"
        style={{ boxShadow: '0 0 15px rgba(251,191,36,0.8)' }}
        animate={{
          top: ['0%', '100%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none"
        style={{ boxShadow: '0 0 15px rgba(59,130,246,0.8)' }}
        animate={{
          top: ['100%', '0%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: 2 }}
      />

      {/* ===== ANNEAUX LATÉRAUX PULSANTS ===== */}
      <motion.div
        className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-2 border-amber-500/20 pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.8, 0.3],
          rotate: 360,
        }}
        transition={{
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
        }}
      />
      <motion.div
        className="absolute -right-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-2 border-blue-500/20 pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.8, 0.3],
          rotate: -360,
        }}
        transition={{
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
        }}
      />

      {/* ===== Cercles lumineux animés ===== */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.7, 0.3],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.2, 0.4],
          x: [0, -60, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ===== PARTICULES FLOTTANTES — rendues uniquement après mount ===== */}
      {mounted &&
        particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
              background: p.background,
              boxShadow: p.boxShadow,
            }}
            animate={{
              y: [0, -60, 0],
              x: [0, p.animateX, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* ===== PARTICULES LATÉRALES GAUCHE — rendues uniquement après mount ===== */}
      {mounted &&
        leftParticles.map((p, i) => (
          <motion.div
            key={`left-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 6,
              height: 6,
              left: p.position,
              top: p.top,
              background: 'rgba(251,191,36,1)',
              boxShadow: '0 0 20px rgba(251,191,36,1)',
            }}
            animate={{
              y: [0, p.animateY, 0],
              x: [0, p.animateX, 0],
              opacity: [0, 1, 0],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* ===== PARTICULES LATÉRALES DROITE — rendues uniquement après mount ===== */}
      {mounted &&
        rightParticles.map((p, i) => (
          <motion.div
            key={`right-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 6,
              height: 6,
              right: p.position,
              top: p.top,
              background: 'rgba(59,130,246,1)',
              boxShadow: '0 0 20px rgba(59,130,246,1)',
            }}
            animate={{
              y: [0, p.animateY, 0],
              x: [0, p.animateX, 0],
              opacity: [0, 1, 0],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* Anneaux orbitaux autour du formulaire */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-amber-500/15 pointer-events-none hidden lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400/80 rounded-full blur-sm" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400/60 rounded-full blur-sm" />
      </motion.div>
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-blue-500/15 pointer-events-none hidden lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400/80 rounded-full blur-sm" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400/60 rounded-full blur-sm" />
      </motion.div>

      {/* Lueur pulsante derrière la carte */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ===== CARTE DE LOGIN ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 overflow-hidden relative z-10"
      >
        <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div>
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring', delay: 0.2 }}
                whileHover={{ scale: 1.08, rotate: 5 }}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4"
              >
                <motion.div
                  className="absolute inset-0 rounded-3xl bg-amber-400/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <Image
                  src="/img/logo.png"
                  alt="Logo Sidibe Services"
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  priority
                  className="object-cover relative z-10"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Sparkles className="w-10 h-10 text-amber-400 relative z-20" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide flex items-center justify-center gap-2"
              >
                SIDIBE <span className="text-gold-gradient">SERVICES</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-xs text-slate-400 mt-1"
              >
                Commerce Général
              </motion.p>
            </div>

            {/* Form */}
            <form onSubmit={handleManualLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xl font-semibold text-slate-300 block mb-1">
                  Nom d&apos;utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin ou vendeur.ville"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xl font-semibold text-slate-300 block mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl btn-gold text-sm font-black flex items-center justify-center gap-2 shadow-xl mt-6"
              >
                {loading ? (
                  <span>Authentification en cours...</span>
                ) : (
                  <>
                    <span>Accéder à la Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            Développer par COTECH SERVICES
          </div>
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            Système multi-points de vente • Sidibe Services v1.0
          </div>
        </div>
      </motion.div>

      {/* Keyframes pour la grille animée */}
      <style jsx global>{`
        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 60px 60px;
          }
        }
      `}</style>
    </div>
  );
}