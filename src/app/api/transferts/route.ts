import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');

    const where = pointVenteId
      ? {
          OR: [
            { pointOrigineId: parseInt(pointVenteId) },
            { pointDestinationId: parseInt(pointVenteId) },
          ],
        }
      : undefined;

    const transferts = await prisma.transfertStock.findMany({
      where,
      include: {
        pointOrigine: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
        pointDestination: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
        initiePar: { select: { id: true, nom: true, role: true } },
        validePar: { select: { id: true, nom: true } },
        lignes: {
          include: {
            variante: {
              include: {
                produit: { select: { id: true, nom: true, imageUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { dateTransfert: 'desc' },
      take: 100,
    });

    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: { id: true, nom: true, codeBoutique: true, ville: true },
      orderBy: { nom: 'asc' },
    });

    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: {
        variantes: {
          include: { stocksParPoint: true },
        },
      },
      orderBy: { nom: 'asc' },
      take: 200,
    });

    return NextResponse.json({ success: true, transferts, pointsDeVente, produits });
  } catch (error) {
    console.error('Erreur API Transferts GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement transferts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pointOrigineId, pointDestinationId, lignes, notes, initieParId } = body;

    if (!pointOrigineId || !pointDestinationId) {
      return NextResponse.json({ success: false, error: 'Boutique source et destination obligatoires' }, { status: 400 });
    }
    if (pointOrigineId === pointDestinationId) {
      return NextResponse.json({ success: false, error: 'La source et la destination doivent être différentes' }, { status: 400 });
    }
    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ success: false, error: 'Au moins un article est requis' }, { status: 400 });
    }

    const origId = parseInt(pointOrigineId);
    const destId = parseInt(pointDestinationId);
    const varIds = lignes.map((l: { varianteId: string | number }) => parseInt(String(l.varianteId)));

    // Fetch existing stocks at origin, destination and variant names in parallel before transaction
    const [stocksOrigine, stocksDest, variantes] = await Promise.all([
      prisma.stockParPoint.findMany({
        where: { pointDeVenteId: origId, varianteId: { in: varIds } },
      }),
      prisma.stockParPoint.findMany({
        where: { pointDeVenteId: destId, varianteId: { in: varIds } },
      }),
      prisma.produitVariante.findMany({
        where: { id: { in: varIds } },
        include: { produit: { select: { nom: true } } },
      }),
    ]);

    const origMap = new Map(stocksOrigine.map((s) => [s.varianteId, s.quantite]));
    const destMap = new Map(stocksDest.map((s) => [s.varianteId, s.quantite]));
    const varMap = new Map(variantes.map((v) => [v.id, v.produit?.nom || 'Article']));

    // Pre-validate stock
    for (const ligne of lignes) {
      const vId = parseInt(String(ligne.varianteId));
      const qte = parseInt(String(ligne.quantite));
      if (!vId || isNaN(qte) || qte <= 0) {
        return NextResponse.json({ success: false, error: 'Quantité invalide' }, { status: 400 });
      }
      const dispo = origMap.get(vId) ?? 0;
      if (dispo < qte) {
        return NextResponse.json({
          success: false,
          error: `Stock insuffisant pour "${varMap.get(vId)}" (disponible: ${dispo}, demandé: ${qte})`,
        }, { status: 400 });
      }
    }

    const ref = `TRF-${Date.now().toString().slice(-8)}`;

    // Create transfert with transaction and extended timeout for cloud databases
    const transfert = await prisma.$transaction(async (tx) => {
      const newTransfert = await tx.transfertStock.create({
        data: {
          reference: ref,
          pointOrigineId: origId,
          pointDestinationId: destId,
          statut: 'EXPEDIE',
          initieParId: initieParId ? parseInt(initieParId) : null,
          notes: notes || null,
          lignes: {
            create: lignes.map((l: { varianteId: string | number; quantite: string | number; nomArticle?: string }) => ({
              varianteId: parseInt(String(l.varianteId)),
              nomArticle: l.nomArticle || '',
              quantite: parseInt(String(l.quantite)),
            })),
          },
        },
        include: {
          pointOrigine: { select: { id: true, nom: true } },
          pointDestination: { select: { id: true, nom: true } },
          lignes: true,
        },
      });

      const mouvements: Array<{
        varianteId: number;
        pointDeVenteId: number;
        typeMouvement: string;
        quantite: number;
        stockAvant: number;
        stockApres: number;
        motif: string;
        referenceDoc: string;
        utilisateurId: number | null;
      }> = [];

      for (const ligne of lignes) {
        const vId = parseInt(String(ligne.varianteId));
        const qte = parseInt(String(ligne.quantite));
        const qteAvantOrig = origMap.get(vId) ?? 0;
        const qteAvantDest = destMap.get(vId) ?? 0;

        // Decrement stock at origin
        await tx.stockParPoint.update({
          where: { varianteId_pointDeVenteId: { varianteId: vId, pointDeVenteId: origId } },
          data: { quantite: { decrement: qte } },
        });

        // Increment or create stock at destination
        await tx.stockParPoint.upsert({
          where: { varianteId_pointDeVenteId: { varianteId: vId, pointDeVenteId: destId } },
          update: { quantite: { increment: qte } },
          create: { varianteId: vId, pointDeVenteId: destId, quantite: qte },
        });

        // Stock movement SORTANT at origin
        mouvements.push({
          varianteId: vId,
          pointDeVenteId: origId,
          typeMouvement: 'TRANSFERT_SORTANT',
          quantite: -qte,
          stockAvant: qteAvantOrig,
          stockApres: qteAvantOrig - qte,
          motif: `Transfert vers ${newTransfert.pointDestination.nom}`,
          referenceDoc: ref,
          utilisateurId: initieParId ? parseInt(initieParId) : null,
        });

        // Stock movement ENTRANT at destination
        mouvements.push({
          varianteId: vId,
          pointDeVenteId: destId,
          typeMouvement: 'TRANSFERT_ENTRANT',
          quantite: qte,
          stockAvant: qteAvantDest,
          stockApres: qteAvantDest + qte,
          motif: `Transfert depuis ${newTransfert.pointOrigine.nom}`,
          referenceDoc: ref,
          utilisateurId: initieParId ? parseInt(initieParId) : null,
        });
      }

      // Batch insert stock movements in single query
      if (mouvements.length > 0) {
        await tx.stockMouvement.createMany({ data: mouvements });
      }

      return newTransfert;
    }, {
      maxWait: 20000,
      timeout: 45000,
    });

    return NextResponse.json({ success: true, transfert });
  } catch (error) {
    console.error('Erreur API Transferts POST:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors du transfert de stock' }, { status: 500 });
  }
}
