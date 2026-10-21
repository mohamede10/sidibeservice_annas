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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
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
  imageUrl?: string;
  categorieId?: number;
  categorieNom?: string;
  dateAjout: string;
  variantes: Variante[];
}

export default function ProduitsPage() {
  const { canManageProducts, isAdmin, isGerant, isVendeur, user } = useAuth();

  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; nom: string }>>([]);
  const [pointsDeVente, setPointsDeVente] = useState<Array<{ id: number; nom: string; codeBoutique?: string; ville?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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
        alert(json.error || 'Erreur lors du téléchargement de l\'image');
      }
    } catch (err) {
      console.error('Erreur upload image:', err);
      alert('Erreur réseau lors du téléversement');
    } finally {
      setUploadingImage(false);
    }
  };

  // Création produit (Admin & Gérant uniquement)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts) {
      alert('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent ajouter des produits.');
      return;
    }
    if (!formNom.trim()) return;

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
      } else {
        alert(json.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Ouvrir modal édition
  const handleOpenEdit = (product: Produit) => {
    if (!canManageProducts) {
      alert('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent modifier des produits.');
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
    if (!editNom.trim()) return;

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
      } else {
        alert(json.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Erreur mise à jour produit:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Ouvrir confirmation suppression
  const handleOpenDelete = (product: Produit) => {
    if (!canManageProducts) {
      alert('Action non autorisée. Seuls l\'Administrateur et le Gérant peuvent supprimer des produits.');
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
      } else {
        alert(json.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Erreur suppression produit:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = produits.filter((p) => {
    const matchSearch =
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ref && p.ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.categorieNom && p.categorieNom.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCategory = selectedCategory ? p.categorieId === selectedCategory : true;
    return matchSearch && matchCategory;
  });

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
            Gestion des {produits.length} articles, variantes de tailles/couleurs et niveaux de stock.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, référence ou catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
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
            Toutes ({produits.length})
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
                <th className="px-6 py-4">Produit & Réf</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Variante(s)</th>
                <th className="px-6 py-4">Prix de Vente</th>
                <th className="px-6 py-4">Stock Total</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Chargement du catalogue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucun article trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const mainVar = p.variantes[0];
                  const totalStock = p.variantes.reduce((sum, v) => sum + v.quantiteStock, 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nom}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
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
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-semibold text-xs">
                          {p.categorieNom || 'Mode'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {p.variantes.map((v) => (
                          <span
                            key={v.id}
                            className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700"
                          >
                            {v.taille || 'Std'} / {v.couleur || 'Classique'} ({v.quantiteStock})
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 font-black text-amber-400">
                        {formatCurrency(mainVar?.prix || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${totalStock > 5
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : totalStock > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                          {totalStock} unité{totalStock > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
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
        subtitle={`Réf: ${selectedProduct?.ref || ''} • Catégorie: ${selectedProduct?.categorieNom || 'Mode'}`}
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

          <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
            Variantes & Stocks Disponibles
          </h4>

          <div className="space-y-2">
            {selectedProduct?.variantes.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">
                    Taille: {v.taille || 'Standard'} • Couleur: {v.couleur || 'Classique'}
                  </p>
                  <p className="text-slate-400 text-[11px]">Réf variante: {v.reference || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-amber-400">{formatCurrency(v.prix)}</p>
                  <p className="text-emerald-400 font-semibold">{v.quantiteStock} en stock</p>
                </div>
              </div>
            ))}
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
