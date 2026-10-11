import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const statut = searchParams.get('statut') || '';

    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { reference: { contains: search } },
        { nomClient: { contains: search } },
        { telephoneClient: { contains: search } },
      ];
    }

    if (statut) {
      whereClause.statutPaiement = statut;
    }

    const ventes = await prisma.vente.findMany({
      where: whereClause,
      include: {
        client: true,
        vendeur: true,
        lignes: true,
        factures: true,
      },
      orderBy: { dateVente: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      ventes,
    });
  } catch (error) {
    console.error('Erreur API Ventes:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement ventes' }, { status: 500 });
  }
}
