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
  isLoadingSession: boolean;
  activePointVenteId: number | null; // null means 'Tous les points de vente' (Admin only)
  activePointVenteNom: string;
  login: (userData: UserSession) => void;
  logout: () => void;
  setActivePointVente: (pvId: number | null, pvNom?: string) => void;
  isAdmin: boolean;
  isVendeur: boolean;
  isGerant: boolean;
  canManageProducts: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [activePointVenteId, setActivePointVenteId] = useState<number | null>(null);
  const [activePointVenteNom, setActivePointVenteNom] = useState<string>('Vue Consolidée (Toutes les Villes)');

  useEffect(() => {
    // Charger la session utilisateur persistée depuis localStorage
    try {
      const saved = localStorage.getItem('sidibe_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.login) {
          setUser(parsed);
          if (parsed.role === 'VENDEUR' && parsed.pointVenteId) {
            setActivePointVenteId(parsed.pointVenteId);
            setActivePointVenteNom(parsed.pointVenteNom || 'Ma Boutique');
          } else if (parsed.role === 'GERANT' && parsed.pointVenteId) {
            setActivePointVenteId(parsed.pointVenteId);
            setActivePointVenteNom(parsed.pointVenteNom || 'Ma Boutique');
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSession(false);
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
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const setActivePointVente = (pvId: number | null, pvNom?: string) => {
    // Si c'est un vendeur, il ne peut pas changer de boutique
    if (user?.role === 'VENDEUR' && user.pointVenteId) {
      setActivePointVenteId(user.pointVenteId);
      setActivePointVenteNom(user.pointVenteNom || 'Ma Boutique');
      return;
    }
    setActivePointVenteId(pvId);
    setActivePointVenteNom(pvNom || (pvId ? `Boutique #${pvId}` : 'Vue Consolidée (Toutes les Villes)'));
  };

  const isAdmin = user?.role === 'ADMIN';
  const isGerant = user?.role === 'GERANT';
  const isVendeur = user?.role === 'VENDEUR';
  const canManageProducts = isAdmin || isGerant;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingSession,
        activePointVenteId,
        activePointVenteNom,
        login,
        logout,
        setActivePointVente,
        isAdmin,
        isVendeur,
        isGerant,
        canManageProducts,
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
