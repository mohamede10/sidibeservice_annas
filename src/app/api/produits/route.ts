import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const categorieId = searchParams.get('categorieId');

    const whereClause: Record<string, unknown> = {
      actif: true,
    };

    if (search) {
      whereClause.OR = [
        { nom: { contains: search } },
        { ref: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categorieId) {
      whereClause.categorieId = parseInt(categorieId);
    }

    const produits = await prisma.produit.findMany({
      where: whereClause,
      include: {
        categorie: true,
        variantes: {
          include: {
            stocksParPoint: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });

    const categories = await prisma.categorie.findMany({
      orderBy: { nom: 'asc' },
    });

    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: { id: true, nom: true, codeBoutique: true, ville: true },
      orderBy: { nom: 'asc' },
    });

    return NextResponse.json({
      success: true,
      produits,
      categories,
      pointsDeVente,
    });
  } catch (error) {
    console.error('Erreur API Produits:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement produits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      pointDeVenteId, // boutique sélectionnée par l'utilisateur
    } = body;

    if (!nom) {
      return NextResponse.json({ success: false, error: 'Le nom du produit est requis' }, { status: 400 });
    }

    const newRef = ref || `PRD-${Date.now().toString().slice(-6)}`;

    const produit = await prisma.produit.create({
      data: {
        nom,
        ref: newRef,
        description: description || '',
        imageUrl: imageUrl || null,
        categorieId: categorieId ? parseInt(categorieId) : null,
        categorieNom: categorieNom || 'Général',
        actif: true,
        variantes: {
          create: {
            taille: taille || 'Standard',
            couleur: couleur || 'Classique',
            reference: `${newRef}-VAR1`,
            prix: parseFloat(prix) || 25000,
            coutAchat: parseFloat(coutAchat) || 15000,
            quantiteStock: parseInt(quantiteStock) || 10,
          },
        },
      },
      include: {
        variantes: true,
        categorie: true,
      },
    });

    // Créer les entrées de stock par point de vente pour chaque boutique
    // Le stock initial est affecté à la boutique choisie par l'utilisateur
    const pointsDeVente = await prisma.pointDeVente.findMany();
    if (produit.variantes.length > 0 && pointsDeVente.length > 0) {
      const v = produit.variantes[0];
      const selectedPdvId = pointDeVenteId ? parseInt(pointDeVenteId) : pointsDeVente[0]?.id;

      for (const pdv of pointsDeVente) {
        // Le stock initial va à la boutique sélectionnée, 0 pour les autres
        const qte = pdv.id === selectedPdvId ? v.quantiteStock : 0;
        await prisma.stockParPoint.create({
          data: {
            varianteId: v.id,
            pointDeVenteId: pdv.id,
            quantite: qte,
            stockMin: 3,
          },
        }).catch((err) => console.error('Erreur create StockParPoint:', err));
      }
    }

    return NextResponse.json({ success: true, produit });
  } catch (error) {
    console.error('Erreur création produit:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la création du produit' }, { status: 500 });
  }
}
