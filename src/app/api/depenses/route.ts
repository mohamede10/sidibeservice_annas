import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');
    const pvId = pointVenteId ? parseInt(pointVenteId) : undefined;

    const depenses = await prisma.depense.findMany({
      where: pvId ? { pointDeVenteId: pvId } : undefined,
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
        utilisateur: { select: { id: true, nom: true } },
      },
      orderBy: { dateDepense: 'desc' },
      take: 100,
    });

    const agg = await prisma.depense.aggregate({
      where: pvId ? { pointDeVenteId: pvId } : undefined,
      _sum: { montant: true },
    });

    return NextResponse.json({ success: true, depenses, totalMontant: agg._sum.montant || 0 });
  } catch (error) {
    console.error('Erreur API Dépenses GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement dépenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pointDeVenteId, categorie, motif, montant, modePaiement, beneficiaire, utilisateurId } = body;

    if (!pointDeVenteId || !motif || !montant) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const depense = await prisma.depense.create({
      data: {
        pointDeVenteId: parseInt(pointDeVenteId),
        categorie: categorie || 'DIVERS',
        motif,
        montant: parseFloat(montant),
        modePaiement: modePaiement || 'ESPECES',
        beneficiaire: beneficiaire || null,
        utilisateurId: utilisateurId ? parseInt(utilisateurId) : null,
      },
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
      },
    });

    return NextResponse.json({ success: true, depense });
  } catch (error) {
    console.error('Erreur API Dépenses POST:', error);
    return NextResponse.json({ success: false, error: 'Erreur création dépense' }, { status: 500 });
  }
}
