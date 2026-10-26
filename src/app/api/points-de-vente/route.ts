import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const pointsDeVente = await prisma.pointDeVente.findMany({
      include: {
        gerant: { select: { id: true, nom: true, login: true } },
        vendeurs: { select: { id: true, nom: true, login: true, role: true, active: true } },
        _count: {
          select: {
            ventes: true,
            stocks: true,
            vendeurs: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Enrichir avec stats de ventes (30 derniers jours)
    const trente = new Date();
    trente.setDate(trente.getDate() - 30);

    const ventesStats = await prisma.vente.groupBy({
      by: ['pointVenteId'],
      where: { dateVente: { gte: trente } },
      _sum: { total: true, montantPaye: true },
      _count: { _all: true },
    });

    const statsByPDV = Object.fromEntries(ventesStats.map((v) => [v.pointVenteId, v]));

    // Calculer le montant et la quantité de stock par boutique
    const stocksParPoint = await prisma.stockParPoint.findMany({
      include: {
        variante: {
          select: {
            prix: true,
            coutAchat: true,
          },
        },
      },
    });

    const stockStatsByPDV: Record<number, { montant: number; quantite: number; references: number }> = {};
    for (const p of pointsDeVente) {
      stockStatsByPDV[p.id] = { montant: 0, quantite: 0, references: 0 };
    }

    for (const sp of stocksParPoint) {
      if (stockStatsByPDV[sp.pointDeVenteId]) {
        stockStatsByPDV[sp.pointDeVenteId].montant += sp.quantite * sp.variante.prix;
        stockStatsByPDV[sp.pointDeVenteId].quantite += sp.quantite;
        if (sp.quantite > 0) {
          stockStatsByPDV[sp.pointDeVenteId].references += 1;
        }
      }
    }

    const enriched = pointsDeVente.map((p) => ({
      ...p,
      stats30j: statsByPDV[p.id] ?? { _sum: { total: 0, montantPaye: 0 }, _count: { _all: 0 } },
      stockInfo: stockStatsByPDV[p.id] ?? { montant: 0, quantite: 0, references: 0 },
    }));

    return NextResponse.json({ success: true, pointsDeVente: enriched });
  } catch (error) {
    console.error('Erreur API Points de Vente GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement points de vente' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, codeBoutique, ville, adresse, telephone, email, gerantId } = body;

    if (!nom || !codeBoutique || !ville) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants (nom, code, ville)' }, { status: 400 });
    }

    const pdv = await prisma.pointDeVente.create({
      data: {
        nom,
        codeBoutique: codeBoutique.toUpperCase(),
        ville,
        adresse: adresse || null,
        telephone: telephone || null,
        email: email || null,
        gerantId: gerantId ? parseInt(gerantId) : null,
        active: true,
      },
    });

    return NextResponse.json({ success: true, pointDeVente: pdv });
  } catch (error: unknown) {
    console.error('Erreur API Points de Vente POST:', error);
    const msg = error instanceof Error && (error as NodeJS.ErrnoException).code === 'P2002'
      ? 'Ce code boutique existe déjà'
      : 'Erreur création point de vente';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nom, codeBoutique, ville, adresse, telephone, email, gerantId, active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    }

    const updated = await prisma.pointDeVente.update({
      where: { id: parseInt(id) },
      data: {
        ...(nom !== undefined && { nom }),
        ...(codeBoutique !== undefined && { codeBoutique: codeBoutique.toUpperCase() }),
        ...(ville !== undefined && { ville }),
        ...(adresse !== undefined && { adresse: adresse || null }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(gerantId !== undefined && { gerantId: gerantId ? parseInt(gerantId) : null }),
        ...(active !== undefined && { active }),
      },
      include: {
        gerant: { select: { id: true, nom: true, login: true } },
        vendeurs: { select: { id: true, nom: true, login: true, role: true, active: true } },
      },
    });

    return NextResponse.json({ success: true, pointDeVente: updated });
  } catch (error: unknown) {
    console.error('Erreur API Points de Vente PATCH:', error);
    const msg = error instanceof Error && (error as NodeJS.ErrnoException).code === 'P2002'
      ? 'Ce code boutique existe déjà'
      : 'Erreur modification point de vente';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const mode = searchParams.get('mode'); // 'suspend' | 'permanent'
    let id = idParam ? parseInt(idParam) : null;

    if (!id) {
      try {
        const body = await req.json();
        if (body.id) id = parseInt(body.id);
      } catch {
        // ignore
      }
    }

    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID de la boutique requis' }, { status: 400 });
    }

    const pdv = await prisma.pointDeVente.findUnique({
      where: { id },
    });

    if (!pdv) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 });
    }

    // 1. Mode SUSPENSION (Mise en pause) : conserve toutes les données et désactive la boutique
    if (mode === 'suspend') {
      await prisma.pointDeVente.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        success: true,
        suspended: true,
        message: `La boutique « ${pdv.nom} » a été suspendue. Toutes ses données sont conservées et vous pouvez la réactiver à tout moment.`,
      });
    }

    // 2. Mode SUPPRESSION DÉFINITIVE : supprime la boutique même si elle contient des données historiques
    await prisma.$transaction(async (tx) => {
      // Détacher les vendeurs et retirer le gérant
      await tx.user.updateMany({
        where: { pointVenteId: id },
        data: { pointVenteId: null },
      });
      await tx.pointDeVente.update({
        where: { id },
        data: { gerantId: null },
      });

      // Supprimer les mouvements de stock
      await tx.stockMouvement.deleteMany({
        where: { pointDeVenteId: id },
      });

      // Supprimer les stocks par magasin
      await tx.stockParPoint.deleteMany({
        where: { pointDeVenteId: id },
      });

      // Supprimer les transferts inter-boutiques
      const transferts = await tx.transfertStock.findMany({
        where: { OR: [{ pointOrigineId: id }, { pointDestinationId: id }] },
        select: { id: true },
      });
      const transfertIds = transferts.map((t) => t.id);
      if (transfertIds.length > 0) {
        await tx.transfertLigne.deleteMany({
          where: { transfertId: { in: transfertIds } },
        });
        await tx.transfertStock.deleteMany({
          where: { id: { in: transfertIds } },
        });
      }

      // Supprimer les factures
      const factures = await tx.facture.findMany({
        where: { pointDeVenteId: id },
        select: { id: true },
      });
      const factureIds = factures.map((f) => f.id);
      if (factureIds.length > 0) {
        await tx.factureLigne.deleteMany({
          where: { factureId: { in: factureIds } },
        });
        await tx.facture.deleteMany({
          where: { id: { in: factureIds } },
        });
      }

      // Supprimer les ventes et leurs détails
      const ventes = await tx.vente.findMany({
        where: { pointVenteId: id },
        select: { id: true },
      });
      const venteIds = ventes.map((v) => v.id);
      if (venteIds.length > 0) {
        await tx.paiementDette.deleteMany({
          where: { venteId: { in: venteIds } },
        });
        await tx.venteLigne.deleteMany({
          where: { venteId: { in: venteIds } },
        });
        await tx.vente.deleteMany({
          where: { id: { in: venteIds } },
        });
      }

      // Supprimer les achats fournisseurs
      const achats = await tx.achat.findMany({
        where: { pointDeVenteId: id },
        select: { id: true },
      });
      const achatIds = achats.map((a) => a.id);
      if (achatIds.length > 0) {
        await tx.achatLigne.deleteMany({
          where: { achatId: { in: achatIds } },
        });
        await tx.achat.deleteMany({
          where: { id: { in: achatIds } },
        });
      }

      // Supprimer les dépenses et charges
      await tx.depense.deleteMany({
        where: { pointDeVenteId: id },
      });

      // Supprimer les clôtures de caisse et virements
      await tx.clotureCaisse.deleteMany({
        where: { pointDeVenteId: id },
      });

      // Supprimer définitivement la boutique
      await tx.pointDeVente.delete({
        where: { id },
      });
    }, {
      maxWait: 20000,
      timeout: 45000,
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `La boutique « ${pdv.nom} » et toutes ses données associées ont été définitivement supprimées.`,
    });
  } catch (error) {
    console.error('Erreur API Points de Vente DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression définitive de la boutique' }, { status: 500 });
  }
}
