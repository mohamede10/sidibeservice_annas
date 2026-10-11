'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: number;
  nom: string;
  login: string;
  role: 'ADMIN' | 'GERANT' | 'VENDEUR';
  profil?: string;
  ville?: string;
  pointVenteId?: number;
  pointVenteNom?: string;
  pointVenteCode?: string;
}

interface AuthContextType {
  user: UserSession | null;
  activePointVenteId: number | null; // null means 'Tous les points de vente' (Admin only)
  activePointVenteNom: string;
  login: (userData: UserSession) => void;
  logout: () => void;
  setActivePointVente: (pvId: number | null, pvNom?: string) => void;
  isAdmin: boolean;
  isVendeur: boolean;
  isGerant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN: UserSession = {
  id: 1,
  nom: 'Direction Générale Sidibé',
  login: 'admin',
  role: 'ADMIN',
  profil: 'Administrateur Général (Accès Multi-Villes)',
  ville: 'Bamako',
  pointVenteId: 1,
  pointVenteNom: 'Siège & Agence Hamdallaye ACI',
  pointVenteCode: 'BAM-01',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(DEFAULT_ADMIN);
  const [activePointVenteId, setActivePointVenteId] = useState<number | null>(null);
  const [activePointVenteNom, setActivePointVenteNom] = useState<string>('Vue Consolidée (Toutes les Villes)');

  useEffect(() => {
    // Load persisted user session from localStorage
    const saved = localStorage.getItem('sidibe_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        if (parsed.role !== 'ADMIN' && parsed.pointVenteId) {
          setActivePointVenteId(parsed.pointVenteId);
          setActivePointVenteNom(parsed.pointVenteNom || 'Ma Boutique');
        }
      } catch {}
    }
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem('sidibe_user_session', JSON.stringify(userData));
    if (userData.role !== 'ADMIN' && userData.pointVenteId) {
      setActivePointVenteId(userData.pointVenteId);
      setActivePointVenteNom(userData.pointVenteNom || 'Ma Boutique');
    } else {
      setActivePointVenteId(null);
      setActivePointVenteNom('Vue Consolidée (Toutes les Villes)');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sidibe_user_session');
  };

  const setActivePointVente = (pvId: number | null, pvNom?: string) => {
    setActivePointVenteId(pvId);
    setActivePointVenteNom(pvNom || (pvId ? `Boutique #${pvId}` : 'Vue Consolidée (Toutes les Villes)'));
  };

  const isAdmin = user?.role === 'ADMIN';
  const isGerant = user?.role === 'GERANT';
  const isVendeur = user?.role === 'VENDEUR';

  return (
    <AuthContext.Provider
      value={{
        user,
        activePointVenteId,
        activePointVenteNom,
        login,
        logout,
        setActivePointVente,
        isAdmin,
        isVendeur,
        isGerant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
