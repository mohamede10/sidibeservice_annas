import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const clientsAvecDettes = await prisma.client.findMany({
      where: {
        soldeDette: { gt: 0 },
      },
      include: {
        ventes: {
          where: {
            statutPaiement: { in: ['IMPAYE', 'PARTIEL'] },
          },
          orderBy: { dateVente: 'desc' },
          include: {
            lignes: true,
          },
        },
        paiements: {
          orderBy: { datePaiement: 'desc' },
        },
      },
      orderBy: { soldeDette: 'desc' },
    });

    const totalDettes = clientsAvecDettes.reduce((sum, c) => sum + c.soldeDette, 0);

    return NextResponse.json({
      success: true,
      clients: clientsAvecDettes,
      totalDettes,
    });
  } catch (error) {
    console.error('Erreur API Dettes:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement dettes' }, { status: 500 });
  }
}
