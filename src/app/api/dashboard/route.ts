import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointVenteIdParam = searchParams.get('pointVenteId');
    const pointVenteId = pointVenteIdParam && !isNaN(parseInt(pointVenteIdParam)) ? parseInt(pointVenteIdParam) : null;

    if (pointVenteId) {
      // =========================================================================
      // VUE BOUTIQUE SPÉCIFIQUE (Pour chaque Vendeur ou Admin filtrant sur 1 boutique)
      // =========================================================================
      const [pointDeVente, totalProduits, totalVentes, ventesAgg, recentVentes, stockParPointList] = await Promise.all([
        prisma.pointDeVente.findUnique({
          where: { id: pointVenteId },
          select: { id: true, nom: true, codeBoutique: true, ville: true },
        }),
        prisma.produit.count({ where: { actif: true } }),
        prisma.vente.count({ where: { pointVenteId } }),
        prisma.vente.aggregate({
          where: { pointVenteId },
          _sum: {
            total: true,
            montantPaye: true,
            montantRestant: true,
          },
        }),
        prisma.vente.findMany({
          where: { pointVenteId },
          take: 10,
          orderBy: { dateVente: 'desc' },
          include: {
            client: true,
            vendeur: true,
            pointVente: true,
            lignes: true,
            factures: true,
          },
        }),
        prisma.stockParPoint.findMany({
          where: {
            pointDeVenteId: pointVenteId,
          },
          include: {
            variante: {
              include: {
                produit: true,
              },
            },
          },
        }),
      ]);

      // Calcul du Montant Total du Stock et Unités pour CETTE boutique
      let montantTotalStockBoutique = 0;
      let totalArticlesStockBoutique = 0;

      for (const sp of stockParPointList) {
        montantTotalStockBoutique += sp.quantite * sp.variante.prix;
        totalArticlesStockBoutique += sp.quantite;
      }

      // Si aucun StockParPoint n'existe encore pour cette boutique spécifique, fallback sur les variantes globales si boutique 1
      if (stockParPointList.length === 0 && pointVenteId === 1) {
        const allVars = await prisma.produitVariante.findMany();
        for (const v of allVars) {
          montantTotalStockBoutique += v.quantiteStock * v.prix;
          totalArticlesStockBoutique += v.quantiteStock;
        }
      }

      type LowStockItem = {
        id: number;
        taille: string | null;
        couleur: string | null;
        quantiteStock: number;
        produit: {
          nom: string;
          ref: string | null;
          categorieNom: string | null;
        };
      };

      // Alertes stocks faibles (quantité <= 5)
      const lowStockFromSPP = stockParPointList
        .filter((sp) => sp.quantite <= 5)
        .slice(0, 8);

      let lowStockVariantes: LowStockItem[] = lowStockFromSPP.map((sp) => ({
        id: sp.variante.id,
        taille: sp.variante.taille,
        couleur: sp.variante.couleur,
        quantiteStock: sp.quantite,
        produit: {
          nom: sp.variante.produit.nom,
          ref: sp.variante.produit.ref,
          categorieNom: sp.variante.produit.categorieNom,
        },
      }));

      if (lowStockVariantes.length === 0) {
        const fallbackLow = await prisma.produitVariante.findMany({
          where: { quantiteStock: { lte: 5 } },
          take: 8,
          include: { produit: true },
        });
        lowStockVariantes = fallbackLow.map((v) => ({
          id: v.id,
          taille: v.taille,
          couleur: v.couleur,
          quantiteStock: v.quantiteStock,
          produit: {
            nom: v.produit.nom,
            ref: v.produit.ref,
            categorieNom: v.produit.categorieNom,
          },
        }));
      }

      // Ventes avec dettes de cette boutique
      const ventesAvecDettes = await prisma.vente.findMany({
        where: {
          pointVenteId,
          statutPaiement: { in: ['IMPAYE', 'PARTIEL'] },
          montantRestant: { gt: 0 },
        },
        orderBy: { montantRestant: 'desc' },
        take: 6,
        include: { client: true },
      });

      const clientsDebiteurs = ventesAvecDettes.map((v) => ({
        id: v.clientId || v.id,
        nom: v.client?.nom || v.nomClient || 'Client Comptant',
        telephone: v.client?.telephone || v.telephoneClient || undefined,
        soldeDette: v.montantRestant,
      }));

      // Nombre de clients ayant acheté dans cette boutique
      const distinctClients = await prisma.vente.groupBy({
        by: ['clientId'],
        where: { pointVenteId, clientId: { not: null } },
      });

      return NextResponse.json({
        success: true,
        isFiltered: true,
        pointDeVente,
        stats: {
          totalProduits,
          totalClients: distinctClients.length,
          totalVentes,
          chiffreAffaires: ventesAgg._sum.total || 0,
          montantEncaisse: ventesAgg._sum.montantPaye || 0,
          totalDettes: ventesAgg._sum.montantRestant || 0,
          montantTotalStock: montantTotalStockBoutique,
          totalStockArticles: totalArticlesStockBoutique,
        },
        recentVentes,
        lowStockVariantes,
        clientsDebiteurs,
      });
    }

    // =========================================================================
    // VUE GLOBALE CONSOLIDÉE (Pour l'ADMIN - Toutes les Boutiques)
    // =========================================================================
    const [
      totalProduits,
      totalClients,
      totalVentes,
      ventesAgg,
      clientsDettesAgg,
      recentVentes,
      lowStockVariantesRaw,
      clientsDebiteursRaw,
      allStocksParPoint,
      allVariantes,
      allBoutiques,
      ventesParBoutique,
    ] = await Promise.all([
      prisma.produit.count({ where: { actif: true } }),
      prisma.client.count(),
      prisma.vente.count(),
      prisma.vente.aggregate({
        _sum: {
          total: true,
          montantPaye: true,
          montantRestant: true,
        },
      }),
      prisma.client.aggregate({
        _sum: {
          soldeDette: true,
        },
      }),
      prisma.vente.findMany({
        take: 10,
        orderBy: { dateVente: 'desc' },
        include: {
          client: true,
          vendeur: true,
          pointVente: true,
          lignes: true,
          factures: true,
        },
      }),
      prisma.produitVariante.findMany({
        where: {
          quantiteStock: { lte: 5 },
        },
        take: 8,
        include: {
          produit: true,
        },
      }),
      prisma.client.findMany({
        where: {
          soldeDette: { gt: 0 },
        },
        orderBy: { soldeDette: 'desc' },
        take: 6,
      }),
      prisma.stockParPoint.findMany({
        include: {
          variante: true,
        },
      }),
      prisma.produitVariante.findMany(),
      prisma.pointDeVente.findMany({
        select: { id: true, nom: true, codeBoutique: true, ville: true, active: true },
        orderBy: { id: 'asc' },
      }),
      prisma.vente.groupBy({
        by: ['pointVenteId'],
        _sum: {
          total: true,
          montantPaye: true,
          montantRestant: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    // Calcul du stock par boutique
    const stockStatsByPDV: Record<number, { montant: number; quantite: number; references: number }> = {};
    for (const b of allBoutiques) {
      stockStatsByPDV[b.id] = { montant: 0, quantite: 0, references: 0 };
    }

    let montantTotalStockGlobal = 0;
    let totalStockArticlesGlobal = 0;

    if (allStocksParPoint.length > 0) {
      for (const sp of allStocksParPoint) {
        const val = sp.quantite * sp.variante.prix;
        montantTotalStockGlobal += val;
        totalStockArticlesGlobal += sp.quantite;

        if (stockStatsByPDV[sp.pointDeVenteId]) {
          stockStatsByPDV[sp.pointDeVenteId].montant += val;
          stockStatsByPDV[sp.pointDeVenteId].quantite += sp.quantite;
          if (sp.quantite > 0) {
            stockStatsByPDV[sp.pointDeVenteId].references += 1;
          }
        }
      }
    } else {
      // Fallback si aucun StockParPoint
      for (const v of allVariantes) {
        montantTotalStockGlobal += v.quantiteStock * v.prix;
        totalStockArticlesGlobal += v.quantiteStock;
      }
      if (allBoutiques.length > 0) {
        stockStatsByPDV[allBoutiques[0].id] = {
          montant: montantTotalStockGlobal,
          quantite: totalStockArticlesGlobal,
          references: allVariantes.filter((v) => v.quantiteStock > 0).length,
        };
      }
    }

    const ventesMap = Object.fromEntries(ventesParBoutique.map((v) => [v.pointVenteId, v]));

    // Ventilation complète par boutique pour l'Admin avec le MONTANT DU STOCK
    const boutiquesBreakdown = allBoutiques.map((b) => {
      const vStats = ventesMap[b.id];
      const stockInfo = stockStatsByPDV[b.id] || { montant: 0, quantite: 0, references: 0 };

      return {
        pointVenteId: b.id,
        nom: b.nom,
        codeBoutique: b.codeBoutique,
        ville: b.ville,
        active: b.active,
        chiffreAffaires: vStats?._sum?.total || 0,
        montantEncaisse: vStats?._sum?.montantPaye || 0,
        totalDettes: vStats?._sum?.montantRestant || 0,
        nombreVentes: vStats?._count?._all || 0,
        // Montant et quantité du stock de chaque boutique
        montantTotalStock: stockInfo.montant,
        quantiteTotalStock: stockInfo.quantite,
        referencesEnStock: stockInfo.references,
      };
    });

    const lowStockVariantes = lowStockVariantesRaw.map((v) => ({
      id: v.id,
      taille: v.taille,
      couleur: v.couleur,
      quantiteStock: v.quantiteStock,
      produit: {
        nom: v.produit.nom,
        ref: v.produit.ref,
        categorieNom: v.produit.categorieNom,
      },
    }));

    const clientsDebiteurs = clientsDebiteursRaw.map((c) => ({
      id: c.id,
      nom: c.nom,
      telephone: c.telephone || undefined,
      soldeDette: c.soldeDette,
    }));

    return NextResponse.json({
      success: true,
      isFiltered: false,
      stats: {
        totalProduits,
        totalClients,
        totalVentes,
        chiffreAffaires: ventesAgg._sum.total || 0,
        montantEncaisse: ventesAgg._sum.montantPaye || 0,
        totalDettes: (clientsDettesAgg._sum.soldeDette || 0) + (ventesAgg._sum.montantRestant || 0),
        montantTotalStock: montantTotalStockGlobal,
        totalStockArticles: totalStockArticlesGlobal,
      },
      recentVentes,
      lowStockVariantes,
      clientsDebiteurs,
      boutiquesBreakdown,
    });
  } catch (error) {
    console.error('Erreur API Dashboard:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement dashboard' }, { status: 500 });
  }
}
