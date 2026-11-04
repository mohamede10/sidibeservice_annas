import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyAdminLowStock } from '@/lib/sms';

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
      if (quantiteStock !== undefined) {
        const newStock = parseInt(quantiteStock) || 0;
        varUpdateData.quantiteStock = newStock;

        // Synchroniser le stock en boutique
        const existingSpp = await prisma.stockParPoint.findFirst({
          where: { varianteId: firstVar.id },
        });
        if (existingSpp) {
          await prisma.stockParPoint.update({
            where: { id: existingSpp.id },
            data: { quantite: newStock },
          });
        } else {
          const firstPdv = await prisma.pointDeVente.findFirst({ where: { active: true } });
          if (firstPdv) {
            await prisma.stockParPoint.create({
              data: {
                varianteId: firstVar.id,
                pointDeVenteId: firstPdv.id,
                quantite: newStock,
              },
            });
          }
        }

        if (newStock <= 10) {
          notifyAdminLowStock({
            produitNom: updatedProduit.nom,
            varianteInfo: `${firstVar.taille || ''} ${firstVar.couleur || ''}`.trim(),
            quantiteRestante: newStock,
            boutiqueNom: 'Stock Principal',
          }).catch((e) => console.error('Erreur SMS stock faible:', e));
        }
      }
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

    // 1. Récupérer les variantes du produit
    const variantes = await prisma.produitVariante.findMany({
      where: { produitId },
      select: { id: true },
    });
    const varIds = variantes.map((v) => v.id);

    if (ventesCount > 0) {
      // Le produit figure dans des factures de vente historiques.
      // Pour satisfaire la demande : "supprimer toutes ses traces dans les boutiques, valeur stock, quantité...",
      // on efface immédiatement TOUS ses stocks dans toutes les boutiques et on met le stock à 0 !
      await prisma.$transaction(async (tx) => {
        if (varIds.length > 0) {
          // Supprimer tous les stocks en boutique
          await tx.stockParPoint.deleteMany({
            where: { varianteId: { in: varIds } },
          });
          // Supprimer les mouvements de stock résiduels
          await tx.stockMouvement.deleteMany({
            where: { varianteId: { in: varIds } },
          });
          // Remettre à 0 les stocks des variantes
          await tx.produitVariante.updateMany({
            where: { produitId },
            data: { quantiteStock: 0 },
          });
        }

        // Désactiver le produit pour les archives comptables
        await tx.produit.update({
          where: { id: produitId },
          data: { actif: false },
        });
      }, { maxWait: 20000, timeout: 45000 });

      return NextResponse.json({
        success: true,
        message: 'Le produit a été archivé et toutes ses traces de stock (quantités, valeurs en boutique) ont été intégralement remises à zéro.',
      });
    }

    await prisma.$transaction(async (tx) => {
      if (varIds.length > 0) {
        // 2. Supprimer les mouvements de stock liés à ces variantes
        await tx.stockMouvement.deleteMany({
          where: { varianteId: { in: varIds } },
        });

        // 3. Supprimer les stocks par point de vente (toutes boutiques)
        await tx.stockParPoint.deleteMany({
          where: { varianteId: { in: varIds } },
        });

        // 4. Supprimer les lignes de transfert liées à ces variantes
        await tx.transfertLigne.deleteMany({
          where: { varianteId: { in: varIds } },
        });

        // 5. Supprimer les lignes de facture liées
        await tx.factureLigne.deleteMany({
          where: { varianteId: { in: varIds } },
        });

        // 6. Supprimer les lignes d'achat liées
        await tx.achatLigne.deleteMany({
          where: { varianteId: { in: varIds } },
        });

        // 7. Supprimer les variantes elles-mêmes
        await tx.produitVariante.deleteMany({
          where: { produitId },
        });
      }

      // 8. Supprimer les lignes de vente (s'il en reste sans produitId)
      await tx.venteLigne.deleteMany({
        where: { produitId },
      });

      // 9. Supprimer le produit
      await tx.produit.delete({
        where: { id: produitId },
      });
    }, { maxWait: 20000, timeout: 45000 });

    return NextResponse.json({ success: true, message: 'Produit et toutes ses traces supprimés avec succès (stocks, mouvements, transferts, variantes).' });
  } catch (error) {
    console.error('Erreur API Produit DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
