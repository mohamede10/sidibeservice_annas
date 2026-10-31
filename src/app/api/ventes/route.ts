import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const statut = searchParams.get('statut') || '';
    const pointVenteId = searchParams.get('pointVenteId');

    const whereClause: Record<string, unknown> = {};

    if (pointVenteId && !isNaN(parseInt(pointVenteId))) {
      whereClause.pointVenteId = parseInt(pointVenteId);
    }

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
        pointVente: true,
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    let id = idParam ? parseInt(idParam) : null;

    if (!id) {
      try {
        const body = await request.json();
        if (body.id) id = parseInt(body.id);
      } catch {
        // ignore
      }
    }

    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID de la facture/vente requis' }, { status: 400 });
    }

    const vente = await prisma.vente.findUnique({
      where: { id },
      include: {
        lignes: {
          include: {
            variante: {
              include: {
                produit: true,
              },
            },
          },
        },
        client: true,
        factures: true,
      },
    });

    if (!vente) {
      return NextResponse.json({ success: false, error: 'Facture / vente introuvable' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restaurer le stock si les variantes existent et sont actives
      for (const ligne of vente.lignes) {
        if (ligne.varianteId && ligne.quantite > 0) {
          // Si la variante et son produit sont encore actifs, on restaure le stock
          if (ligne.variante?.produit?.actif) {
            await tx.stockParPoint.updateMany({
              where: {
                pointDeVenteId: vente.pointVenteId,
                varianteId: ligne.varianteId,
              },
              data: {
                quantite: { increment: ligne.quantite },
              },
            });

            await tx.produitVariante.updateMany({
              where: { id: ligne.varianteId },
              data: {
                quantiteStock: { increment: ligne.quantite },
              },
            });
          }
        }
      }

      // 2. Mouvement de stock lié à la référence de la vente
      await tx.stockMouvement.deleteMany({
        where: { referenceDoc: vente.reference },
      });

      // 3. Ajuster la dette du client si un montant restait dû
      if (vente.clientId && vente.montantRestant > 0) {
        const detteADeduire = Math.min(vente.montantRestant, (vente.client?.soldeDette ?? vente.montantRestant));
        if (detteADeduire > 0) {
          await tx.client.update({
            where: { id: vente.clientId },
            data: {
              soldeDette: { decrement: detteADeduire },
            },
          });
        }
      }

      // 4. Supprimer les paiements de dette enregistrés pour cette vente
      await tx.paiementDette.deleteMany({
        where: { venteId: id },
      });

      // 5. Supprimer les factures et leurs lignes
      const factureIds = vente.factures.map((f) => f.id);
      if (factureIds.length > 0) {
        await tx.factureLigne.deleteMany({
          where: { factureId: { in: factureIds } },
        });
        await tx.facture.deleteMany({
          where: { id: { in: factureIds } },
        });
      }

      // 6. Supprimer les lignes de vente
      await tx.venteLigne.deleteMany({
        where: { venteId: id },
      });

      // 7. Supprimer la vente
      await tx.vente.delete({
        where: { id },
      });
    }, {
      maxWait: 20000,
      timeout: 45000,
    });

    return NextResponse.json({
      success: true,
      message: `La facture ${vente.reference} a été définitivement supprimée.`,
    });
  } catch (error) {
    console.error('Erreur API Ventes DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression de la facture' }, { status: 500 });
  }
}
