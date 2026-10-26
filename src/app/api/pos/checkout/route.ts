import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyAdminLowStock } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cartItems,
      clientId,
      nomClient,
      telephoneClient,
      adresseClient,
      emailClient,
      modePaiement = 'ESPECES',
      montantPaye = 0,
      notes = '',
      pointVenteId = 1,
      vendeurId,
    } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Le panier est vide' }, { status: 400 });
    }

    // Calculer le total
    let totalVente = 0;
    for (const item of cartItems) {
      totalVente += item.prix * item.quantite;
    }

    const paye = parseFloat(String(montantPaye));
    const restant = Math.max(0, totalVente - paye);
    const statutPaiement = restant <= 0 ? 'PAYE' : paye > 0 ? 'PARTIEL' : 'IMPAYE';
    const referenceVente = `VTE-${Date.now().toString().slice(-6)}`;
    const numeroFacture = `FAC-${Date.now().toString().slice(-6)}`;
    const pvId = parseInt(String(pointVenteId)) || 1;

    // Récupérer le nom du point de vente
    const pdv = await prisma.pointDeVente.findUnique({
      where: { id: pvId },
      select: { nom: true, ville: true },
    });

    // Exécution transactionnelle
    const result = await prisma.$transaction(async (tx) => {
      // 1. Chercher ou créer automatiquement le client s'il a été saisi
      let finalClientId = clientId ? parseInt(String(clientId)) : undefined;

      if (!finalClientId && nomClient && nomClient.trim() && nomClient !== 'Client de passage') {
        const clientExistant = telephoneClient && telephoneClient.trim()
          ? await tx.client.findFirst({ where: { telephone: telephoneClient.trim() } })
          : await tx.client.findFirst({ where: { nom: nomClient.trim() } });

        if (clientExistant) {
          finalClientId = clientExistant.id;
          if (adresseClient || emailClient) {
            await tx.client.update({
              where: { id: clientExistant.id },
              data: {
                adresse: adresseClient ? adresseClient.trim() : clientExistant.adresse,
                email: emailClient ? emailClient.trim() : clientExistant.email,
              },
            });
          }
        } else {
          const nouveauClient = await tx.client.create({
            data: {
              nom: nomClient.trim(),
              codeClient: `CLI-${Date.now().toString().slice(-6)}`,
              telephone: telephoneClient ? telephoneClient.trim() : '',
              adresse: adresseClient ? adresseClient.trim() : '',
              email: emailClient ? emailClient.trim() : '',
              ville: pdv?.ville || 'Kankan',
              soldeDette: 0,
            },
          });
          finalClientId = nouveauClient.id;
        }
      }

      // 2. Créer la vente
      const vente = await tx.vente.create({
        data: {
          reference: referenceVente,
          total: totalVente,
          montantPaye: paye,
          montantRestant: restant,
          modePaiement: modePaiement,
          statutPaiement: statutPaiement,
          nomClient: nomClient || (finalClientId ? undefined : 'Client de passage'),
          telephoneClient: telephoneClient || undefined,
          clientId: finalClientId,
          vendeurId: vendeurId ? parseInt(String(vendeurId)) : undefined,
          pointVenteId: pvId,
          pointVenteNom: pdv?.nom || `Boutique #${pvId}`,
          notes: notes || undefined,
          lignes: {
            create: cartItems.map((item: {
              produitId?: number;
              varianteId?: number;
              nom: string;
              taille?: string;
              couleur?: string;
              quantite: number;
              prix: number;
              coutAchat?: number;
            }) => ({
              produitId: item.produitId,
              varianteId: item.varianteId,
              nomProduit: item.nom,
              varianteInfo: `${item.taille || ''} ${item.couleur || ''}`.trim() || undefined,
              quantite: item.quantite,
              prixUnitaire: item.prix,
              coutUnitaire: item.coutAchat || 0,
              totalLigne: item.prix * item.quantite,
            })),
          },
        },
        include: {
          lignes: true,
          client: true,
        },
      });

      // 3. Décrémenter les stocks et enregistrer les mouvements
      for (const item of cartItems) {
        if (item.varianteId) {
          const v = await tx.produitVariante.findUnique({
            where: { id: item.varianteId },
            include: { produit: true },
          });

          if (v) {
            const stockAvant = v.quantiteStock;
            const stockApres = Math.max(0, stockAvant - item.quantite);

            // Mise à jour stock global variante
            await tx.produitVariante.update({
              where: { id: item.varianteId },
              data: { quantiteStock: stockApres },
            });

            // Mise à jour stock spécifique à cette boutique (StockParPoint)
            const stockPoint = await tx.stockParPoint.findUnique({
              where: {
                varianteId_pointDeVenteId: {
                  varianteId: item.varianteId,
                  pointDeVenteId: pvId,
                },
              },
            });

            const stockBoutiqueApres = stockPoint ? Math.max(0, stockPoint.quantite - item.quantite) : stockApres;
            if (stockPoint) {
              await tx.stockParPoint.update({
                where: { id: stockPoint.id },
                data: { quantite: stockBoutiqueApres },
              });
            }

            // Enregistrement du mouvement
            await tx.stockMouvement.create({
              data: {
                varianteId: item.varianteId,
                pointDeVenteId: pvId,
                typeMouvement: 'VENTE',
                quantite: -item.quantite,
                stockAvant: stockAvant,
                stockApres: stockApres,
                motif: `Vente ${referenceVente}`,
                referenceDoc: referenceVente,
              },
            });

            // Alerte SMS stock faible pour l'administrateur dès que le stock descend à <= 10
            if (stockBoutiqueApres <= 10) {
              notifyAdminLowStock({
                produitNom: v.produit?.nom || item.nom,
                varianteInfo: `${v.taille || ''} ${v.couleur || ''}`.trim(),
                quantiteRestante: stockBoutiqueApres,
                boutiqueNom: pdv?.nom || `Boutique #${pvId}`,
              }).catch((e) => console.error('Erreur SMS stock bas POS:', e));
            }
          }
        }
      }

      // 4. Mettre à jour la dette du client si vente à crédit ou acompte partiel
      if (finalClientId && restant > 0) {
        await tx.client.update({
          where: { id: finalClientId },
          data: {
            soldeDette: {
              increment: restant,
            },
          },
        });
      }

      // 4. Créer la facture associée
      const facture = await tx.facture.create({
        data: {
          numeroFacture: numeroFacture,
          venteId: vente.id,
          pointDeVenteId: parseInt(String(pointVenteId)),
          totalFacture: totalVente,
          statut: statutPaiement === 'PAYE' ? 'PAYEE' : 'IMPAYEE',
          lignes: {
            create: cartItems.map((item: { varianteId?: number; nom: string; quantite: number; prix: number }) => ({
              varianteId: item.varianteId,
              description: item.nom,
              quantite: item.quantite,
              prixUnitaire: item.prix,
              totalLigne: item.prix * item.quantite,
            })),
          },
        },
      });

      return { vente, facture };
    });

    return NextResponse.json({
      success: true,
      vente: result.vente,
      facture: result.facture,
      message: 'Vente validée avec succès',
    });
  } catch (error) {
    console.error('Erreur Checkout POS:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors du traitement de la vente' }, { status: 500 });
  }
}
