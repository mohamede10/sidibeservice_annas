'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';

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
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; nom: string }>>([]);
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
  const [submitting, setSubmitting] = useState(false);

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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormImageUrl(json.url);
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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
            className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAddModalOpen(true)}
            className="btn-gold px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </motion.button>
        </div>
      </div>

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
                            <p className="font-bold text-white text-sm hover:text-amber-400 transition-colors cursor-pointer truncate" onClick={() => setSelectedProduct(p)}>
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
                        {p.variantes.map((v, i) => (
                          <span key={v.id} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            {v.taille || 'Std'} / {v.couleur || 'Noir'} ({v.quantiteStock})
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
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: AJOUT PRODUIT */}
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
                placeholder="Ex: Costume 3 Pièces Slim Fit"
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
                placeholder="Ex: CST-3P-001"
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
                value={formCategorie}
                onChange={(e) => setFormCategorie(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="Accessoires">Accessoires</option>
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
                <option value="Accessoires de Décoration Maison">Accessoires de Décoration Maison</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Matière, coupe, détails..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Section Image du Produit */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photo du Produit
              </label>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    imageInputMode === 'upload'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Téléverser fichier
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    imageInputMode === 'url'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Lien URL
                </button>
              </div>
            </div>

            {/* Aperçu ou zone d'upload */}
            {formImageUrl ? (
              <div className="relative flex items-center gap-4 p-3 rounded-xl bg-slate-950 border border-slate-700/80">
                <img
                  src={formImageUrl}
                  alt="Aperçu produit"
                  className="w-16 h-16 rounded-xl object-cover border border-amber-500/40"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Photo prête pour le produit
                  </p>
                  <p className="text-slate-400 truncate text-[11px] font-mono mt-0.5">{formImageUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormImageUrl('')}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                  title="Supprimer la photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                {imageInputMode === 'upload' ? (
                  <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl bg-slate-950/60 cursor-pointer group transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Téléversement de la photo en cours...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          Cliquez pour choisir une photo depuis votre appareil
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          JPG, PNG, WebP (affichée en boutique vitrine et catalogue)
                        </p>
                      </>
                    )}
                  </label>
                ) : (
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://exemple.com/image.jpg ou /uploads/photo.jpg"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Variante & Tarification
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Taille</label>
                <input
                  type="text"
                  value={formTaille}
                  onChange={(e) => setFormTaille(e.target.value)}
                  placeholder="L, XL, 42..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Couleur</label>
                <input
                  type="text"
                  value={formCouleur}
                  onChange={(e) => setFormCouleur(e.target.value)}
                  placeholder="Bleu Marine..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Stock Initial</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Prix de Vente (GNF)</label>
                <input
                  type="number"
                  value={formPrix}
                  onChange={(e) => setFormPrix(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Coût d&apos;Achat (GNF)</label>
                <input
                  type="number"
                  value={formCout}
                  onChange={(e) => setFormCout(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300"
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

      {/* MODAL: DETAILS PRODUIT */}
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

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
