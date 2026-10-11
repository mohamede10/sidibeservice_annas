import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';

    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { nom: { contains: search } },
        { telephone: { contains: search } },
        { codeClient: { contains: search } },
        { ville: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { nom: 'asc' },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error('Erreur API Clients:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, telephone, email, adresse, ville, limiteCredit = 0 } = body;

    if (!nom) {
      return NextResponse.json({ success: false, error: 'Le nom du client est obligatoire' }, { status: 400 });
    }

    const codeClient = `CLI-${Date.now().toString().slice(-6)}`;

    const client = await prisma.client.create({
      data: {
        nom,
        codeClient,
        telephone: telephone || '',
        email: email || '',
        adresse: adresse || '',
        ville: ville || 'Bamako',
        limiteCredit: parseFloat(String(limiteCredit)) || 0,
        soldeDette: 0,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('Erreur création client:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la création du client' }, { status: 500 });
  }
}
