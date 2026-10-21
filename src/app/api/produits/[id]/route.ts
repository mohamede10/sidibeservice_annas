import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produitId = parseInt(id);

    if (isNaN(produitId)) {
      return NextResponse.json({ success: false, error: 'ID invalide' }, { status: 400 });
    }

    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        categorie: true,
        variantes: {
          include: {
            stocksParPoint: true,
          },
        },
      },
    });

    if (!produit) {
      return NextResponse.json({ success: false, error: 'Produit introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, produit });
  } catch (error) {
    console.error('Erreur API Produit GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur récupération produit' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produitId = parseInt(id);

    if (isNaN(produitId)) {
      return NextResponse.json({ success: false, error: 'ID invalide' }, { status: 400 });
    }

    const body = await request.json();
    const {
      nom,
      ref,
      description,
      imageUrl,
      categorieId,
      categorieNom,
      prix,
      coutAchat,
      quantiteStock,
      taille,
      couleur,
      actif,
    } = body;

    if (!nom || !nom.trim()) {
      return NextResponse.json({ success: false, error: 'Le nom du produit est requis' }, { status: 400 });
    }

    // 1. Mettre à jour le produit principal
    const updateData: Record<string, unknown> = {
      nom: nom.trim(),
      description: description !== undefined ? description : '',
    };

    if (ref !== undefined) updateData.ref = ref;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (categorieNom !== undefined) updateData.categorieNom = categorieNom;
    if (categorieId !== undefined) updateData.categorieId = categorieId ? parseInt(categorieId) : null;
    if (actif !== undefined) updateData.actif = Boolean(actif);

    const updatedProduit = await prisma.produit.update({
      where: { id: produitId },
      data: updateData,
      include: {
        variantes: true,
      },
    });

    // 2. Mettre à jour la variante principale si des données de variante sont fournies
    if (updatedProduit.variantes.length > 0) {
      const firstVar = updatedProduit.variantes[0];
      const varUpdateData: Record<string, unknown> = {};

      if (prix !== undefined) varUpdateData.prix = parseFloat(prix) || 0;
      if (coutAchat !== undefined) varUpdateData.coutAchat = parseFloat(coutAchat) || 0;
      if (quantiteStock !== undefined) varUpdateData.quantiteStock = parseInt(quantiteStock) || 0;
      if (taille !== undefined) varUpdateData.taille = taille;
      if (couleur !== undefined) varUpdateData.couleur = couleur;

      if (Object.keys(varUpdateData).length > 0) {
        await prisma.produitVariante.update({
          where: { id: firstVar.id },
          data: varUpdateData,
        });
      }
    }

    // Récupérer le produit final complet
    const finalProduit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        categorie: true,
        variantes: {
          include: {
            stocksParPoint: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, produit: finalProduit });
  } catch (error) {
    console.error('Erreur API Produit PUT:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la modification du produit' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produitId = parseInt(id);

    if (isNaN(produitId)) {
      return NextResponse.json({ success: false, error: 'ID invalide' }, { status: 400 });
    }

    // Vérifier si le produit a des lignes de vente associées
    const ventesCount = await prisma.venteLigne.count({
      where: { produitId },
    });

    if (ventesCount > 0) {
      // Soft delete pour préserver l'intégrité comptable et les factures
      await prisma.produit.update({
        where: { id: produitId },
        data: { actif: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Le produit a été archivé car il figure dans des factures existantes.',
      });
    }

    // Si aucune vente associée, suppression physique
    await prisma.produit.delete({
      where: { id: produitId },
    });

    return NextResponse.json({ success: true, message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur API Produit DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
