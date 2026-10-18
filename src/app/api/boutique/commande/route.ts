import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    // Récupération d'un point de vente par défaut (Kankan ou le premier disponible)
    let pointVente = await prisma.pointDeVente.findFirst({
      where: { active: true },
    });

    if (!pointVente) {
      pointVente = await prisma.pointDeVente.findFirst();
    }

    const pointVenteId = pointVente ? pointVente.id : 1;
    const pointVenteNom = pointVente ? pointVente.nom : 'Sidibe Services Boutique';

    // Générer une référence unique de commande e-commerce
    const refDate = new Date();
    const refSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceCommande = `CMD-${refDate.getFullYear().toString().slice(-2)}${(refDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${refSuffix}`;

    // Note enrichie avec type de livraison et ville
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

    // Exécution transactionnelle de la commande
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

      // 2. Créer l'enregistrement de vente (type COMMANDE_EN_LIGNE)
      const nouvelleVente = await tx.vente.create({
        data: {
          reference: referenceCommande,
          dateVente: new Date(),
          nomClient: nomClient,
          telephoneClient: telephoneClient,
          total: totalCommande,
          montantPaye: 0,
          montantRestant: totalCommande,
          modePaiement: modePaiement,
          statutPaiement: 'IMPAYE',
          typeVente: 'COMMANDE_EN_LIGNE',
          clientId: client.id,
          pointVenteId: pointVenteId,
          pointVenteNom: pointVenteNom,
          notes: noteComplete,
          lignes: {
            create: items.map((item: any) => ({
              produitId: item.produitId ? parseInt(String(item.produitId)) : undefined,
              varianteId: item.varianteId ? parseInt(String(item.varianteId)) : undefined,
              nomProduit: item.nomProduit || item.nom,
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

      // 3. Mettre à jour les stocks si varianteId fourni
      for (const item of items) {
        if (item.varianteId) {
          const v = await tx.produitVariante.findUnique({
            where: { id: parseInt(String(item.varianteId)) },
          });

          if (v) {
            const qte = parseInt(String(item.quantite || 1));
            const stockApres = Math.max(0, v.quantiteStock - qte);

            await tx.produitVariante.update({
              where: { id: v.id },
              data: { quantiteStock: stockApres },
            });

            await tx.stockMouvement.create({
              data: {
                varianteId: v.id,
                pointDeVenteId: pointVenteId,
                typeMouvement: 'VENTE',
                quantite: -qte,
                stockAvant: v.quantiteStock,
                stockApres: stockApres,
                motif: `Commande Web ${referenceCommande}`,
                referenceDoc: referenceCommande,
              },
            });
          }
        }
      }

      return nouvelleVente;
    });

    return NextResponse.json({
      success: true,
      message: 'Commande enregistrée avec succès',
      commande: {
        id: commande.id,
        reference: commande.reference,
        total: commande.total,
        nomClient: commande.nomClient,
        telephoneClient: commande.telephoneClient,
        pointVenteNom: commande.pointVenteNom,
        dateVente: commande.dateVente,
        nbArticles: items.length,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la commande vitrine:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la validation de la commande',
      },
      { status: 500 }
    );
  }
}
