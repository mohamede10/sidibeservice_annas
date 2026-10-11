'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Plus,
  Search,
  Package,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AchatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Truck className="w-6 h-6" />
            </span>
            Achats Fournisseurs & Réceptions de Stock
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enregistrement des approvisionnements, factures fournisseurs et entrées en stock.
          </p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-3">
        <Package className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
        <h3 className="text-lg font-bold text-white">Module d&apos;Approvisionnement</h3>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Les réceptions fournisseurs augmentent automatiquement les quantités en stock et mettent à jour le coût moyen pondéré (CMP).
        </p>
      </div>
    </div>
  );
}
