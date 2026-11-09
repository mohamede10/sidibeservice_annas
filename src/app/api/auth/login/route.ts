import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: 'Login et mot de passe requis' },
        { status: 400 }
      );
    }

    // Rechercher l'utilisateur dans Supabase via Prisma
    const user = await prisma.user.findFirst({
      where: {
        login: {
          equals: login.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        pointVenteDefaut: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Identifiant ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, error: 'Ce compte utilisateur est désactivé' },
        { status: 403 }
      );
    }

    // Vérification mot de passe
    if (user.motDePasse && user.motDePasse !== password) {
      return NextResponse.json(
        { success: false, error: 'Identifiant ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const boutiqueVille = user.pointVenteDefaut?.ville || user.ville || 'Guinée';
    const boutiqueAdresse = user.pointVenteDefaut?.adresse || '';
    const boutiqueTelephone = user.pointVenteDefaut?.telephone || user.telephone || '+224 622 48 81 61';

    const sessionData = {
      id: user.id,
      nom: user.nom,
      login: user.login,
      role: user.role,
      profil: user.profil || (user.role === 'ADMIN' ? 'Administrateur Général' : 'Collaborateur'),
      ville: boutiqueVille,
      adresse: boutiqueAdresse,
      telephone: boutiqueTelephone,
      pointVenteId: user.pointVenteId || user.pointVenteDefaut?.id || 1,
      pointVenteNom: user.pointVenteDefaut?.nom || 'Boutique Principale',
      pointVenteCode: user.pointVenteDefaut?.codeBoutique || 'BP-01',
      boutiqueVille,
      boutiqueAdresse,
      boutiqueTelephone,
    };

    return NextResponse.json({
      success: true,
      user: sessionData,
    });
  } catch (error) {
    console.error('Erreur API login:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la connexion' },
      { status: 500 }
    );
  }
}
