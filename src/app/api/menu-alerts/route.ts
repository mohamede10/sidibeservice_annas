import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointVenteIdParam = searchParams.get('pointVenteId');
    const pointVenteId =
      pointVenteIdParam && !isNaN(parseInt(pointVenteIdParam))
        ? parseInt(pointVenteIdParam)
        : null;

    const [commandes, virements, transferts, produits, dettes] = await Promise.all([
      prisma.vente.count({
        where: {
          typeVente: 'COMMANDE_EN_LIGNE',
          statutPaiement: 'EN_ATTENTE',
          ...(pointVenteId ? { pointVenteId } : {}),
        },
      }),
      prisma.clotureCaisse.count({
        where: {
          statut: 'EN_ATTENTE',
          ...(pointVenteId ? { pointDeVenteId: pointVenteId } : {}),
        },
      }),
      prisma.transfertStock.count({
        where: {
          statut: { in: ['EN_ATTENTE', 'EXPEDIE'] },
          ...(pointVenteId
            ? {
                OR: [
                  { pointOrigineId: pointVenteId },
                  { pointDestinationId: pointVenteId },
                ],
              }
            : {}),
        },
      }),
      prisma.stockParPoint.count({
        where: {
          quantite: { lte: 5 },
          ...(pointVenteId ? { pointDeVenteId: pointVenteId } : {}),
        },
      }),
      prisma.vente.count({
        where: {
          typeVente: { not: 'COMMANDE_EN_LIGNE' },
          statutPaiement: { in: ['IMPAYE', 'PARTIEL'] },
          montantRestant: { gt: 0 },
          ...(pointVenteId ? { pointVenteId } : {}),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        commandes,
        virements,
        transferts,
        produits,
        dettes,
      },
    });
  } catch (error) {
    console.error('Erreur GET menu-alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur chargement des alertes menu' },
      { status: 500 }
    );
  }
}
