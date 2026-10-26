'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Sparkles,
  User,
  Package,
  Layers,
  ArrowRight,
  Receipt,
  X,
  FileText,
  MessageCircle,
  Mail,
  Store,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { printInvoice, getWhatsAppInvoiceUrl, getEmailInvoiceUrl, InvoiceData } from '@/lib/invoicePdf';

interface Variante {
  id: number;
  taille?: string;
  couleur?: string;
  prix: number;
  coutAchat?: number;
  quantiteStock: number;
  reference?: string;
}

interface Produit {
  id: number;
  nom: string;
  ref?: string;
  description?: string;
  categorieId?: number;
  categorieNom?: string;
  imageUrl?: string;
  variantes: Variante[];
}

interface CartItem {
  produitId: number;
  varianteId: number;
  nom: string;
  taille?: string;
  couleur?: string;
  prix: number;
  coutAchat?: number;
  quantite: number;
  stockDisponible: number;
}

interface Client {
  id: number;
  nom: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  ville?: string;
  soldeDette: number;
}

export default function PosPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; nom: string }>>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Cart & Client state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Champs client obligatoires et facultatifs
  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');
  const [clientAdresse, setClientAdresse] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Orange Money
  const [orangeMoneyRef, setOrangeMoneyRef] = useState('');

  // Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [modePaiement, setModePaiement] = useState<string>('ESPECES');
  const [montantRecu, setMontantRecu] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    reference: string;
    total: number;
    montantPaye: number;
    montantRestant: number;
    modePaiement: string;
    nomClient: string;
    telephoneClient?: string;
    adresseClient?: string;
    emailClient?: string;
    dateVente: string;
    boutiqueNom: string;
    boutiqueVille?: string;
    boutiqueAdresse?: string;
    boutiqueTelephone?: string;
    lignes: Array<{ nomProduit: string; varianteInfo?: string; quantite: number; prixUnitaire: number; totalLigne: number }>;
  } | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodRes, clientRes] = await Promise.all([
          fetch('/api/produits'),
          fetch('/api/clients'),
        ]);
        const prodData = await prodRes.json();
        const clientData = await clientRes.json();

        if (prodData.success) {
          setProduits(prodData.produits || []);
          setCategories(prodData.categories || []);
        }
        if (clientData.success) {
          setClients(clientData.clients || []);
        }
      } catch (err) {
        console.error('Erreur chargement POS:', err);
        showError('Impossible de charger le catalogue de la caisse.', 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = produits.filter((p) => {
    const matchSearch =
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ref && p.ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.categorieNom && p.categorieNom.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCategory = selectedCategory ? p.categorieId === selectedCategory : true;
    return matchSearch && matchCategory;
  });

  // Filtered Clients for dropdown
  const filteredClients = clients.filter((c) =>
    c.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.telephone && c.telephone.includes(clientSearch))
  );

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0);
  const montantPayeNumerique = parseFloat(montantRecu) || 0;
  const monnaieARendre = Math.max(0, montantPayeNumerique - subtotal);
  const resteDu = Math.max(0, subtotal - montantPayeNumerique);

  // Add item to cart
  const addToCart = (produit: Produit, variante?: Variante) => {
    const selectedVar = variante || produit.variantes[0];
    if (!selectedVar) return;

    if (selectedVar.quantiteStock <= 0) {
      showWarning(`Rupture de stock pour « ${produit.nom} ».`);
      return;
    }

    const existing = cart.find((item) => item.varianteId === selectedVar.id);
    if (existing && existing.quantite >= selectedVar.quantiteStock) {
      showWarning(`Stock insuffisant. Maximum ${selectedVar.quantiteStock} disponible(s).`);
      return;
    }

    setCart((prev) => {
      const alreadyInCart = prev.find((item) => item.varianteId === selectedVar.id);
      if (alreadyInCart) {
        return prev.map((item) =>
          item.varianteId === selectedVar.id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          produitId: produit.id,
          varianteId: selectedVar.id,
          nom: produit.nom,
          taille: selectedVar.taille,
          couleur: selectedVar.couleur,
          prix: selectedVar.prix,
          coutAchat: selectedVar.coutAchat,
          quantite: 1,
          stockDisponible: selectedVar.quantiteStock,
        },
      ];
    });
  };

  // Update item quantity
  const updateQuantity = (varianteId: number, delta: number) => {
    const item = cart.find((c) => c.varianteId === varianteId);
    if (!item) return;
    if (delta > 0 && item.quantite >= item.stockDisponible) {
      showWarning(`Stock insuffisant. Maximum ${item.stockDisponible} disponible(s).`);
      return;
    }
    setCart((prev) =>
      prev
        .map((cartItem) => {
          if (cartItem.varianteId === varianteId) {
            const newQty = cartItem.quantite + delta;
            return newQty > 0 ? { ...cartItem, quantite: newQty } : null;
          }
          return cartItem;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove item from cart
  const removeFromCart = (varianteId: number) => {
    setCart((prev) => prev.filter((item) => item.varianteId !== varianteId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setClientSearch('');
    setClientNom('');
    setClientTelephone('');
    setClientAdresse('');
    setClientEmail('');
    setOrangeMoneyRef('');
  };

  // Sélection d'un client dans la liste
  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setClientNom(c.nom);
    setClientTelephone(c.telephone || '');
    setClientAdresse(c.adresse || '');
    setClientEmail(c.email || '');
    setClientSearch(c.nom);
    setShowClientDropdown(false);
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      showWarning('Le panier est vide. Ajoutez au moins un article.');
      return;
    }
    if (!clientNom && clientSearch) {
      setClientNom(clientSearch.trim());
    }
    setMontantRecu(String(subtotal));
    setIsCheckoutModalOpen(true);
  };

  const { user, activePointVenteId, activePointVenteNom } = useAuth();

  // Submit Checkout
  const handleValidateSale = async () => {
    if (cart.length === 0) return;

    const nomFinal = clientNom.trim() || selectedClient?.nom || clientSearch.trim();
    const telFinal = clientTelephone.trim() || selectedClient?.telephone || '';
    const adrFinal = clientAdresse.trim() || selectedClient?.adresse || '';
    const emailFinal = clientEmail.trim() || selectedClient?.email || '';

    if (!nomFinal) {
      showWarning('Veuillez renseigner le nom du client.');
      return;
    }
    if (!telFinal) {
      showWarning('Veuillez renseigner le numéro de téléphone du client.');
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          clientId: selectedClient?.id,
          nomClient: nomFinal,
          telephoneClient: telFinal,
          adresseClient: adrFinal,
          emailClient: emailFinal,
          modePaiement: modePaiement === 'ORANGE_MONEY' && orangeMoneyRef ? `ORANGE_MONEY (Réf: ${orangeMoneyRef})` : modePaiement,
          montantPaye: modePaiement === 'CREDIT' ? 0 : montantPayeNumerique,
          pointVenteId: user?.pointVenteId || activePointVenteId || 1,
          vendeurId: user?.id,
          notes: orangeMoneyRef ? `Réf Orange Money: ${orangeMoneyRef}` : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCompletedSale({
          reference: json.vente.reference,
          total: subtotal,
          montantPaye: modePaiement === 'CREDIT' ? 0 : montantPayeNumerique,
          montantRestant: modePaiement === 'CREDIT' ? subtotal : resteDu,
          modePaiement,
          nomClient: nomFinal,
          telephoneClient: telFinal,
          adresseClient: adrFinal,
          emailClient: emailFinal,
          dateVente: new Date().toISOString(),
          boutiqueNom: activePointVenteNom || user?.pointVenteNom || 'Sidibe Services Boutique',
          boutiqueVille: user?.ville || 'Kankan',
          boutiqueTelephone: '+224 622 48 81 61',
          lignes: cart.map((c) => ({
            nomProduit: c.nom,
            varianteInfo: `${c.taille || ''} ${c.couleur || ''}`.trim(),
            quantite: c.quantite,
            prixUnitaire: c.prix,
            totalLigne: c.prix * c.quantite,
          })),
        });

        setIsCheckoutModalOpen(false);
        setIsReceiptModalOpen(true);
        clearCart();
        showSuccess('La vente a été enregistrée.', 'Vente validée');
      } else {
        showError(json.error || 'Erreur lors de la vente', 'Erreur vente');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Erreur réseau');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const buildCompletedInvoice = (): InvoiceData | null => {
    if (!completedSale) return null;
    return {
      numeroFacture: `FAC-${completedSale.reference.replace(/^VTE-/, '')}`,
      referenceVente: completedSale.reference,
      dateFacture: completedSale.dateVente,
      boutique: {
        nom: completedSale.boutiqueNom,
        ville: completedSale.boutiqueVille,
        adresse: completedSale.boutiqueAdresse,
        telephone: completedSale.boutiqueTelephone,
      },
      client: {
        nom: completedSale.nomClient,
        telephone: completedSale.telephoneClient,
        adresse: completedSale.adresseClient,
        email: completedSale.emailClient,
      },
      lignes: completedSale.lignes.map((l) => ({
        designation: l.nomProduit,
        varianteInfo: l.varianteInfo,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        totalLigne: l.totalLigne,
      })),
      total: completedSale.total,
      montantPaye: completedSale.montantPaye,
      montantRestant: completedSale.montantRestant,
      modePaiement: completedSale.modePaiement,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingCart className="w-6 h-6" />
            </span>
            Caisse & Point de Vente (POS)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Recherche instantanée des articles, panier direct, modes de règlement et impression de ticket/facture.
          </p>
        </div>
      </div>

      {/* POS Grid: Catalog Left (7 cols) + Cart Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Product Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search bar & Category filters */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scanner ou rechercher un produit (nom, réf, catégorie)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === null
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Tous les articles ({produits.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  {cat.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Product cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[680px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full text-center py-16 text-slate-500">
                Chargement du catalogue ({produits.length} articles)...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-500">
                Aucun produit trouvé pour cette recherche.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const mainVar = p.variantes[0];
                const stock = mainVar ? mainVar.quantiteStock : 0;
                const prix = mainVar ? mainVar.prix : 0;

                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(p)}
                    className="glass-card p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold uppercase tracking-wider">
                          {p.categorieNom || 'Mode'}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${stock > 5
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : stock > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                          {stock > 0 ? `${stock} en stock` : 'Rupture'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-2.5 line-clamp-2 group-hover:text-amber-300 transition-colors">
                        {p.nom}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Réf: {p.ref || `PRD-${p.id}`}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-base font-extrabold text-amber-400">
                        {formatCurrency(prix)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all font-bold"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Active Cart & Checkout Panel */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col glass-panel rounded-3xl p-5 border border-amber-500/20 shadow-2xl relative">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Panier de Vente</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                {totalItems}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vider
              </button>
            )}
          </div>

          {/* Customer Selector */}
          <div className="py-3 border-b border-slate-800 relative">
            <label className="text-xs font-medium text-slate-400 mb-1 block flex items-center justify-between">
              <span>Client associé :</span>
              {selectedClient && (
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                  }}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Détacher
                </button>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="Sélectionner ou saisir un client..."
                value={selectedClient ? selectedClient.nom : clientSearch}
                onFocus={() => setShowClientDropdown(true)}
                onChange={(e) => {
                  setSelectedClient(null);
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
            </div>

            {/* Dropdown list of clients */}
            {showClientDropdown && !selectedClient && filteredClients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-48 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1">
                {filteredClients.slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClient(c);
                      setShowClientDropdown(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">{c.nom}</p>
                      <p className="text-[10px] text-slate-400">{c.telephone || 'Sans numéro'}</p>
                    </div>
                    {c.soldeDette > 0 && (
                      <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Dette: {formatCurrency(c.soldeDette)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 my-3 space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                <Package className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
                Le panier est vide.<br />Cliquez sur un article pour l&apos;ajouter.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.varianteId}
                  className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{item.nom}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatCurrency(item.prix)} x {item.quantite}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.varianteId, -1)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-white w-6 text-center text-xs">
                      {item.quantite}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.varianteId, 1)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.varianteId)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Total & Checkout Trigger */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Sous-total :</span>
              <span className="font-semibold text-slate-200">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-black">
              <span className="text-white">TOTAL À PAYER :</span>
              <span className="text-amber-400">{formatCurrency(subtotal)}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${cart.length > 0
                  ? 'btn-gold'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                }`}
            >
              <span>Valider le Règlement</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT / PAIEMENT */}
      <AnimatedModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Validation & Règlement de la Vente"
        subtitle={`Total de la commande : ${formatCurrency(subtotal)}`}
      >
        <div className="space-y-5">
          {/* Section Informations Client (Obligatoires) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations du Client (Obligatoires)
              </span>
              {selectedClient && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Client sélectionné : {selectedClient.nom}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nom & Prénom du Client <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mamadou Diallo"
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Numéro de Téléphone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 622 XX XX XX"
                  value={clientTelephone}
                  onChange={(e) => setClientTelephone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Adresse / Ville / Quartier <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Kankan Centre, Rue Commerciale"
                  value={clientAdresse}
                  onChange={(e) => setClientAdresse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Email du Client <span className="text-slate-500 font-normal">(Facultatif)</span>
                </label>
                <input
                  type="email"
                  placeholder="Ex: client@gmail.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
              Choisir le mode de paiement :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'ESPECES', label: 'Espèces', icon: Banknote },
                { id: 'ORANGE_MONEY', label: 'Orange Money Guinée', icon: Smartphone },
                { id: 'WAVE', label: 'Wave', icon: Smartphone },
                { id: 'CARTE_BANCAIRE', label: 'Carte Bancaire', icon: CreditCard },
                { id: 'CREDIT', label: 'À Crédit (Dette)', icon: Receipt },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = modePaiement === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setModePaiement(m.id);
                      if (m.id === 'CREDIT') setMontantRecu('0');
                      else setMontantRecu(String(subtotal));
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${isSelected
                        ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Orange Money Banner with Merchant Code */}
          {modePaiement === 'ORANGE_MONEY' && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-2 text-orange-300">
                  <Smartphone className="w-4 h-4 text-orange-400" />
                  Paiement Orange Money Guinée
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 font-mono font-bold text-xs">
                  Code Marchand : 622 48 81 61
                </span>
              </div>
              <p className="text-[11px] text-orange-300/80">
                Faites composer au client le <strong>*144*4*4#</strong> ou <strong>#144#</strong>, saisissez le montant de{' '}
                <strong className="text-white">{formatCurrency(subtotal)}</strong> et le numéro marchand{' '}
                <strong className="text-white font-mono">622 48 81 61</strong>.
              </p>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Référence de Transaction Orange Money (ID SMS / Réf) :
                </label>
                <input
                  type="text"
                  placeholder="Ex: MP241024.1234.A12345"
                  value={orangeMoneyRef}
                  onChange={(e) => setOrangeMoneyRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-orange-500/40 text-white font-mono text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          )}

          {/* Amount inputs */}
          {modePaiement !== 'CREDIT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Montant Reçu :
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={montantRecu}
                    onChange={(e) => setMontantRecu(e.target.value)}
                    className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-base focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    GNF
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Monnaie à rendre :
                </label>
                <div className="py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-base font-black text-emerald-400">
                  {formatCurrency(monnaieARendre)}
                </div>
              </div>
            </div>
          )}

          {/* Client Notice if Debt */}
          {(modePaiement === 'CREDIT' || resteDu > 0) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <p className="font-bold">⚠️ Vente à crédit ou acompte partiel :</p>
              <p className="mt-0.5">
                Le montant restant dû ({formatCurrency(modePaiement === 'CREDIT' ? subtotal : resteDu)}) sera automatiquement ajouté au solde de dette du client{' '}
                <span className="font-bold underline">{clientNom || selectedClient?.nom || clientSearch || 'Client sélectionné'}</span>.
              </p>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Annuler
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={checkoutLoading}
              onClick={handleValidateSale}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2"
            >
              {checkoutLoading ? (
                <span>Validation en cours...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Encaisser & Facturer</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </AnimatedModal>

      {/* MODAL 2: RECEIPT / FACTURE IMPRIMABLE AVEC EXPORTS */}
      <AnimatedModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Facture / Reçu de Vente"
        subtitle={`Réf: ${completedSale?.reference || ''}`}
      >
        <div className="space-y-6">
          {/* Options de Partage Rapide (PDF, WhatsApp, Email) */}
          {completedSale && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Actions Client & Facturation
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const invoiceData = buildCompletedInvoice();
                    if (invoiceData) printInvoice(invoiceData);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Télécharger Facture PDF</span>
                </button>

                {completedSale.telephoneClient && (
                  <a
                    href={getWhatsAppInvoiceUrl(buildCompletedInvoice()!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500 shadow-md"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {completedSale.emailClient && (
                  <a
                    href={getEmailInvoiceUrl(buildCompletedInvoice()!)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-sky-500 shadow-md"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Printable Ticket Area */}
          <div id="printable-area" className="p-6 rounded-2xl bg-white text-slate-900 font-sans shadow-lg space-y-4">
            {/* Ticket Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
              <h2 className="text-xl font-black tracking-wider text-slate-900">SIDIBE SERVICE</h2>
              <p className="text-xs font-semibold text-amber-700">{completedSale?.boutiqueNom || 'Boutique Principale'}</p>
              <p className="text-[11px] text-slate-500">
                Tél: {completedSale?.boutiqueTelephone || '+224 622 48 81 61'} • Guinée, {completedSale?.boutiqueVille || 'Kankan'}
              </p>
            </div>

            {/* Sale metadata */}
            <div className="text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Facture N° :</span>
                <span className="font-bold text-slate-900">{completedSale?.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Date :</span>
                <span>{completedSale?.dateVente ? new Date(completedSale.dateVente).toLocaleString('fr-FR') : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-bold text-slate-900">{completedSale?.nomClient || 'Comptant'}</span>
              </div>
              {completedSale?.telephoneClient && (
                <div className="flex justify-between">
                  <span>Téléphone :</span>
                  <span>{completedSale.telephoneClient}</span>
                </div>
              )}
              {completedSale?.adresseClient && (
                <div className="flex justify-between">
                  <span>Adresse :</span>
                  <span>{completedSale.adresseClient}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Règlement :</span>
                <span className="font-semibold text-slate-900">{completedSale?.modePaiement}</span>
              </div>
            </div>

            {/* Item Table */}
            <div className="border-t border-b border-dashed border-slate-300 py-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                    <th className="py-1">Article</th>
                    <th className="py-1 text-center">Qté</th>
                    <th className="py-1 text-right">P.U</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedSale?.lignes.map((l, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 font-medium">{l.nomProduit}</td>
                      <td className="py-1 text-center">{l.quantite}</td>
                      <td className="py-1 text-right">{formatCurrency(l.prixUnitaire)}</td>
                      <td className="py-1 text-right font-bold">{formatCurrency(l.totalLigne)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL :</span>
                <span>{formatCurrency(completedSale?.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Montant Payé :</span>
                <span>{formatCurrency(completedSale?.montantPaye)}</span>
              </div>
              {completedSale && completedSale.montantRestant > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Solde Restant Dû :</span>
                  <span>{formatCurrency(completedSale.montantRestant)}</span>
                </div>
              )}
            </div>

            {/* Ticket Footer */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[11px] text-slate-500 space-y-0.5">
              <p>Merci de votre visite et à très bientôt chez Sidibé Service !</p>
              <p className="font-semibold text-slate-700">Code Orange Money Guinée : 622 48 81 61</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Fermer
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.print()}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Ticket de Caisse
            </motion.button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
