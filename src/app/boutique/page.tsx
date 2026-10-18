'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Search,
  Filter,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Store,
  Layers,
  ArrowRight,
  Eye,
  Info,
  Check,
  Send,
  Printer,
  ShoppingBag,
  ExternalLink,
  Tag,
  Star,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Variante {
  id: number;
  taille?: string;
  couleur?: string;
  reference?: string;
  prix: number;
  coutAchat?: number;
  quantiteStock: number;
}

interface Produit {
  id: number;
  nom: string;
  ref?: string;
  description?: string;
  categorieNom?: string;
  imageUrl?: string;
  variantes: Variante[];
}

interface CartItem {
  produitId: number;
  varianteId: number;
  nom: string;
  varianteInfo: string;
  prix: number;
  quantite: number;
  maxStock: number;
  categorieNom?: string;
  imageUrl?: string;
}

const CATEGORIES_ICONS: Record<string, string> = {
  Tapis: '🏠',
  Rideaux: '🪟',
  'Panneaux Muraux': '🧱',
  'Draps & Linge de Lit': '🛏️',
  'Couettes & Couvertures': '🛌',
  'Oreillers & Coussins': '🛋️',
  'Housses de Canapé & Fauteuil': '🛋️',
  'Décoration Murale': '🖼️',
  'Luminaires & Lampes': '💡',
  'Vases & Objets Décoratifs': '🏺',
  'Accessoires de Décoration Maison': '✨',
  Accessoires: '👜',
};

// Photos de référence haute qualité adaptées aux collections de Sidibe Services
const CATEGORIES_DEFAULT_IMAGES: Record<string, string> = {
  'Oreillers & Coussins': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
  Tapis: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
  Rideaux: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  'Barres & Accessoires pour Rideaux': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
  'Panneaux Muraux': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  'Draps & Linge de Lit': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  'Couettes & Couvertures': 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80',
  'Housses de Canapé & Fauteuil': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  'Décoration Murale': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'Luminaires & Lampes': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
  'Vases & Objets Décoratifs': 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
  'Accessoires de Décoration Maison': 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=800&q=80',
  Accessoires: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
};

// Formateur robuste de l'URL de l'image
const getProductImage = (produit?: { imageUrl?: string | null; categorieNom?: string | null }) => {
  if (!produit) return 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80';
  if (produit.imageUrl && produit.imageUrl.trim() !== '') {
    const url = produit.imageUrl.trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  }
  if (produit.categorieNom && CATEGORIES_DEFAULT_IMAGES[produit.categorieNom]) {
    return CATEGORIES_DEFAULT_IMAGES[produit.categorieNom];
  }
  return 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80';
};

const VILLES_GUINEE = [
  'Kankan',
  'Conakry',
  'Kindia',
  'Labé',
  'Nzérékoré',
  'Boké',
  'Mamou',
  'Siguiri',
  'Coyah',
  'Dubréka',
  'Fria',
  'Kamsar',
  'Kissidougou',
  'Macenta',
  'Guéckédou',
  'Autre',
];

