'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  Filter,
  Layers,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Tag,
  RefreshCw,
  Eye,
  Upload,
  Image as ImageIcon,
  X,
  Link as LinkIcon,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Store,
  Truck,
  Receipt,
  ShoppingCart,
  ArrowDownToLine,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { downloadCsv, stampFilename } from '@/lib/exportCsv';
import AnimatedModal from '@/components/AnimatedModal';
import ExportButton from '@/components/ExportButton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Variante {
  id: number;
  taille?: string;
  couleur?: string;
  reference?: string;
  prix: number;
  coutAchat?: number;
  quantiteStock: number;
  stocksParPoint?: Array<{ id: number; pointDeVenteId: number; quantite: number }>;
}

interface Produit {
  id: number;
  nom: string;
  ref?: string;
  description?: string;
  imageUrl?: string;
  categorieId?: number;
  categorieNom?: string;
  dateAjout: string;
  variantes: Variante[];
  totalStock?: number;
  totalVendu?: number;
  totalAjoute?: number;
  statsParBoutique?: Record<number, { stock: number; vendu: number; ajoute: number }>;
}

export default function ProduitsPage() {
  const { canManageProducts, isAdmin, isGerant, isVendeur, user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; nom: string }>>([]);
  const [pointsDeVente, setPointsDeVente] = useState<Array<{ id: number; nom: string; codeBoutique?: string; ville?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [priceFilterMode, setPriceFilterMode] = useState<'exact' | 'max' | 'min'>('exact');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedPointDeVente, setSelectedPointDeVente] = useState<number | null>(null);

  // Modal Add Product
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formCategorie, setFormCategorie] = useState('Tapis');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [formPrix, setFormPrix] = useState('25000');
  const [formCout, setFormCout] = useState('15000');
  const [formStock, setFormStock] = useState('10');
  const [formTaille, setFormTaille] = useState('Standard');
  const [formCouleur, setFormCouleur] = useState('Doré / Or');
  const [formPointDeVente, setFormPointDeVente] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Edit Product
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editCategorie, setEditCategorie] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editPrix, setEditPrix] = useState('');
  const [editCout, setEditCout] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editTaille, setEditTaille] = useState('');
  const [editCouleur, setEditCouleur] = useState('');
  const [updating, setUpdating] = useState(false);

  // Modal Delete Product
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Produit | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal View Product Details
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);

  const fetchProduits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/produits');
      const json = await res.json();
      if (json.success) {
        setProduits(json.produits || []);
        setCategories(json.categories || []);
        const pdvList = json.pointsDeVente || [];
        setPointsDeVente(pdvList);
        // Pré-sélectionner la première boutique par défaut
        if (pdvList.length > 0 && !formPointDeVente) {
          setFormPointDeVente(String(pdvList[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduits();
  }, []);

  // Auto-filtre vendeur sur sa propre boutique uniquement
  useEffect(() => {
    if (isVendeur && user?.pointVenteId) {
      setSelectedPointDeVente(user.pointVenteId);
    }
  }, [isVendeur, user?.pointVenteId]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();
      if (json.success && json.url) {
        if (isEdit) {
          setEditImageUrl(json.url);
        } else {
          setFormImageUrl(json.url);
        }
      } else {
        showError(json.error || 'Erreur lors du téléchargement de l\'image', 'Erreur image');
      }
    } catch (err) {
      console.error('Erreur upload image:', err);
      showError('Erreur réseau lors du téléversement', 'Erreur réseau');
    } finally {
      setUploadingImage(false);
    }
  };

  // Création produit (Admin & Gérant uniquement)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts) {
      showError('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent ajouter des produits.', 'Accès refusé');
      return;
    }
    if (!formNom.trim()) {
      showWarning('Veuillez renseigner le nom du produit.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/produits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formNom,
          ref: formRef || undefined,
          description: formDescription,
          imageUrl: formImageUrl || undefined,
          categorieNom: formCategorie || 'Tapis',
          prix: formPrix,
          coutAchat: formCout,
          quantiteStock: formStock,
          taille: formTaille,
          couleur: formCouleur,
          pointDeVenteId: formPointDeVente || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setFormNom('');
        setFormRef('');
        setFormDescription('');
        setFormImageUrl('');
        fetchProduits();
        showSuccess('Le produit a été ajouté au catalogue.', 'Produit créé');
      } else {
        showError(json.error || 'Erreur lors de la création', 'Erreur produit');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau lors de la création', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  // Ouvrir modal édition
  const handleOpenEdit = (product: Produit) => {
    if (!canManageProducts) {
      showError('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent modifier des produits.', 'Accès refusé');
      return;
    }
    const mainVar = product.variantes[0];
    setEditingProduct(product);
    setEditNom(product.nom);
    setEditRef(product.ref || '');
    setEditCategorie(product.categorieNom || 'Tapis');
    setEditDescription(product.description || '');
    setEditImageUrl(product.imageUrl || '');
    setEditPrix(mainVar ? String(mainVar.prix) : '25000');
    setEditCout(mainVar?.coutAchat ? String(mainVar.coutAchat) : '15000');
    setEditStock(mainVar ? String(mainVar.quantiteStock) : '10');
    setEditTaille(mainVar?.taille || 'Standard');
    setEditCouleur(mainVar?.couleur || 'Doré / Or');
    setIsEditModalOpen(true);
  };

  // Mettre à jour le produit
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts || !editingProduct) return;
    if (!editNom.trim()) {
      showWarning('Veuillez renseigner le nom du produit.');
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`/api/produits/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editNom,
          ref: editRef,
          description: editDescription,
          imageUrl: editImageUrl,
          categorieNom: editCategorie,
          prix: editPrix,
          coutAchat: editCout,
          quantiteStock: editStock,
          taille: editTaille,
          couleur: editCouleur,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsEditModalOpen(false);
        setEditingProduct(null);
        if (selectedProduct && selectedProduct.id === editingProduct.id) {
          setSelectedProduct(json.produit);
        }
        fetchProduits();
        showSuccess('Les informations du produit ont été enregistrées.', 'Produit modifié');
      } else {
        showError(json.error || 'Erreur lors de la mise à jour', 'Erreur produit');
      }
    } catch (err) {
      console.error('Erreur mise à jour produit:', err);
      showError('Erreur réseau lors de la mise à jour', 'Erreur réseau');
    } finally {
      setUpdating(false);
    }
  };

  // Ouvrir confirmation suppression
  const handleOpenDelete = (product: Produit) => {
    if (!canManageProducts) {
      showError('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent supprimer des produits.', 'Accès refusé');
      return;
    }
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Confirmer suppression
  const handleConfirmDelete = async () => {
    if (!canManageProducts || !productToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/produits/${productToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (json.success) {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        if (selectedProduct && selectedProduct.id === productToDelete.id) {
          setSelectedProduct(null);
        }
        fetchProduits();
        showSuccess('Le produit a été supprimé du catalogue.', 'Produit supprimé');
      } else {
        showError(json.error || 'Erreur lors de la suppression', 'Erreur suppression');
      }
    } catch (err) {
      console.error('Erreur suppression produit:', err);
      showError('Erreur réseau lors de la suppression', 'Erreur réseau');
    } finally {
      setDeleting(false);
    }
  };

  // Détermination de la boutique active (priorité absolue à la boutique du vendeur)
  const effectivePointDeVenteId = isVendeur
    ? (user?.pointVenteId ?? selectedPointDeVente)
    : selectedPointDeVente;

  const effectiveBoutique = pointsDeVente.find((p) => p.id === effectivePointDeVenteId);

  const filtered = produits.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    const termClean = term.replace(/\s+/g, '');
    const termNum = parseFloat(termClean);

    const matchSearch =
      !term ||
      p.nom.toLowerCase().includes(term) ||
      (p.ref && p.ref.toLowerCase().includes(term)) ||
      (p.categorieNom && p.categorieNom.toLowerCase().includes(term)) ||
      // Recherche directe par prix dans la barre de recherche (ex: "50000" ou "50 000")
      p.variantes.some((v) => {
        const pStr = String(v.prix);
        const pRound = String(Math.round(v.prix));
        return (
          pStr.includes(termClean) ||
          pRound.includes(termClean) ||
          (!isNaN(termNum) && v.prix === termNum)
        );
      });

    const matchCategory = selectedCategory ? p.categorieId === selectedCategory : true;

    // Filtre dédié par prix (Exact, Max ou Min)
    let matchPrice = true;
    if (priceFilter.trim()) {
      const pVal = parseFloat(priceFilter.replace(/\s+/g, ''));
      if (!isNaN(pVal)) {
        if (priceFilterMode === 'exact') {
          matchPrice = p.variantes.some((v) =>
            Math.abs(v.prix - pVal) < 1 ||
            String(Math.round(v.prix)).includes(String(Math.round(pVal)))
          );
        } else if (priceFilterMode === 'max') {
          matchPrice = p.variantes.some((v) => v.prix <= pVal);
        } else if (priceFilterMode === 'min') {
          matchPrice = p.variantes.some((v) => v.prix >= pVal);
        }
      }
    }

    // Filtre strict par boutique :
    // Chaque boutique doit voir UNIQUEMENT ses propres produits (ayant du stock ou des mouvements dans cette boutique)
    let matchBoutique = true;
    if (effectivePointDeVenteId) {
      const bStats = p.statsParBoutique?.[effectivePointDeVenteId];
      if (bStats) {
        matchBoutique = bStats.stock > 0 || bStats.ajoute > 0;
      } else {
        matchBoutique = p.variantes.some((v) =>
          v.stocksParPoint?.some((s) => s.pointDeVenteId === effectivePointDeVenteId && s.quantite > 0)
        );
      }
    }

    return matchSearch && matchCategory && matchPrice && matchBoutique;
  });

  const handleExportProduits = () => {
    if (filtered.length === 0) {
      showWarning('Aucun produit à exporter pour ce filtre.');
      return;
    }
    const rows: Array<Array<string | number | null | undefined>> = [];
    filtered.forEach((p) => {
      const variants = p.variantes.length > 0 ? p.variantes : [{ id: 0, prix: 0, quantiteStock: p.totalStock || 0 } as Variante];
      variants.forEach((v) => {
        const stockBoutique = effectivePointDeVenteId
          ? v.stocksParPoint?.find((s) => s.pointDeVenteId === effectivePointDeVenteId)?.quantite ?? 0
          : v.quantiteStock;
        const bStats = effectivePointDeVenteId ? p.statsParBoutique?.[effectivePointDeVenteId] : undefined;
        rows.push([
          p.nom,
          p.ref || '',
          p.categorieNom || '',
          v.taille || '',
          v.couleur || '',
          v.prix ?? '',
          v.coutAchat ?? '',
          stockBoutique,
          bStats?.vendu ?? p.totalVendu ?? '',
          bStats?.ajoute ?? p.totalAjoute ?? '',
          effectiveBoutique?.nom || 'Toutes boutiques',
        ]);
      });
    });
    downloadCsv(
      stampFilename('produits_stock'),
      ['Produit', 'Référence', 'Catégorie', 'Taille', 'Couleur', 'Prix vente (GNF)', 'Coût achat (GNF)', 'Stock', 'Qté vendue', 'Qté ajoutée', 'Boutique'],
      rows
    );
    showSuccess(`${rows.length} ligne(s) exportée(s).`, 'Export Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Package className="w-6 h-6" />
            </span>
            Catalogue Produits & Stocks
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {effectiveBoutique
              ? `Catalogue exclusif : ${effectiveBoutique.nom} (${effectiveBoutique.ville || 'Guinée'}) • ${filtered.length} article${filtered.length > 1 ? 's' : ''} en rayon`
              : `Gestion globale des ${produits.length} articles, variantes de tailles/couleurs et niveaux de stock.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExportProduits} disabled={loading} count={filtered.length} />
          <button
            onClick={fetchProduits}
            title="Actualiser"
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Bouton visible UNIQUEMENT pour Admin et Gérant */}
          {canManageProducts ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsAddModalOpen(true)}
              className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Nouveau Produit
            </motion.button>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Mode Consultation Vendeur</span>
            </div>
          )}
        </div>
      </div>

      {/* Avertissement pour les vendeurs */}
      {!canManageProducts && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Accès Restreint :</strong> Seuls l&apos;Administrateur et le Gérant ont l&apos;autorisation d&apos;ajouter, modifier ou supprimer des articles du catalogue. En tant que vendeur, vous pouvez consulter les articles et leurs stocks pour vos ventes.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Recherche par nom / référence / catégorie / prix */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, réf, catégorie ou prix (ex: 25000)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre dédié par Prix */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-sm">
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 pointer-events-none" />
              <input
                type="number"
                placeholder="Prix (GNF)..."
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="pl-8 pr-2 py-1.5 w-32 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <select
              value={priceFilterMode}
              onChange={(e) => setPriceFilterMode(e.target.value as 'exact' | 'max' | 'min')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
              title="Mode de comparaison du prix"
            >
              <option value="exact">= Exact</option>
              <option value="max">≤ Prix Max</option>
              <option value="min">≥ Prix Min</option>
            </select>
            {priceFilter && (
              <button
                type="button"
                onClick={() => setPriceFilter('')}
                className="p-1 text-slate-400 hover:text-white"
                title="Effacer le filtre prix"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre par Boutique — visible UNIQUEMENT pour Admin et Gérant */}
          {(isAdmin || isGerant) && (
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
              <select
                value={selectedPointDeVente ?? ''}
                onChange={(e) => setSelectedPointDeVente(e.target.value ? Number(e.target.value) : null)}
                className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
              >
                <option value="">🏢 Toutes les Boutiques (Stock Global)</option>
                {pointsDeVente.map((pdv) => (
                  <option key={pdv.id} value={pdv.id}>
                    🏪 {pdv.nom} {pdv.ville ? `(${pdv.ville})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Badge boutique pour le vendeur (lecture seule) */}
          {isVendeur && selectedPointDeVente && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-semibold">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>{pointsDeVente.find(p => p.id === selectedPointDeVente)?.nom || 'Ma Boutique'}</span>
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === null
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
          >
            Toutes ({filtered.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
            >
              {cat.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Produit & Réf</th>
                <th className="px-4 py-4">Catégorie</th>
                <th className="px-4 py-4">Prix de Vente</th>
                <th className="px-4 py-4 text-center">
                  <span className="text-sky-400 inline-flex items-center gap-1.5 font-bold">
                    <Truck className="w-3.5 h-3.5" />
                    Entrées Totales
                  </span>
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="text-purple-400 inline-flex items-center gap-1.5 font-bold">
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Qté Ajoutée
                  </span>
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="text-amber-400 inline-flex items-center gap-1.5 font-bold">
                    <Receipt className="w-3.5 h-3.5" />
                    Qté Vendue
                  </span>
                </th>
                <th className="px-4 py-4 text-center">
                  {effectiveBoutique ? (
                    <span className="text-emerald-400 inline-flex items-center gap-1.5 font-bold">
                      <Store className="w-3.5 h-3.5" />
                      Stock Boutique ({effectiveBoutique.codeBoutique || effectiveBoutique.nom})
                    </span>
                  ) : (
                    <span className="text-emerald-400 inline-flex items-center gap-1.5 font-bold">
                      <Package className="w-3.5 h-3.5" />
                      Stock Boutique
                    </span>
                  )}
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Chargement du catalogue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Aucun article trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const mainVar = p.variantes[0];
                  const totalStock = p.variantes.reduce((sum, v) => sum + v.quantiteStock, 0);

                  // Calcul selon la boutique filtrée ou global
                  const boutiqueStats = effectivePointDeVenteId ? p.statsParBoutique?.[effectivePointDeVenteId] : null;

                  const qteVendue = boutiqueStats ? boutiqueStats.vendu : (p.totalVendu ?? 0);
                  const displayStock = boutiqueStats
                    ? boutiqueStats.stock
                    : (effectivePointDeVenteId
                        ? p.variantes.reduce((sum, v) => {
                            const sp = v.stocksParPoint?.find((s) => s.pointDeVenteId === effectivePointDeVenteId);
                            return sum + (sp ? sp.quantite : 0);
                          }, 0)
                        : totalStock);
                  const qteAjoutee = boutiqueStats ? boutiqueStats.ajoute : (p.totalAjoute ?? (displayStock + qteVendue));
                  // Qté ajoutée affiche le stock actuel + vendu (= total entré via appros)
                  const entreesTotales = qteAjoutee;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Produit & Réf */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nom}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <ImageIcon className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p
                              className="font-bold text-white text-sm hover:text-amber-400 transition-colors cursor-pointer truncate"
                              onClick={() => setSelectedProduct(p)}
                            >
                              {p.nom}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Réf: {p.ref || `PRD-${p.id}`}</p>
                            {mainVar && (
                              <p className="text-[11px] text-slate-500">
                                {mainVar.taille || 'Standard'} • {mainVar.couleur || 'Classique'}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Catégorie */}
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-semibold text-xs whitespace-nowrap">
                          {p.categorieNom || 'Général'}
                        </span>
                      </td>

                      {/* 3. Prix de vente */}
                      <td className="px-4 py-4 font-black text-amber-400 whitespace-nowrap">
                        {formatCurrency(mainVar?.prix || 0)}
                      </td>

                      {/* 4. Quantité Ajoutée / Stocks Arrivés (Entrées / Approvisionnements) */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          <Truck className="w-3.5 h-3.5" />
                          {entreesTotales} arrivé{entreesTotales > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 5. Qté Ajoutée (stock actuel disponible en boutique) */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          +{displayStock} en stock
                        </span>
                      </td>

                      {/* 6. Quantité Vendue (Sorties) */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Receipt className="w-3.5 h-3.5" />
                          {qteVendue} vendue{qteVendue > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 7. Stock Boutique (restant disponible) */}
                      <td className="px-4 py-4 text-center">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                              displayStock > 5
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : displayStock > 0
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            {displayStock} restant{displayStock > 1 ? 's' : ''}
                          </span>
                          {effectivePointDeVenteId && (isAdmin || isGerant) && (
                            <p className="text-[10px] text-slate-500">
                              (Réseau total: {totalStock})
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 8. Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bouton Voir Détails (Accessible à tous) */}
                          <button
                            onClick={() => setSelectedProduct(p)}
                            title="Voir les détails"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Boutons Modifier & Supprimer (Seulement ADMIN et GERANT) */}
                          {canManageProducts && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Modifier le produit"
                                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400/80 transition-all"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDelete(p)}
                                title="Supprimer le produit"
                                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/60 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: AJOUT PRODUIT (Admin & Gérant uniquement)
      ========================================================================= */}
      {canManageProducts && (
        <AnimatedModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Ajouter un Nouveau Produit"
          subtitle="Créez l'article et sa variante initiale avec tarif et stock"
        >
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nom du Produit *
                </label>
                <input
                  type="text"
                  required
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Ex: Tapis Royal Doré 200x300"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Référence (optionnelle)
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="Ex: TAP-ROY-001"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Sélection de la boutique */}
            {pointsDeVente.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Boutique de Réception du Stock Initial *
                  </p>
                </div>
                <select
                  required
                  value={formPointDeVente}
                  onChange={(e) => setFormPointDeVente(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-white text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Choisir une boutique --</option>
                  {pointsDeVente.map((pdv) => (
                    <option key={pdv.id} value={String(pdv.id)}>
                      {pdv.nom}{pdv.ville ? ` — ${pdv.ville}` : ''}{pdv.codeBoutique ? ` (${pdv.codeBoutique})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Le stock initial sera affecté à cette boutique. Les autres boutiques démarreront à 0 unité.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Catégorie
                </label>
                <select
                  value={formCategorie}
                  onChange={(e) => setFormCategorie(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="Tapis">Tapis</option>
                  <option value="Rideaux">Rideaux</option>
                  <option value="Barres & Accessoires pour Rideaux">Barres & Accessoires pour Rideaux</option>
                  <option value="Panneaux Muraux">Panneaux Muraux</option>
                  <option value="Draps & Linge de Lit">Draps & Linge de Lit</option>
                  <option value="Couettes & Couvertures">Couettes & Couvertures</option>
                  <option value="Oreillers & Coussins">Oreillers & Coussins</option>
                  <option value="Housses de Canapé & Fauteuil">Housses de Canapé & Fauteuil</option>
                  <option value="Décoration Murale">Décoration Murale</option>
                  <option value="Luminaires & Lampes">Luminaires & Lampes</option>
                  <option value="Vases & Objets Décoratifs">Vases & Objets Décoratifs</option>
                  <option value="Accessoires">Accessoires</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Photo du Produit
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold ${imageInputMode === 'upload'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                  >
                    Fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold ${imageInputMode === 'url'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                  >
                    Lien Web
                  </button>
                </div>
              </div>
            </div>

            {/* Input image */}
            {imageInputMode === 'upload' ? (
              <div>
                <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40">
                  <Upload className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-xs text-slate-300 font-semibold">
                    {uploadingImage ? 'Téléversement en cours...' : 'Choisir une photo locale'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, false)}
                    className="hidden"
                  />
                </label>
                {formImageUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="truncate">Image chargée avec succès</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description de l&apos;article
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Spécifications, qualité du tissu, finitions..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Variante initiale */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Variante Initiale & Tarifs
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Taille/Modèle</label>
                  <input
                    type="text"
                    value={formTaille}
                    onChange={(e) => setFormTaille(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Couleur</label>
                  <input
                    type="text"
                    value={formCouleur}
                    onChange={(e) => setFormCouleur(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Stock Initial</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Prix Vente (GNF)</label>
                  <input
                    type="number"
                    value={formPrix}
                    onChange={(e) => setFormPrix(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Coût Achat (GNF)</label>
                  <input
                    type="number"
                    value={formCout}
                    onChange={(e) => setFormCout(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
              >
                {submitting ? 'Enregistrement...' : 'Créer le Produit'}
              </button>
            </div>
          </form>
        </AnimatedModal>
      )}

      {/* =========================================================================
          MODAL: MODIFICATION PRODUIT (Admin & Gérant uniquement)
      ========================================================================= */}
      {canManageProducts && (
        <AnimatedModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProduct(null);
          }}
          title="Modifier le Produit"
          subtitle={`Édition de l'article : ${editingProduct?.nom || ''}`}
        >
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nom du Produit *
                </label>
                <input
                  type="text"
                  required
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Catégorie
                </label>
                <select
                  value={editCategorie}
                  onChange={(e) => setEditCategorie(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="Tapis">Tapis</option>
                  <option value="Rideaux">Rideaux</option>
                  <option value="Barres & Accessoires pour Rideaux">Barres & Accessoires pour Rideaux</option>
                  <option value="Panneaux Muraux">Panneaux Muraux</option>
                  <option value="Draps & Linge de Lit">Draps & Linge de Lit</option>
                  <option value="Couettes & Couvertures">Couettes & Couvertures</option>
                  <option value="Oreillers & Coussins">Oreillers & Coussins</option>
                  <option value="Housses de Canapé & Fauteuil">Housses de Canapé & Fauteuil</option>
                  <option value="Décoration Murale">Décoration Murale</option>
                  <option value="Luminaires & Lampes">Luminaires & Lampes</option>
                  <option value="Vases & Objets Décoratifs">Vases & Objets Décoratifs</option>
                  <option value="Accessoires">Accessoires</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  URL de la Photo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="Lien de l'image..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 cursor-pointer flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Variante principale */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Prix et Stock de la Variante Principale
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Taille/Modèle</label>
                  <input
                    type="text"
                    value={editTaille}
                    onChange={(e) => setEditTaille(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Couleur</label>
                  <input
                    type="text"
                    value={editCouleur}
                    onChange={(e) => setEditCouleur(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Stock Total</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Prix Vente (GNF)</label>
                  <input
                    type="number"
                    value={editPrix}
                    onChange={(e) => setEditPrix(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Coût Achat (GNF)</label>
                  <input
                    type="number"
                    value={editCout}
                    onChange={(e) => setEditCout(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProduct(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={updating}
                className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
              >
                {updating ? 'Mise à jour...' : 'Enregistrer les Modifications'}
              </button>
            </div>
          </form>
        </AnimatedModal>
      )}

      {/* =========================================================================
          MODAL: CONFIRMATION SUPPRESSION (Admin & Gérant uniquement)
      ========================================================================= */}
      {canManageProducts && (
        <AnimatedModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
          }}
          title="Supprimer le Produit"
          subtitle="Cette action retirera le produit du catalogue actif"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">
                  Êtes-vous sûr de vouloir supprimer cet article ?
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Article : <strong>{productToDelete?.nom}</strong> (Réf: {productToDelete?.ref || '-'})
                </p>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Si cet article figure déjà dans des factures ou ventes existantes, il sera archivé en toute sécurité pour conserver l&apos;historique comptable sans supprimer les factures associées.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                {deleting ? 'Suppression...' : 'Confirmer la Suppression'}
              </button>
            </div>
          </div>
        </AnimatedModal>
      )}

      {/* =========================================================================
          MODAL: DETAILS PRODUIT
      ========================================================================= */}
      <AnimatedModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.nom || 'Détails Article'}
        subtitle={`Réf: ${selectedProduct?.ref || ''} • Catégorie: ${selectedProduct?.categorieNom || 'Mode'}${
          effectiveBoutique ? ` • 🏪 ${effectiveBoutique.nom}` : ''
        }`}
      >
        <div className="space-y-4">
          {selectedProduct?.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-60 flex items-center justify-center p-2">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.nom}
                className="max-h-56 w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          )}
          <p className="text-xs text-slate-300">
            {selectedProduct?.description || 'Aucune description spécifique renseignée.'}
          </p>

          {/* Badge boutique si filtre actif ou vendeur */}
          {effectiveBoutique && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-bold">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Chiffres &amp; Stocks exclusifs : {effectiveBoutique.nom} {effectiveBoutique.ville ? `(${effectiveBoutique.ville})` : ''}</span>
            </div>
          )}

          {/* Synthèse entrées/sorties/stock (calculée pour la boutique active si vendeur ou filtre boutique) */}
          {(() => {
            const bStats = effectivePointDeVenteId && selectedProduct ? selectedProduct.statsParBoutique?.[effectivePointDeVenteId] : null;
            const stockArrive = bStats ? bStats.ajoute : (selectedProduct?.totalAjoute ?? ((selectedProduct?.totalStock ?? 0) + (selectedProduct?.totalVendu ?? 0)));
            const stockVendu = bStats ? bStats.vendu : (selectedProduct?.totalVendu ?? 0);
            const stockRestant = bStats ? bStats.stock : (selectedProduct?.totalStock ?? selectedProduct?.variantes.reduce((s, v) => s + v.quantiteStock, 0));

            return (
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <p className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">Stocks Arrivés</p>
                  <p className="text-base font-black text-sky-400 mt-0.5">
                    {stockArrive}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Total Vendu</p>
                  <p className="text-base font-black text-amber-400 mt-0.5">
                    {stockVendu}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Stock Restant</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">
                    {stockRestant}
                  </p>
                </div>
              </div>
            );
          })()}

          <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
            Variantes &amp; Stocks Disponibles
          </h4>

          <div className="space-y-3">
            {selectedProduct?.variantes.map((v) => {
              const sp = effectivePointDeVenteId ? v.stocksParPoint?.find((s) => s.pointDeVenteId === effectivePointDeVenteId) : null;
              const stockVarAffiche = effectivePointDeVenteId ? (sp?.quantite ?? 0) : v.quantiteStock;

              return (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">
                        Taille: {v.taille || 'Standard'} • Couleur: {v.couleur || 'Classique'}
                      </p>
                      <p className="text-slate-400 text-[11px]">Réf variante: {v.reference || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-400">{formatCurrency(v.prix)}</p>
                      <p className="text-emerald-400 font-semibold">
                        {stockVarAffiche} {effectiveBoutique ? `en stock (${effectiveBoutique.codeBoutique || effectiveBoutique.nom})` : 'au total'}
                      </p>
                    </div>
                  </div>

                  {/* Ventilation par boutique : VISIBLE UNIQUEMENT POUR ADMIN ET GÉRANT (MASQUÉ POUR VENDEURS) */}
                  {(isAdmin || isGerant) && !isVendeur && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Store className="w-3 h-3 text-amber-400" />
                        Répartition par Boutique (Supervision) :
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {pointsDeVente.map((pdv) => {
                          const spPoint = v.stocksParPoint?.find((s) => s.pointDeVenteId === pdv.id);
                          const qte = spPoint?.quantite ?? 0;
                          return (
                            <div
                              key={pdv.id}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center justify-between ${
                                pdv.id === effectivePointDeVenteId
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-950 border-slate-800/80 text-slate-400'
                              }`}
                            >
                              <span className="truncate">{pdv.nom}</span>
                              <span className={`font-bold ${qte <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {qte} unité{qte > 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {/* Boutons d'administration si Admin/Gérant */}
            {canManageProducts && selectedProduct ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    handleOpenEdit(prod);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Modifier cet article
                </button>
                <button
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    handleOpenDelete(prod);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            ) : (
              <div />
            )}

            <button
              onClick={() => setSelectedProduct(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
