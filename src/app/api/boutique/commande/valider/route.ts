import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyAdminLowStock } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commandeId, action } = body;
    // action: 'VALIDER' | 'ANNULER'

    if (!commandeId || !action) {
      return NextResponse.json(
        { success: false, error: 'commandeId et action requis' },
        { status: 400 }
      );
    }

    if (!['VALIDER', 'ANNULER'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action doit être 'VALIDER' ou 'ANNULER'" },
        { status: 400 }
      );
    }

    // Charger la commande avec ses lignes et infos associées
    const commande = await prisma.vente.findUnique({
      where: { id: parseInt(String(commandeId)) },
      include: {
        lignes: {
          include: {
            variante: { include: { produit: true } },
          },
        },
        client: true,
        pointVente: true,
      },
    });

    if (!commande) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    if (commande.typeVente !== 'COMMANDE_EN_LIGNE') {
      return NextResponse.json(
        { success: false, error: 'Cette action ne concerne que les commandes en ligne' },
        { status: 400 }
      );
    }

    if (commande.statutPaiement !== 'EN_ATTENTE') {
      return NextResponse.json(
        { success: false, error: 'Commande déjà traitée (validée ou annulée)' },
        { status: 400 }
      );
    }

    if (action === 'ANNULER') {
      // Annuler la commande - le stock n'est PAS touché
      await prisma.vente.update({
        where: { id: commande.id },
        data: { statutPaiement: 'ANNULEE' },
      });

      return NextResponse.json({
        success: true,
        message: `Commande ${commande.reference} annulée. Le stock est inchangé.`,
      });
    }

    // === VALIDATION DE LA COMMANDE ===
    const pvId = commande.pointVenteId;
    const pvNom = commande.pointVente?.nom || commande.pointVenteNom || `Boutique #${pvId}`;
    const numeroFacture = `FAC-CMD-${commande.reference.replace('CMD-', '')}`;

    const facture = await prisma.$transaction(async (tx) => {
      // 1. Marquer la vente comme validée / payée
      await tx.vente.update({
        where: { id: commande.id },
        data: {
          statutPaiement: 'PAYE',
          montantPaye: commande.total,
          montantRestant: 0,
        },
      });

      // 2. Décrémenter les stocks et enregistrer les mouvements
      for (const ligne of commande.lignes) {
        if (ligne.varianteId && ligne.quantite > 0) {
          const v = await tx.produitVariante.findUnique({
            where: { id: ligne.varianteId },
            include: { produit: true },
          });

          if (v) {
            const stockAvant = v.quantiteStock;
            const stockApres = Math.max(0, stockAvant - ligne.quantite);

            // Mise à jour du stock global de la variante
            await tx.produitVariante.update({
              where: { id: v.id },
              data: { quantiteStock: stockApres },
            });

            // Mise à jour du stock dans la boutique spécifique (StockParPoint)
            const stockPoint = await tx.stockParPoint.findUnique({
              where: {
                varianteId_pointDeVenteId: {
                  varianteId: ligne.varianteId,
                  pointDeVenteId: pvId,
                },
              },
            });

            const stockBoutiqueAvant = stockPoint?.quantite ?? stockAvant;
            const stockBoutiqueApres = Math.max(0, stockBoutiqueAvant - ligne.quantite);

            if (stockPoint) {
              await tx.stockParPoint.update({
                where: { id: stockPoint.id },
                data: { quantite: stockBoutiqueApres },
              });
            }

            // Enregistrement du mouvement de stock
            await tx.stockMouvement.create({
              data: {
                varianteId: v.id,
                pointDeVenteId: pvId,
                typeMouvement: 'VENTE',
                quantite: -ligne.quantite,
                stockAvant: stockAvant,
                stockApres: stockApres,
                motif: `Validation commande web ${commande.reference}`,
                referenceDoc: commande.reference,
              },
            });

            // Alerte SMS stock faible si <= 10
            if (stockBoutiqueApres <= 10) {
              notifyAdminLowStock({
                produitNom: v.produit?.nom || ligne.nomProduit,
                varianteInfo: `${v.taille || ''} ${v.couleur || ''}`.trim(),
                quantiteRestante: stockBoutiqueApres,
                boutiqueNom: pvNom,
              }).catch((e) => console.error('Erreur SMS Low Stock:', e));
            }
          }
        }
      }

      // 3. Créer la facture officielle
      const nouvelleFacture = await tx.facture.create({
        data: {
          numeroFacture: numeroFacture,
          venteId: commande.id,
          pointDeVenteId: pvId,
          totalFacture: commande.total,
          statut: 'PAYEE',
          lignes: {
            create: commande.lignes.map((l) => ({
              varianteId: l.varianteId ?? undefined,
              description: l.nomProduit + (l.varianteInfo ? ` (${l.varianteInfo})` : ''),
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              totalLigne: l.totalLigne,
            })),
          },
        },
        include: {
          lignes: true,
        },
      });

      return nouvelleFacture;
    }, {
      maxWait: 20000,
      timeout: 45000,
    });

    return NextResponse.json({
      success: true,
      message: `Commande ${commande.reference} validée avec succès. Stock mis à jour. Facture ${numeroFacture} créée.`,
      facture: {
        id: facture.id,
        numeroFacture: facture.numeroFacture,
        totalFacture: facture.totalFacture,
        statut: facture.statut,
      },
      // Données pour génération PDF côté client
      invoiceData: {
        numeroFacture: numeroFacture,
        referenceVente: commande.reference,
        dateFacture: new Date().toISOString(),
        boutique: {
          nom: pvNom,
          ville: commande.pointVente?.ville || 'Guinée',
          adresse: commande.pointVente?.adresse || 'Centre Commercial',
          telephone: commande.pointVente?.telephone || '+224 622 48 81 61',
        },
        client: {
          nom: commande.client?.nom || commande.nomClient || 'Client',
          telephone: commande.client?.telephone || commande.telephoneClient || '',
          adresse: commande.client?.adresse || (commande.notes?.includes('Adresse:')
            ? commande.notes?.split('Adresse:')[1]?.split('|')[0]?.trim()
            : ''),
          ville: commande.client?.ville || commande.pointVente?.ville || 'Guinée',
        },
        lignes: commande.lignes.map((l) => ({
          designation: l.nomProduit,
          varianteInfo: l.varianteInfo || undefined,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          totalLigne: l.totalLigne,
        })),
        total: commande.total,
        montantPaye: commande.total,
        montantRestant: 0,
        modePaiement: commande.modePaiement,
      },
    });
  } catch (error: unknown) {
    console.error('Erreur validation commande:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Erreur lors du traitement' },
      { status: 500 }
    );
  }
}