export default function BoutiqueVitrinePage() {
  const { user } = useAuth();

  // Produits et données
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<{ id: number; nom: string }[]>([]);
  const [pointsDeVente, setPointsDeVente] = useState<{ id: number; nom: string; ville: string; telephone?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'prix-asc' | 'prix-desc' | 'nom'>('default');

  // Panier
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Modal Produit
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [modalVarianteId, setModalVarianteId] = useState<number | null>(null);
  const [modalQuantite, setModalQuantite] = useState(1);

  // Modal Commande (Checkout)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    reference: string;
    nomClient: string;
    total: number;
    nbArticles: number;
  } | null>(null);

  // Formulaire de commande
  const [formData, setFormData] = useState({
    nomClient: '',
    telephoneClient: '',
    ville: 'Kankan',
    adresse: '',
    typeLivraison: 'LIVRAISON', // LIVRAISON ou RETRAIT_BOUTIQUE
    modePaiement: 'A_LA_LIVRAISON', // A_LA_LIVRAISON ou ORANGE_MONEY
    notes: '',
  });

  // Notification Toast d'ajout
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Chargement des produits vitrine
  const fetchBoutiqueData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/boutique/produits');
      const data = await res.json();
      if (data.success) {
        setProduits(data.produits || []);
        setCategories(data.categories || []);
        setPointsDeVente(data.pointsDeVente || []);
      }
    } catch (err) {
      console.error('Erreur chargement vitrine:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoutiqueData();
  }, []);

  // Liste des catégories déduites des produits et db
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => {
      if (p.categorieNom) set.add(p.categorieNom);
    });
    categories.forEach((c) => {
      if (c.nom) set.add(c.nom);
    });
    return Array.from(set);
  }, [produits, categories]);

  // Filtrage et Tri des produits
  const filteredProduits = useMemo(() => {
    let result = [...produits];

    if (selectedCategorie !== 'all') {
      result = result.filter((p) => p.categorieNom === selectedCategorie);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.ref && p.ref.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.categorieNom && p.categorieNom.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'prix-asc') {
      result.sort((a, b) => {
        const pA = a.variantes[0]?.prix || 0;
        const pB = b.variantes[0]?.prix || 0;
        return pA - pB;
      });
    } else if (sortBy === 'prix-desc') {
      result.sort((a, b) => {
        const pA = a.variantes[0]?.prix || 0;
        const pB = b.variantes[0]?.prix || 0;
        return pB - pA;
      });
    } else if (sortBy === 'nom') {
      result.sort((a, b) => a.nom.localeCompare(b.nom));
    }

    return result;
  }, [produits, selectedCategorie, searchQuery, sortBy]);

  // Ajouter au panier
  const handleAddToCart = (produit: Produit, varianteChoisie?: Variante, quantite: number = 1) => {
    const v = varianteChoisie || produit.variantes[0];
    if (!v) return;

    const varianteInfo = [v.taille, v.couleur].filter(Boolean).join(' • ') || 'Standard';

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.varianteId === v.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQte = updated[existingIndex].quantite + quantite;
        updated[existingIndex].quantite = Math.min(newQte, v.quantiteStock > 0 ? v.quantiteStock : 99);
        return updated;
      } else {
        return [
          ...prev,
          {
            produitId: produit.id,
            varianteId: v.id,
            nom: produit.nom,
            varianteInfo,
            prix: v.prix,
            quantite: Math.min(quantite, v.quantiteStock > 0 ? v.quantiteStock : 99),
            maxStock: v.quantiteStock,
            categorieNom: produit.categorieNom,
            imageUrl: getProductImage(produit),
          },
        ];
      }
    });

    showToast(`✅ "${produit.nom}" (${varianteInfo}) ajouté au panier !`);
  };

  // Mettre à jour quantité dans panier
  const updateCartQuantity = (varianteId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.varianteId === varianteId) {
            const nextQte = item.quantite + delta;
            return { ...item, quantite: Math.max(1, nextQte) };
          }
          return item;
        })
        .filter((item) => item.quantite > 0)
    );
  };

  // Supprimer du panier
  const removeFromCart = (varianteId: number) => {
    setCart((prev) => prev.filter((item) => item.varianteId !== varianteId));
  };

  // Totaux du panier
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantite, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  // Soumission de commande
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!formData.nomClient || !formData.telephoneClient) {
      alert('Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/boutique/commande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          nomClient: formData.nomClient,
          telephoneClient: formData.telephoneClient,
          ville: formData.ville,
          adresse: formData.adresse,
          typeLivraison: formData.typeLivraison,
          modePaiement: formData.modePaiement,
          notes: formData.notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOrderSuccess(json.commande);
        setCart([]);
        setCheckoutOpen(false);
      } else {
        alert(json.error || 'Erreur lors de la validation de la commande');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau lors de la validation');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Ouvrir fiche produit
  const openProductModal = (produit: Produit) => {
    setSelectedProduit(produit);
    setModalVarianteId(produit.variantes[0]?.id || null);
    setModalQuantite(1);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* =========================================================================
          BARRE DE NOTIFICATION DU HAUT (TOP BANNER)
      ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-black/10">🇬🇳</span>
            <span>SIDIBE SERVICES • Kankan & Livraison dans toute la Guinée</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> +224 622 48 81 61
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Ouvert 7j/7 : 08h - 18h
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HEADER / NAVBAR AVEC BOUTON LOGIN DANS L'ONGLET
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo et Nom de l'Enseigne */}
          <Link href="/boutique" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0b101b] rounded-[14px] flex items-center justify-center">
                <img
                src="/img/logo.png"
                alt="Logo SIDIBE SERVICE"
                className="w-full h-full object-cover"
              />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  SIDIBE <span className="text-gold-gradient">SERVICES</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase">
                  Boutique
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden xs:block">
                Décoration • Tapis • Linge de Lit • Intérieur
              </p>
            </div>
          </Link>

          {/* Barre de recherche au centre (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher tapis, rideaux, couette, taille..."
                className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Actions Droite : Panier & BOUTON LOGIN DANS L'ONGLET */}
          <div className="flex items-center gap-3">
            {/* Bouton Panier Interactif */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all flex items-center gap-2.5 shadow-sm"
              title="Voir mon panier"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[11px] flex items-center justify-center animate-pulse">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Mon Panier</p>
                <p className="font-bold text-amber-400 leading-none">{formatCurrency(totalCartPrice)}</p>
              </div>
            </button>

            {/* ⭐ LE BOUTON LOGIN DANS L'ONGLET (Demandé par l'utilisateur) ⭐ */}
            {user ? (
              <Link
                href="/"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-bold text-xs transition-all shadow-md group"
                title="Accéder au Tableau de Bord ERP"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400 group-hover:rotate-6 transition-transform" />
                <span className="hidden sm:inline">Tableau de Bord</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                  {user.role}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl btn-gold text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 group"
                title="Connexion Espace Équipe / Gestionnaire"
              >
                <LogIn className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Connexion / Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Barre de recherche sur Mobile */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des articles déco, rideaux..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER VITRINE HAUT DE GAMME
      ========================================================================= */}
      <section className="relative overflow-hidden border-b border-slate-800/80 py-10 sm:py-20 min-h-[520px] flex items-center">
        {/* ── Image de fond luxueuse : mosaïque décoration intérieure ── */}
        <div className="absolute inset-0 z-0">
          {/* Photo principale : rideaux luxueux */}
          <img
            src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1800&q=85"
            alt="Rideaux luxueux Sidibe Services"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlay gradient sombre pour lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a12]/95 via-[#080c14]/80 to-[#0a0f1e]/60" />
          {/* Bandes latérales pour images secondaires flottantes */}
          <div className="absolute top-0 right-0 bottom-0 w-1/3 overflow-hidden hidden lg:block">
            <div className="absolute top-0 right-0 bottom-0 w-full grid grid-rows-2 gap-1 opacity-70">
              <img
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=700&q=80"
                alt="Draps grand luxe"
                className="w-full h-full object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=700&q=80"
                alt="Coussins décoratifs"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Overlay dégradé sur les images de droite */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#080c14] via-[#080c14]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-[#080c14]/40 to-transparent" />
          </div>
          {/* Grain de texture subtil */}
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'url(https://grainy-gradients.vercel.app/noise.svg)'}} />
        </div>

        {/* Cercles lumineux d'ambiance (par-dessus l'image) */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none z-[1]" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none z-[1]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold tracking-wide backdrop-blur-sm shadow-lg shadow-amber-500/10">
                <Sparkles className="w-3.5 h-3.5" />
                Collection Intérieure &amp; Décoration 2026
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Sublimez Votre Intérieur avec <span className="text-gold-gradient">SIDIBE SERVICES</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed drop-shadow-lg">
                Tapis raffinés, rideaux majestueux, panneaux muraux 3D, couettes et parures de lit grand luxe.
                Commandez directement en ligne avec livraison rapide ou retrait en boutique à Kankan.
              </p>

              {/* Texte décoratif filigrane subtil */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-amber-400/70 tracking-[0.2em] uppercase">
                <span className="w-8 h-px bg-amber-400/40" />
                <span>Décoration Premium • Guinée</span>
                <span className="w-8 h-px bg-amber-400/40" />
              </div>

              {/* Badges de confiance */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-200 shadow-lg">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Livraison Kankan &amp; Guinée</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-200 shadow-lg">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Retrait Gratuit en Magasin</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-200 shadow-lg">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Paiement à la Livraison</span>
                </div>
              </div>
            </div>

            {/* Carte promotionnelle d'accueil — Glassmorphism */}
            <div className="w-full lg:w-96 rounded-3xl bg-black/50 backdrop-blur-xl p-6 border border-amber-500/30 shadow-2xl shadow-black/60 relative overflow-hidden">
              {/* Bord lumineux doré subtil */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/5 rounded-full blur-xl" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Service Express
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Boutiques Ouvertes
                </span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Comment passer commande ?</h3>
              <ul className="space-y-2 text-xs text-slate-300 mb-5">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">1.</span>
                  <span>Choisissez vos articles et variantes préférés</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">2.</span>
                  <span>Ajoutez au panier et saisissez votre numéro de téléphone</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">3.</span>
                  <span>Nous vous appelons immédiatement pour valider et livrer !</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  const el = document.getElementById('catalogue-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 rounded-2xl btn-gold text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <span>Explorer le Catalogue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SÉLECTEUR DE CATÉGORIES (HORIZONTAL SCROLL)
      ========================================================================= */}
      <section className="bg-[#090d17] border-b border-slate-800/80 py-4 sticky top-[69px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
            <button
              onClick={() => setSelectedCategorie('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategorie === 'all'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
            >
              <span>✨</span>
              <span>Tous les Produits</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {produits.length}
              </span>
            </button>

            {allCategories.map((cat) => {
              const count = produits.filter((p) => p.categorieNom === cat).length;
              const icon = CATEGORIES_ICONS[cat] || '📦';
              const isSelected = selectedCategorie === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategorie(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${isSelected
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20' : 'bg-slate-800 text-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          CATALOGUE PRODUITS & GRILLE E-COMMERCE
      ========================================================================= */}
      <main id="catalogue-section" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Barre de Filtres & Tri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>{selectedCategorie === 'all' ? 'Catalogue Complet' : selectedCategorie}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-bold border border-slate-700">
                {filteredProduits.length} article(s)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Disponibles pour commande immédiate à Kankan et expédition
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="default">Pertinence</option>
              <option value="prix-asc">Prix le plus bas</option>
              <option value="prix-desc">Prix le plus élevé</option>
              <option value="nom">Nom de A à Z</option>
            </select>

            <button
              onClick={fetchBoutiqueData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Grille de Produits */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse flex flex-col p-4 justify-between"
              >
                <div className="h-44 rounded-2xl bg-slate-800/60" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProduits.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-slate-900/40 border border-slate-800 p-8">
            <Store className="w-16 h-16 mx-auto mb-3 text-slate-600" />
            <h3 className="text-lg font-bold text-white mb-1">Aucun produit ne correspond à votre recherche</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
              Essayez de modifier votre mot-clé ou sélectionnez une autre catégorie d&apos;articles.
            </p>
            <button
              onClick={() => {
                setSelectedCategorie('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-2xl btn-gold text-xs font-bold"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProduits.map((produit, index) => {
              const premiereVariante = produit.variantes[0];
              const prix = premiereVariante?.prix || 0;
              const enStock = produit.variantes.some((v) => v.quantiteStock > 0);
              const totalStock = produit.variantes.reduce((sum, v) => sum + v.quantiteStock, 0);
              const iconCat = CATEGORIES_ICONS[produit.categorieNom || ''] || '✨';

              return (
                <motion.div
                  key={produit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group rounded-3xl bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1"
                >
                  {/* Visuel du Produit */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-800/80 to-slate-950 flex items-center justify-center p-4 overflow-hidden border-b border-slate-800/60">
                    {/* Badge Catégorie */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 text-amber-400 flex items-center gap-1 backdrop-blur-sm">
                        <span>{iconCat}</span>
                        <span>{produit.categorieNom || 'Décoration'}</span>
                      </span>
                    </div>

                    {/* Badge Stock */}
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${enStock
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                      >
                        {enStock ? `En Stock (${totalStock})` : 'Sur Commande'}
                      </span>
                    </div>

                    {/* Image du Produit */}
                    <div className="w-full h-full relative overflow-hidden rounded-2xl">
                      <img
                        src={getProductImage(produit)}
                        alt={produit.nom}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = CATEGORIES_DEFAULT_IMAGES[produit.categorieNom || ''] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    </div>

                    {/* Bouton d'Aperçu Rapide au survol */}
                    <button
                      onClick={() => openProductModal(produit)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-xs"
                    >
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>Voir la fiche</span>
                    </button>
                  </div>

                  {/* Contenu de la Carte */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        onClick={() => openProductModal(produit)}
                        className="font-bold text-white text-sm hover:text-amber-400 cursor-pointer transition-colors line-clamp-1"
                      >
                        {produit.nom}
                      </h3>

                      {produit.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {produit.description}
                        </p>
                      )}

                      {/* Variantes disponibles */}
                      {produit.variantes.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {produit.variantes.slice(0, 3).map((v) => (
                            <span
                              key={v.id}
                              className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {[v.taille, v.couleur].filter(Boolean).join(' ')}
                            </span>
                          ))}
                          {produit.variantes.length > 3 && (
                            <span className="text-[9px] text-slate-500">+{produit.variantes.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Prix et Bouton d'Ajout */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Prix unitaire</span>
                        <span className="text-base font-black text-amber-400">
                          {formatCurrency(prix)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(produit)}
                        className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95"
                        title="Ajouter au panier"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span className="text-xs font-black">Ajouter</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          TIROIR LATÉRAL PANIER (DRAWER / CART)
      ========================================================================= */}
      <AnimatePresence>
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Contenu Panier */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10"
            >
              {/* Entête Panier */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Mon Panier</h3>
                    <p className="text-xs text-slate-400">{totalCartCount} article(s) sélectionné(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Liste des articles */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="py-20 text-center text-slate-500">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold text-slate-400">Votre panier est encore vide</p>
                    <p className="text-xs text-slate-500 mt-1">Parcourez le catalogue et ajoutez vos articles coups de cœur !</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.varianteId}
                      className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center gap-3"
                    >
                      {/* Image miniature du produit dans le panier */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center flex-shrink-0 relative">
                        <img
                          src={item.imageUrl || getProductImage({ categorieNom: item.categorieNom })}
                          alt={item.nom}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = CATEGORIES_DEFAULT_IMAGES[item.categorieNom || ''] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{item.nom}</h4>
                        <p className="text-[11px] text-amber-400/90 font-medium">{item.varianteInfo}</p>
                        <p className="text-xs font-black text-white mt-0.5">{formatCurrency(item.prix)}</p>
                      </div>

                      {/* Contrôle Quantité */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
                        <button
                          onClick={() => updateCartQuantity(item.varianteId, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-white">{item.quantite}</span>
                        <button
                          onClick={() => updateCartQuantity(item.varianteId, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.varianteId)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Retirer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Panier */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-slate-800 bg-slate-950/80 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total des articles :</span>
                    <span className="text-xl font-black text-amber-400">{formatCurrency(totalCartPrice)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Frais de livraison calculés à l&apos;étape suivante (Retrait gratuit en magasin).
                  </p>

                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 rounded-2xl btn-gold text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/10"
                  >
                    <span>Passer la Commande</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL FICHE PRODUIT DÉTAILLÉE
      ========================================================================= */}
      <AnimatePresence>
        {selectedProduit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduit(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Bouton Fermer */}
              <button
                onClick={() => setSelectedProduit(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/40 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Visuel du Produit dans le Modal */}
                <div className="bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 relative min-h-[280px]">
                  <div className="w-full h-64 sm:h-80 relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
                    <img
                      src={getProductImage(selectedProduit)}
                      alt={selectedProduit.nom}
                      className="w-full h-full object-cover sm:object-contain rounded-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = CATEGORIES_DEFAULT_IMAGES[selectedProduit.categorieNom || ''] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                      Réf: {selectedProduit.ref || 'SIDIBE-ART'}
                    </div>
                  </div>
                </div>

                {/* Infos & Choix */}
                <div className="p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {selectedProduit.categorieNom || 'Décoration'}
                    </span>
                    <h2 className="text-xl font-black text-white">{selectedProduit.nom}</h2>
                    {selectedProduit.description && (
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedProduit.description}</p>
                    )}

                    {/* Sélection des variantes */}
                    {selectedProduit.variantes.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <label className="text-xs font-bold text-slate-400 block">
                          Choisir le modèle / dimension :
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedProduit.variantes.map((v) => {
                            const isSelected = modalVarianteId === v.id;
                            const info = [v.taille, v.couleur].filter(Boolean).join(' • ') || 'Standard';
                            return (
                              <button
                                key={v.id}
                                onClick={() => setModalVarianteId(v.id)}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${isSelected
                                    ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                                  }`}
                              >
                                <span>{info}</span>
                                <span className="font-bold text-amber-400">{formatCurrency(v.prix)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quantité */}
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">Quantité :</span>
                      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1">
                        <button
                          onClick={() => setModalQuantite((q) => Math.max(1, q - 1))}
                          className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-white">{modalQuantite}</span>
                        <button
                          onClick={() => setModalQuantite((q) => q + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() => {
                        const v = selectedProduit.variantes.find((x) => x.id === modalVarianteId);
                        handleAddToCart(selectedProduit, v, modalQuantite);
                        setSelectedProduit(null);
                      }}
                      className="flex-1 py-3 rounded-2xl btn-gold text-slate-950 font-black text-xs flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Ajouter au Panier</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL FINALISATION DE COMMANDE (CHECKOUT FORMULAIRE CLIENT)
      ========================================================================= */}
      <AnimatePresence>
        {checkoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Finaliser ma Commande</h2>
                    <p className="text-xs text-slate-400">
                      Total : <span className="text-amber-400 font-bold">{formatCurrency(totalCartPrice)}</span> ({totalCartCount} articles)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Récapitulatif visuel des articles commandés avec leurs images */}
              <div className="mb-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 max-h-44 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Articles de la commande ({cart.length})
                </span>
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.varianteId} className="flex items-center gap-2.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700/60">
                        <img
                          src={c.imageUrl || getProductImage({ categorieNom: c.categorieNom })}
                          alt={c.nom}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = CATEGORIES_DEFAULT_IMAGES[c.categorieNom || ''] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs truncate">{c.nom}</p>
                        <p className="text-[10px] text-amber-400">{c.varianteInfo} • Qté: {c.quantite}</p>
                      </div>
                      <span className="text-xs font-black text-white whitespace-nowrap">
                        {formatCurrency(c.prix * c.quantite)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {/* Nom & Téléphone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Votre Nom & Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ibrahima Sidibe"
                    value={formData.nomClient}
                    onChange={(e) => setFormData((f) => ({ ...f, nomClient: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Numéro de Téléphone (Guinée) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 622 48 81 61"
                    value={formData.telephoneClient}
                    onChange={(e) => setFormData((f) => ({ ...f, telephoneClient: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Mode de réception */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, typeLivraison: 'LIVRAISON' }))}
                    className={`p-3 rounded-2xl border text-left text-xs transition-all ${formData.typeLivraison === 'LIVRAISON'
                        ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-amber-400" />
                      <span>Livraison à Domicile</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal">À Kankan ou ville de votre choix</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, typeLivraison: 'RETRAIT_BOUTIQUE' }))}
                    className={`p-3 rounded-2xl border text-left text-xs transition-all ${formData.typeLivraison === 'RETRAIT_BOUTIQUE'
                        ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span>Retrait en Boutique</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal">Gratuit dans notre agence</p>
                  </button>
                </div>

                {/* Ville & Adresse */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Ville</label>
                    <select
                      value={formData.ville}
                      onChange={(e) => setFormData((f) => ({ ...f, ville: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {VILLES_GUINEE.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Quartier / Adresse
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Quartier Energie, Kankan"
                      value={formData.adresse}
                      onChange={(e) => setFormData((f) => ({ ...f, adresse: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Mode de paiement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mode de Règlement Préféré
                  </label>
                  <select
                    value={formData.modePaiement}
                    onChange={(e) => setFormData((f) => ({ ...f, modePaiement: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="A_LA_LIVRAISON">💵 Espèces à la livraison / au retrait</option>
                    <option value="ORANGE_MONEY">📱 Orange Money Guinée</option>
                    <option value="VIREMENT">🏦 Virement / Dépôt Bancaire</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Précisions ou commentaires (optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instructions particulières de livraison..."
                    value={formData.notes}
                    onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold hover:text-white text-xs"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="flex-2 py-3 rounded-2xl btn-gold text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/10"
                  >
                    {submittingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Confirmer ma Commande ({formatCurrency(totalCartPrice)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL DE CONFIRMATION COMMANDE RÉUSSIE
      ========================================================================= */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-10"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-2xl font-black text-white mb-1">Commande Confirmée !</h2>
              <p className="text-xs text-slate-300 mb-4">
                Merci <span className="font-bold text-white">{orderSuccess.nomClient}</span>, votre commande a bien été reçue par notre équipe.
              </p>

              {/* Récépissé */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Numéro de Commande :</span>
                  <span className="font-mono font-bold text-amber-400">{orderSuccess.reference}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Nombre d&apos;articles :</span>
                  <span className="font-bold text-white">{orderSuccess.nbArticles} article(s)</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">Montant Total :</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatCurrency(orderSuccess.total)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left mb-6 flex items-start gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <p>
                  Notre service commercial va vous contacter très rapidement sur votre numéro pour confirmer l&apos;heure et le lieu exact de livraison.
                </p>
              </div>

              <button
                onClick={() => setOrderSuccess(null)}
                className="w-full py-3 rounded-2xl btn-gold text-slate-950 font-black text-xs"
              >
                Continuer mes achats
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          TOAST DE NOTIFICATION D'AJOUT PANIER
      ========================================================================= */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 border border-amber-500/40 text-white text-xs font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <div className="p-1 rounded-full bg-amber-500/20 text-amber-400">
              <Check className="w-4 h-4" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          PIED DE PAGE (FOOTER E-COMMERCE)
      ========================================================================= */}
      <footer className="mt-auto bg-[#070a12] border-t border-slate-800 py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Colonne 1 : À Propos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <span className="font-black text-white text-sm tracking-tight">SIDIBE SERVICES</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Spécialiste de la décoration d&apos;intérieur, des tapis de luxe, du linge de lit et des rideaux de qualité supérieure en République de Guinée.
              </p>
            </div>

            {/* Colonne 2 : Catégories phares */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Rayons Populaires</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>Tapis de Salon & Chambre</li>
                <li>Rideaux & Voilages</li>
                <li>Panneaux Muraux 3D</li>
                <li>Draps & Parures de Lit</li>
                <li>Couettes & Couvertures</li>
              </ul>
            </div>

            {/* Colonne 3 : Boutiques & Retrait */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Nos Agences</h4>
              <p className="text-[11px] text-slate-300 font-medium">Agence Principale : Kankan Centre</p>
              <p className="text-[11px]">Expédition vers : Conakry, Siguiri, Kindia, Labé, Nzérékoré et tout le pays.</p>
              <p className="text-[11px] text-amber-400 font-bold mt-2">Retrait possible directement en magasin.</p>
            </div>

            {/* Colonne 4 : Espace Pro & Contact */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Espace Pro & Équipe</h4>
              <p className="text-[11px]">
                Vous êtes vendeur, caissier, gérant ou administrateur de boutique ?
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Sidibe Services. Tous droits réservés.</p>
            <p>Développé par COTECH SERVICES</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
