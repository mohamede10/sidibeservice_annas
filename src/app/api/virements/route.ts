import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');
    const pvId = pointVenteId ? parseInt(pointVenteId) : undefined;

    // 1. Fetch Virements (enregistrés dans clotures_caisse)
    const virements = await prisma.clotureCaisse.findMany({
      where: pvId ? { pointDeVenteId: pvId } : undefined,
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
        utilisateur: { select: { id: true, nom: true, role: true, telephone: true } },
      },
      orderBy: { dateCloture: 'desc' },
      take: 150,
    });

    // 2. Fetch all sales with cash payments (or total)
    const ventes = await prisma.vente.findMany({
      where: {
        ...(pvId ? { pointVenteId: pvId } : {}),
      },
      select: {
        id: true,
        pointVenteId: true,
        total: true,
        montantPaye: true,
        modePaiement: true,
      },
    });

    // 3. Fetch all expenses in cash
    const depenses = await prisma.depense.findMany({
      where: {
        modePaiement: 'ESPECES',
        ...(pvId ? { pointDeVenteId: pvId } : {}),
      },
      select: {
        id: true,
        pointDeVenteId: true,
        montant: true,
      },
    });

    // 4. Points de vente
    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: { id: true, nom: true, codeBoutique: true, ville: true },
      orderBy: { nom: 'asc' },
    });

    // 5. Active sellers
    const vendeurs = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, nom: true, role: true, pointVenteId: true },
      orderBy: { nom: 'asc' },
    });

    // Calculate aggregated numbers
    let totalVenduEspeces = 0;
    let totalVenduGlobal = 0;

    for (const v of ventes) {
      totalVenduGlobal += v.total;
      if (v.modePaiement === 'ESPECES') {
        totalVenduEspeces += v.montantPaye;
      }
    }

    const totalDepensesEspeces = depenses.reduce((sum, d) => sum + d.montant, 0);

    let totalVireValide = 0;
    let totalVireEnAttente = 0;

    for (const vir of virements) {
      if (vir.statut === 'VALIDEE') {
        totalVireValide += vir.soldeReel;
      } else if (vir.statut === 'EN_ATTENTE') {
        totalVireEnAttente += vir.soldeReel;
      }
    }

    // Difference = Total Vendu Espèces - Dépenses Espèces - Total Viré à l'Admin
    const differenceCaisse = totalVenduEspeces - totalDepensesEspeces - totalVireValide;

    // Synthese par boutique
    const syntheseParBoutique = pointsDeVente.map((pdv) => {
      const pdvVentes = ventes.filter((v) => v.pointVenteId === pdv.id);
      const pdvDepenses = depenses.filter((d) => d.pointDeVenteId === pdv.id);
      const pdvVirements = virements.filter((vir) => vir.pointDeVenteId === pdv.id);

      const venduEsp = pdvVentes
        .filter((v) => v.modePaiement === 'ESPECES')
        .reduce((sum, v) => sum + v.montantPaye, 0);

      const depEsp = pdvDepenses.reduce((sum, d) => sum + d.montant, 0);

      const virValide = pdvVirements
        .filter((vir) => vir.statut === 'VALIDEE')
        .reduce((sum, vir) => sum + vir.soldeReel, 0);

      const virAttente = pdvVirements
        .filter((vir) => vir.statut === 'EN_ATTENTE')
        .reduce((sum, vir) => sum + vir.soldeReel, 0);

      const ecartRestant = venduEsp - depEsp - virValide;

      return {
        pointDeVente: pdv,
        venduEsp,
        depEsp,
        virValide,
        virAttente,
        ecartRestant,
      };
    });

    return NextResponse.json({
      success: true,
      virements,
      pointsDeVente,
      vendeurs,
      statistiques: {
        totalVenduEspeces,
        totalVenduGlobal,
        totalDepensesEspeces,
        totalVireValide,
        totalVireEnAttente,
        differenceCaisse,
        soldeCaisseCentrale: totalVireValide,
      },
      syntheseParBoutique,
    });
  } catch (error) {
    console.error('Erreur API Virements GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement de la caisse de virement' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pointDeVenteId, utilisateurId, montant, notes, statut } = body;

    if (!pointDeVenteId || !utilisateurId || !montant) {
      return NextResponse.json(
        { success: false, error: 'Boutique, vendeur et montant du virement sont obligatoires' },
        { status: 400 }
      );
    }

    const montantVirer = parseFloat(String(montant));
    if (isNaN(montantVirer) || montantVirer <= 0) {
      return NextResponse.json({ success: false, error: 'Montant de virement invalide' }, { status: 400 });
    }

    const pdvId = parseInt(pointDeVenteId);
    const uId = parseInt(utilisateurId);

    // Compute current theoretical sales for that boutique
    const ventes = await prisma.vente.findMany({
      where: { pointVenteId: pdvId, modePaiement: 'ESPECES' },
      select: { montantPaye: true },
    });
    const totalEspecesVente = ventes.reduce((sum, v) => sum + v.montantPaye, 0);

    const prevVirements = await prisma.clotureCaisse.findMany({
      where: { pointDeVenteId: pdvId, statut: 'VALIDEE' },
      select: { soldeReel: true },
    });
    const totalDejaVire = prevVirements.reduce((sum, v) => sum + v.soldeReel, 0);

    const soldeTheoriqueDispo = Math.max(0, totalEspecesVente - totalDejaVire);
    const ecart = soldeTheoriqueDispo - montantVirer;

    const ref = `VIR-${Date.now().toString().slice(-8)}`;

    const virement = await prisma.clotureCaisse.create({
      data: {
        reference: ref,
        pointDeVenteId: pdvId,
        utilisateurId: uId,
        totalEspeces: totalEspecesVente,
        totalVentes: totalEspecesVente,
        soldeTheorique: soldeTheoriqueDispo,
        soldeReel: montantVirer,
        ecart,
        statut: statut || 'EN_ATTENTE',
        notes: notes || `Virement d'espèces vers la Caisse Admin`,
      },
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
        utilisateur: { select: { id: true, nom: true, telephone: true } },
      },
    });

    return NextResponse.json({ success: true, virement });
  } catch (error) {
    console.error('Erreur API Virements POST:', error);
    return NextResponse.json({ success: false, error: 'Erreur création du virement' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, statut, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID virement manquant' }, { status: 400 });
    }

    const virement = await prisma.clotureCaisse.update({
      where: { id: parseInt(id) },
      data: {
        statut: statut || 'VALIDEE',
        ...(notes ? { notes } : {}),
      },
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
        utilisateur: { select: { id: true, nom: true } },
      },
    });

    return NextResponse.json({ success: true, virement });
  } catch (error) {
    console.error('Erreur API Virements PATCH:', error);
    return NextResponse.json({ success: false, error: 'Erreur validation du virement' }, { status: 500 });
  }
}
