import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        pointVenteDefaut: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
      },
      orderBy: [{ role: 'asc' }, { nom: 'asc' }],
    });

    // Ne jamais exposer les mots de passe
    const safe = users.map(({ motDePasse, ...u }) => u);
    return NextResponse.json({ success: true, users: safe });
  } catch (error) {
    console.error('Erreur API Users GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement utilisateurs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, login, telephone, email, role, pointVenteId, ville, profil } = body;

    if (!nom || !login) {
      return NextResponse.json({ success: false, error: 'Nom et login sont obligatoires' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        nom,
        login,
        telephone: telephone || null,
        email: email || null,
        role: role || 'VENDEUR',
        pointVenteId: pointVenteId ? parseInt(pointVenteId) : null,
        ville: ville || 'Kankan',
        profil: profil || null,
        motDePasse: '123456', // Mot de passe par défaut
        active: true,
      },
      include: {
        pointVenteDefaut: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
      },
    });

    const { motDePasse, ...safe } = user;
    return NextResponse.json({ success: true, user: safe });
  } catch (error: unknown) {
    console.error('Erreur API Users POST:', error);
    const msg = error instanceof Error && (error as NodeJS.ErrnoException).code === 'P2002'
      ? 'Ce login ou téléphone est déjà utilisé'
      : 'Erreur création utilisateur';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nom, telephone, email, role, pointVenteId, ville, profil, active } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(nom !== undefined && { nom }),
        ...(telephone !== undefined && { telephone }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(pointVenteId !== undefined && { pointVenteId: pointVenteId ? parseInt(pointVenteId) : null }),
        ...(ville !== undefined && { ville }),
        ...(profil !== undefined && { profil }),
        ...(active !== undefined && { active }),
      },
      include: {
        pointVenteDefaut: { select: { id: true, nom: true, codeBoutique: true, ville: true } },
      },
    });

    const { motDePasse, ...safe } = updated;
    return NextResponse.json({ success: true, user: safe });
  } catch (error) {
    console.error('Erreur API Users PATCH:', error);
    return NextResponse.json({ success: false, error: 'Erreur mise à jour utilisateur' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'ID utilisateur requis' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Détacher s'il est gérant d'un point de vente
    await prisma.pointDeVente.updateMany({
      where: { gerantId: id },
      data: { gerantId: null },
    });

    // Vérifier si l'utilisateur a des transactions (ventes, factures, encaissements)
    const [ventesCount, facturesCount, paiementsCount, cloturesCount] = await Promise.all([
      prisma.vente.count({ where: { vendeurId: id } }),
      prisma.facture.count({ where: { utilisateurId: id } }),
      prisma.paiementDette.count({ where: { recuParId: id } }),
      prisma.clotureCaisse.count({ where: { utilisateurId: id } }),
    ]);

    if (ventesCount > 0 || facturesCount > 0 || paiementsCount > 0 || cloturesCount > 0) {
      // Désactiver le compte pour préserver l'historique des ventes et factures
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message: `L'utilisateur « ${targetUser.nom} » a été désactivé et archivé avec succès car il figure sur des factures ou ventes comptables existantes.`,
      });
    }

    // Si aucune transaction enregistrée, suppression définitive
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      archived: false,
      message: `L'utilisateur « ${targetUser.nom} » a été définitivement supprimé.`,
    });
  } catch (error) {
    console.error('Erreur API Users DELETE:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression de l\'utilisateur' }, { status: 500 });
  }
}
