import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyAdminNewOrder } from '@/lib/sms';
import { notifyAdminNewOrderEmail } from '@/lib/email';

// GET - Lister les commandes en ligne (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get('statut') || 'EN_ATTENTE';
    const all = searchParams.get('all') === '1';
    const pointVenteId = searchParams.get('pointVenteId');

    const whereClause: Record<string, unknown> = {
      typeVente: 'COMMANDE_EN_LIGNE',
    };

    if (pointVenteId && !isNaN(parseInt(pointVenteId))) {
      whereClause.pointVenteId = parseInt(pointVenteId);
    }

    if (!all) {
      whereClause.statutPaiement = statut;
    }

    const commandes = await prisma.vente.findMany({
      where: whereClause,
      include: {
        client: true,
        pointVente: true,
        lignes: {
          include: {
            produit: { select: { id: true, nom: true, imageUrl: true } },
            variante: { select: { id: true, taille: true, couleur: true, prix: true } },
          },
        },
        factures: true,
      },
      orderBy: { dateVente: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, commandes });
  } catch (error) {
    console.error('Erreur GET commandes:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement commandes' }, { status: 500 });
  }
}

// POST - Créer une nouvelle commande depuis la boutique vitrine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      nomClient,
      telephoneClient,
      ville = 'Kankan',
      adresse = '',
      typeLivraison = 'LIVRAISON',
      modePaiement = 'A_LA_LIVRAISON',
      notes = '',
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Votre panier est vide' },
        { status: 400 }
      );
    }

    if (!nomClient || !telephoneClient) {
      return NextResponse.json(
        { success: false, error: 'Le nom et le numéro de téléphone sont obligatoires' },
        { status: 400 }
      );
    }

    // Calcul du total
    let totalCommande = 0;
    for (const item of items) {
      const qte = parseInt(String(item.quantite || 1));
      const prix = parseFloat(String(item.prix || 0));
      totalCommande += qte * prix;
    }

    // Récupération d'un point de vente actif
    let pointVente = await prisma.pointDeVente.findFirst({
      where: { active: true },
    });

    if (!pointVente) {
      pointVente = await prisma.pointDeVente.findFirst();
    }

    const pointVenteId = pointVente ? pointVente.id : 1;
    const pointVenteNom = pointVente ? pointVente.nom : 'Sidibe Services Boutique';

    // Générer une référence unique
    const refDate = new Date();
    const refSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceCommande = `CMD-${refDate.getFullYear().toString().slice(-2)}${(refDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${refSuffix}`;

    // Note enrichie
    const noteComplete = [
      `[COMMANDE EN LIGNE]`,
      `Livraison: ${typeLivraison === 'RETRAIT_BOUTIQUE' ? 'Retrait en boutique' : 'Livraison à domicile'}`,
      `Ville: ${ville}`,
      adresse ? `Adresse: ${adresse}` : null,
      `Paiement souhaité: ${modePaiement}`,
      notes ? `Précisions client: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    // Enregistrement de la commande SANS toucher au stock
    const commande = await prisma.$transaction(async (tx) => {
      // 1. Chercher ou créer le client
      let client = await tx.client.findFirst({
        where: { telephone: telephoneClient },
      });

      if (!client) {
        client = await tx.client.create({
          data: {
            nom: nomClient,
            telephone: telephoneClient,
            ville: ville,
            adresse: adresse || undefined,
            notes: 'Client issu de la boutique en ligne',
          },
        });
      }

      // 2. Créer la commande avec statut EN_ATTENTE (= IMPAYE, typeVente = COMMANDE_EN_LIGNE)
      //    LE STOCK N'EST PAS DÉCRÉMENTÉ ICI - il le sera uniquement à la validation admin
      const nouvelleCommande = await tx.vente.create({
        data: {
          reference: referenceCommande,
          dateVente: new Date(),
          nomClient: nomClient,
          telephoneClient: telephoneClient,
          total: totalCommande,
          montantPaye: 0,
          montantRestant: totalCommande,
          modePaiement: modePaiement,
          statutPaiement: 'EN_ATTENTE', // Statut spécifique commande en ligne
          typeVente: 'COMMANDE_EN_LIGNE',
          clientId: client.id,
          pointVenteId: pointVenteId,
          pointVenteNom: pointVenteNom,
          notes: noteComplete,
          lignes: {
            create: items.map((item: {
              produitId?: number | string;
              varianteId?: number | string;
              nomProduit?: string;
              nom?: string;
              varianteInfo?: string;
              quantite?: number | string;
              prix?: number | string;
              coutAchat?: number | string;
            }) => ({
              produitId: item.produitId ? parseInt(String(item.produitId)) : undefined,
              varianteId: item.varianteId ? parseInt(String(item.varianteId)) : undefined,
              nomProduit: item.nomProduit || item.nom || 'Article',
              varianteInfo: item.varianteInfo || undefined,
              quantite: parseInt(String(item.quantite || 1)),
              prixUnitaire: parseFloat(String(item.prix || 0)),
              coutUnitaire: parseFloat(String(item.coutAchat || 0)),
              totalLigne: parseInt(String(item.quantite || 1)) * parseFloat(String(item.prix || 0)),
            })),
          },
        },
        include: {
          lignes: true,
          pointVente: true,
        },
      });

      return nouvelleCommande;
    });

    // Envoyer le SMS de notification à l'administrateur (sans bloquer la réponse)
    notifyAdminNewOrder({
      reference: commande.reference,
      clientNom: nomClient,
      telephone: telephoneClient,
      ville,
      adresse,
      total: totalCommande,
      items: items.map((i: { nomProduit?: string; nom?: string; quantite?: number | string; prix?: number | string }) => ({
        nom: i.nomProduit || i.nom || 'Article',
        quantite: parseInt(String(i.quantite || 1)),
        prix: parseFloat(String(i.prix || 0)),
      })),
    }).catch((e) => console.error('Erreur SMS Admin Commande:', e));

    // Envoyer l'Email de notification à l'administrateur (sans bloquer la réponse)
    notifyAdminNewOrderEmail({
      reference: commande.reference,
      clientNom: nomClient,
      telephone: telephoneClient,
      ville,
      adresse,
      total: totalCommande,
      items: items.map((i: { nomProduit?: string; nom?: string; quantite?: number | string; prix?: number | string }) => ({
        nom: i.nomProduit || i.nom || 'Article',
        quantite: parseInt(String(i.quantite || 1)),
        prix: parseFloat(String(i.prix || 0)),
      })),
    }).catch((e) => console.error('Erreur Email Admin Commande:', e));

    return NextResponse.json({
      success: true,
      message: 'Commande enregistrée avec succès. Elle sera traitée par notre équipe.',
      commande: {
        id: commande.id,
        reference: commande.reference,
        total: commande.total,
        nomClient: commande.nomClient,
        telephoneClient: commande.telephoneClient,
        pointVenteNom: commande.pointVenteNom,
        dateVente: commande.dateVente,
        nbArticles: items.length,
        statut: 'EN_ATTENTE',
      },
    });
  } catch (error: unknown) {
    console.error('Erreur lors de la commande vitrine:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Erreur lors de la validation de la commande',
      },
      { status: 500 }
    );
  }
}
