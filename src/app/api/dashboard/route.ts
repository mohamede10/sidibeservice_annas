import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const totalProduits = await prisma.produit.count({ where: { actif: true } });
    const totalClients = await prisma.client.count();
    const totalVentes = await prisma.vente.count();

    // Calcul du chiffre d'affaires total
    const ventesAgg = await prisma.vente.aggregate({
      _sum: {
        total: true,
        montantPaye: true,
        montantRestant: true,
      },
    });

    // Total des dettes clients à recouvrer
    const clientsDettesAgg = await prisma.client.aggregate({
      _sum: {
        soldeDette: true,
      },
    });

    // Ventes récentes (les 10 dernières)
    const recentVentes = await prisma.vente.findMany({
      take: 10,
      orderBy: { dateVente: 'desc' },
      include: {
        client: true,
        vendeur: true,
        lignes: true,
      },
    });

    // Alertes stock faible (quantité <= 5)
    const lowStockVariantes = await prisma.produitVariante.findMany({
      where: {
        quantiteStock: { lte: 5 },
      },
      take: 8,
      include: {
        produit: true,
      },
    });

    // Top clients avec dettes
    const clientsDebiteurs = await prisma.client.findMany({
      where: {
        soldeDette: { gt: 0 },
      },
      orderBy: { soldeDette: 'desc' },
      take: 6,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalProduits,
        totalClients,
        totalVentes,
        chiffreAffaires: ventesAgg._sum.total || 0,
        montantEncaisse: ventesAgg._sum.montantPaye || 0,
        totalDettes: (clientsDettesAgg._sum.soldeDette || 0) + (ventesAgg._sum.montantRestant || 0),
      },
      recentVentes,
      lowStockVariantes,
      clientsDebiteurs,
    });
  } catch (error) {
    console.error('Erreur API Dashboard:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement dashboard' }, { status: 500 });
  }
}
