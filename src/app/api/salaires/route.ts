import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');
    const utilisateurId = searchParams.get('utilisateurId');
    const mois = searchParams.get('mois'); // ex: 2026-10

    const pvId = pointVenteId ? parseInt(pointVenteId) : undefined;
    const uId = utilisateurId ? parseInt(utilisateurId) : undefined;

    // Filter depenses of category SALAIRE
    const whereClause: Record<string, unknown> = {
      categorie: 'SALAIRE',
    };

    if (pvId) whereClause.pointDeVenteId = pvId;
    if (uId) whereClause.utilisateurId = uId;

    if (mois) {
      const [year, month] = mois.split('-').map(Number);
      if (year && month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        whereClause.dateDepense = { gte: start, lte: end };
      }
    }

    const salaires = await prisma.depense.findMany({
      where: whereClause,
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
        utilisateur: { select: { id: true, nom: true, role: true, telephone: true } },
      },
      orderBy: { dateDepense: 'desc' },
      take: 150,
    });

    // Sellers & managers list
    const vendeurs = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['VENDEUR', 'GERANT'] },
      },
      include: {
        pointVenteDefaut: { select: { id: true, nom: true, codeBoutique: true } },
      },
      orderBy: { nom: 'asc' },
    });

    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: { id: true, nom: true, codeBoutique: true, ville: true },
      orderBy: { nom: 'asc' },
    });

    // Calculate aggregated totals
    const totalMontant = salaires.reduce((sum, s) => sum + s.montant, 0);

    return NextResponse.json({
      success: true,
      salaires,
      vendeurs,
      pointsDeVente,
      totalMontant,
      nbPaiements: salaires.length,
    });
  } catch (error) {
    console.error('Erreur API Salaires GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement des salaires' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      utilisateurId,
      pointDeVenteId,
      mois,
      salaireBase,
      prime = 0,
      deductions = 0,
      modePaiement = 'ESPECES',
      beneficiaire,
      notes,
    } = body;

    if (!utilisateurId || !pointDeVenteId || !salaireBase) {
      return NextResponse.json(
        { success: false, error: 'Vendeur, boutique et montant de base sont obligatoires' },
        { status: 400 }
      );
    }

    const base = parseFloat(String(salaireBase)) || 0;
    const p = parseFloat(String(prime)) || 0;
    const d = parseFloat(String(deductions)) || 0;
    const montantNet = Math.max(0, base + p - d);

    // Format motif description
    const labelMois = mois || new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const detailCalcul = `Base: ${base.toLocaleString('fr-FR')} GNF` +
      (p > 0 ? ` + Prime: ${p.toLocaleString('fr-FR')} GNF` : '') +
      (d > 0 ? ` - Retenues: ${d.toLocaleString('fr-FR')} GNF` : '');
    const motif = `Salaire ${labelMois} (${detailCalcul})${notes ? ` - ${notes}` : ''}`;

    const depense = await prisma.depense.create({
      data: {
        pointDeVenteId: parseInt(pointDeVenteId),
        utilisateurId: parseInt(utilisateurId),
        categorie: 'SALAIRE',
        motif,
        montant: montantNet,
        modePaiement: modePaiement || 'ESPECES',
        beneficiaire: beneficiaire || null,
      },
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
        utilisateur: { select: { id: true, nom: true, telephone: true } },
      },
    });

    return NextResponse.json({ success: true, salaire: depense });
  } catch (error) {
    console.error('Erreur API Salaires POST:', error);
    return NextResponse.json({ success: false, error: 'Erreur enregistrement salaire' }, { status: 500 });
  }
}
