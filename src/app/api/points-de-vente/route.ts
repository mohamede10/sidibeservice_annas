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

    const enriched = pointsDeVente.map((p) => ({
      ...p,
      stats30j: statsByPDV[p.id] ?? { _sum: { total: 0, montantPaye: 0 }, _count: { _all: 0 } },
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
