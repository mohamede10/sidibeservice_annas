import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const categorie = searchParams.get('categorie') || '';

    const whereClause: Record<string, unknown> = {
      actif: true,
    };

    if (search) {
      whereClause.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { ref: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { categorieNom: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorie && categorie !== 'all') {
      whereClause.categorieNom = categorie;
    }

    const produits = await prisma.produit.findMany({
      where: whereClause,
      include: {
        categorie: true,
        variantes: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
      take: 120,
    });

    // Récupérer les catégories distinctes
    const categoriesDb = await prisma.categorie.findMany({
      orderBy: { nom: 'asc' },
    });

    // Points de vente actifs pour le retrait en magasin
    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: {
        id: true,
        nom: true,
        codeBoutique: true,
        ville: true,
        adresse: true,
        telephone: true,
      },
    });

    return NextResponse.json({
      success: true,
      produits,
      categories: categoriesDb,
      pointsDeVente,
    });
  } catch (error: any) {
    console.error('Erreur API Boutique Produits:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération des produits vitrine',
      },
      { status: 500 }
    );
  }
}
