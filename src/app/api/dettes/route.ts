import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointVenteId = searchParams.get('pointVenteId');

    if (pointVenteId && !isNaN(parseInt(pointVenteId))) {
      const pvId = parseInt(pointVenteId);

      // Récupérer les ventes impayées ou partielles de cette boutique spécifique
      const ventesImpayees = await prisma.vente.findMany({
        where: {
          pointVenteId: pvId,
          statutPaiement: { in: ['IMPAYE', 'PARTIEL'] },
          montantRestant: { gt: 0 },
        },
        include: {
          client: true,
          lignes: true,
          factures: true,
        },
        orderBy: { dateVente: 'desc' },
      });

      // Grouper par client pour cette boutique
      const clientsMap = new Map<number, {
        id: number;
        nom: string;
        telephone?: string | null;
        ville?: string | null;
        soldeDette: number;
        ventes: typeof ventesImpayees;
        paiements: Array<{
          id: number;
          montant: number;
          modePaiement: string;
          datePaiement: Date;
          referenceRecu?: string | null;
        }>;
      }>();

      let totalDettesBoutique = 0;

      for (const v of ventesImpayees) {
        totalDettesBoutique += v.montantRestant;
        const clientId = v.clientId || 0;
        const clientNom = v.client?.nom || v.nomClient || 'Client Comptant';

        if (!clientsMap.has(clientId)) {
          clientsMap.set(clientId, {
            id: clientId,
            nom: clientNom,
            telephone: v.client?.telephone || v.telephoneClient,
            ville: v.client?.ville || 'Kankan',
            soldeDette: 0,
            ventes: [],
            paiements: [],
          });
        }

        const entry = clientsMap.get(clientId)!;
        entry.soldeDette += v.montantRestant;
        entry.ventes.push(v);
      }

      // Récupérer les paiements récents pour ces clients si applicable
      const clientIds = Array.from(clientsMap.keys()).filter((id) => id > 0);
      if (clientIds.length > 0) {
        const paiements = await prisma.paiementDette.findMany({
          where: { clientId: { in: clientIds } },
          orderBy: { datePaiement: 'desc' },
          take: 50,
        });
        for (const p of paiements) {
          if (clientsMap.has(p.clientId)) {
            clientsMap.get(p.clientId)!.paiements.push(p);
          }
        }
      }

      const clientsList = Array.from(clientsMap.values()).sort((a, b) => b.soldeDette - a.soldeDette);

      return NextResponse.json({
        success: true,
        clients: clientsList,
        totalDettes: totalDettesBoutique,
      });
    }

    // Vue globale ADMIN (Toutes les boutiques)
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
            pointVente: true,
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
