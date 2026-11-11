'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CompanySettings {
  // Identité de l'entreprise
  companyName: string;
  logoUrl: string;
  description?: string;
  telephone?: string;
  email?: string;
  adresse?: string;

  // Configuration notifications
  notifEmailActive?: boolean;
  notifSmsActive?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  adminEmailNotif?: string;

  // Configuration stock
  seuilStockFaible?: number;

  // Configuration monnaie & commerce
  devise?: string;
  symboleDevise?: string;
  tvaTaux?: number;
  tvaActive?: boolean;

  // Configuration sécurité
  tentativesConnexionMax?: number;
  dureeSessionHeures?: number;
}

const defaultSettings: CompanySettings = {
  companyName: 'SIDIBE SERVICES',
  logoUrl: '/img/logo.jpeg',
  description: 'Décoration, rideaux, linge de lit, tapis et mobilier en Guinée',
  telephone: '+224 622 48 81 61',
  email: 'sidibeoumar413@gmail.com',
  adresse: 'Kankan • Siguiri • Conakry — République de Guinée',
  // Notifications
  notifEmailActive: false,
  notifSmsActive: true,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: '',
  adminEmailNotif: '',
  // Stock
  seuilStockFaible: 5,
  // Monnaie
  devise: 'GNF',
  symboleDevise: 'GNF',
  tvaTaux: 18,
  tvaActive: false,
  // Sécurité
  tentativesConnexionMax: 5,
  dureeSessionHeures: 8,
};

interface SettingsContextType {
  settings: CompanySettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  updateSettings: async () => false,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur sauvegarde paramètres:', err);
      return false;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

