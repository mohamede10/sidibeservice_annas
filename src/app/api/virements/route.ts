import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyAdminVirement } from '@/lib/sms';
import { notifyAdminVirementEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');
    const pvId = pointVenteId ? parseInt(pointVenteId) : undefined;

    // 1. Fetch Virements (enregistrés dans clotures_caisse)
    const virements = await prisma.clotureCaisse.findMany({
      where: pvId ? { pointDeVenteId: pvId } : undefined,
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true, ville: true, telephone: true } },
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

    // 3b. Fetch cash debt repayments (recouvrements de dettes en espèces)
    const paiementsDette = await prisma.paiementDette.findMany({
      where: {
        modePaiement: 'ESPECES',
      },
      select: {
        id: true,
        montant: true,
        venteId: true,
        recuParId: true,
        vente: {
          select: {
            pointVenteId: true,
            modePaiement: true,
          },
        },
        recuPar: {
          select: {
            pointVenteId: true,
          },
        },
      },
    });

    // 4. Points de vente (filtré si boutique spécifique demandée)
    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: {
        active: true,
        ...(pvId ? { id: pvId } : {}),
      },
      select: { id: true, nom: true, codeBoutique: true, ville: true, telephone: true },
      orderBy: { nom: 'asc' },
    });

    // 5. Active sellers (filtré si boutique spécifique)
    const vendeurs = await prisma.user.findMany({
      where: {
        active: true,
        ...(pvId ? { pointVenteId: pvId } : {}),
      },
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

    // Ajouter les remboursements de dettes reçus en espèces sur les ventes non-espèces (ou sans vente liée)
    let totalRecouvrementEspeces = 0;
    for (const p of paiementsDette) {
      const pPointVenteId = p.recuPar?.pointVenteId || p.vente?.pointVenteId;
      if (!pvId || pPointVenteId === pvId) {
        if (!p.vente || p.vente.modePaiement !== 'ESPECES') {
          totalRecouvrementEspeces += p.montant;
        }
      }
    }

    const totalEncaisseEspeces = totalVenduEspeces + totalRecouvrementEspeces;
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

    // Difference = Total Encaissé Espèces (Ventes + Recouvrements) - Dépenses Espèces - Total Viré à l'Admin (tous statuts)
    const differenceCaisse = Math.max(0, totalEncaisseEspeces - totalDepensesEspeces - totalVireValide - totalVireEnAttente);

    // Synthese par boutique
    const syntheseParBoutique = pointsDeVente.map((pdv) => {
      const pdvVentes = ventes.filter((v) => v.pointVenteId === pdv.id);
      const pdvDepenses = depenses.filter((d) => d.pointDeVenteId === pdv.id);
      const pdvVirements = virements.filter((vir) => vir.pointDeVenteId === pdv.id);

      const venduEsp = pdvVentes
        .filter((v) => v.modePaiement === 'ESPECES')
        .reduce((sum, v) => sum + v.montantPaye, 0);

      const pdvPaiementsDette = paiementsDette.filter((p) => {
        const pPdvId = p.recuPar?.pointVenteId || p.vente?.pointVenteId;
        return pPdvId === pdv.id && (!p.vente || p.vente.modePaiement !== 'ESPECES');
      });
      const recouvrementEsp = pdvPaiementsDette.reduce((sum, p) => sum + p.montant, 0);

      const totalEncaissePdvEsp = venduEsp + recouvrementEsp;
      const depEsp = pdvDepenses.reduce((sum, d) => sum + d.montant, 0);

      const virValide = pdvVirements
        .filter((vir) => vir.statut === 'VALIDEE')
        .reduce((sum, vir) => sum + vir.soldeReel, 0);

      const virAttente = pdvVirements
        .filter((vir) => vir.statut === 'EN_ATTENTE')
        .reduce((sum, vir) => sum + vir.soldeReel, 0);

      const ecartRestant = Math.max(0, totalEncaissePdvEsp - depEsp - virValide - virAttente);

      return {
        pointDeVente: pdv,
        venduEsp: totalEncaissePdvEsp,
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
        totalVenduEspeces: totalEncaisseEspeces,
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

    // Calcul rapide des ventes, dépenses et précédents virements de cette boutique
    const [ventesAgg, depensesAgg, prevVirementsAgg] = await Promise.all([
      prisma.vente.aggregate({
        where: { pointVenteId: pdvId, modePaiement: 'ESPECES' },
        _sum: { montantPaye: true },
      }),
      prisma.depense.aggregate({
        where: { pointDeVenteId: pdvId, modePaiement: 'ESPECES' },
        _sum: { montant: true },
      }),
      prisma.clotureCaisse.aggregate({
        where: { pointDeVenteId: pdvId },
        _sum: { soldeReel: true },
      }),
    ]);

    const totalEspecesVente = ventesAgg._sum.montantPaye || 0;
    const totalDepenses = depensesAgg._sum.montant || 0;
    const totalDejaVire = prevVirementsAgg._sum.soldeReel || 0;

    const soldeTheoriqueDispo = Math.max(0, totalEspecesVente - totalDepenses - totalDejaVire);
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

    // Alerte SMS & Email Admin lors du virement
    notifyAdminVirement({
      reference: virement.reference,
      boutiqueNom: virement.pointDeVente.nom,
      vendeurNom: virement.utilisateur.nom,
      montant: virement.soldeReel,
      statut: virement.statut,
      notes: notes || undefined,
    }).catch((e) => console.error('Erreur SMS Virement POST:', e));

    notifyAdminVirementEmail({
      reference: virement.reference,
      boutiqueNom: virement.pointDeVente.nom,
      vendeurNom: virement.utilisateur.nom,
      montant: virement.soldeReel,
      statut: virement.statut,
      notes: notes || undefined,
    }).catch((e) => console.error('Erreur Email Virement POST:', e));

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

    // Alerte SMS & Email Admin lors du virement
    notifyAdminVirement({
      reference: virement.reference,
      boutiqueNom: virement.pointDeVente.nom,
      vendeurNom: virement.utilisateur.nom,
      montant: virement.soldeReel,
      statut: virement.statut,
      notes: notes || undefined,
    }).catch((e) => console.error('Erreur SMS Virement POST:', e));

    notifyAdminVirementEmail({
      reference: virement.reference,
      boutiqueNom: virement.pointDeVente.nom,
      vendeurNom: virement.utilisateur.nom,
      montant: virement.soldeReel,
      statut: virement.statut,
      notes: notes || undefined,
    }).catch((e) => console.error('Erreur Email Virement POST:', e));

    return NextResponse.json({ success: true, virement });
  } catch (error) {
    console.error('Erreur API Virements PATCH:', error);
    return NextResponse.json({ success: false, error: 'Erreur validation du virement' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'ID du virement requis' }, { status: 400 });
    }

    const virement = await prisma.clotureCaisse.findUnique({
      where: { id },
      include: {
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
      },
    });

    if (!virement) {
      return NextResponse.json({ success: false, error: 'Virement introuvable' }, { status: 404 });
    }

    await prisma.clotureCaisse.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Le virement ${virement.reference} (${virement.pointDeVente.nom}) a été définitivement supprimé.`,
    });
  } catch (error) {
    console.error('Erreur API Virements DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression du virement' }, { status: 500 });
  }
}
