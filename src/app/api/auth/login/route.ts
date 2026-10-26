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

    const sessionData = {
      id: user.id,
      nom: user.nom,
      login: user.login,
      role: user.role,
      profil: user.profil || (user.role === 'ADMIN' ? 'Administrateur Général' : 'Collaborateur'),
      ville: user.ville || 'Kankan',
      pointVenteId: user.pointVenteId || user.pointVenteDefaut?.id || 1,
      pointVenteNom: user.pointVenteDefaut?.nom || 'Boutique Principale Kankan',
      pointVenteCode: user.pointVenteDefaut?.codeBoutique || 'KAN-01',
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
