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

    // Détacher les vendeurs affectés à cette boutique
    await prisma.user.updateMany({
      where: { pointVenteId: id },
      data: { pointVenteId: null },
    });

    // Vérifier si la boutique a un historique de transactions comptables
    const [ventesCount, facturesCount, achatsCount] = await Promise.all([
      prisma.vente.count({ where: { pointVenteId: id } }),
      prisma.facture.count({ where: { pointDeVenteId: id } }),
      prisma.achat.count({ where: { pointDeVenteId: id } }),
    ]);

    if (ventesCount > 0 || facturesCount > 0 || achatsCount > 0) {
      // Pour protéger l'intégrité comptable et légale, désactiver et archiver la boutique
      await prisma.pointDeVente.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message: `La boutique « ${pdv.nom} » a été désactivée et archivée avec succès car elle contient des factures et ventes historiques à conserver légalement.`,
      });
    }

    // Si aucune transaction liée, supprimer les stocks par point puis supprimer définitivement la boutique
    await prisma.stockParPoint.deleteMany({
      where: { pointDeVenteId: id },
    });

    await prisma.pointDeVente.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      archived: false,
      message: `La boutique « ${pdv.nom} » a été définitivement supprimée.`,
    });
  } catch (error) {
    console.error('Erreur API Points de Vente DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression de la boutique' }, { status: 500 });
  }
}
