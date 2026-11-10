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

    // Récupérer le point de vente avec tous ses détails d'adresse et ville
    const pdv = await prisma.pointDeVente.findUnique({
      where: { id: pvId },
      select: { id: true, nom: true, codeBoutique: true, ville: true, adresse: true, telephone: true },
    });

    // Alertes stock bas à envoyer après le commit de la transaction
    const lowStockAlerts: Array<{
      produitNom: string;
      varianteInfo: string;
      quantiteRestante: number;
      boutiqueNom: string;
    }> = [];

    // Exécution transactionnelle avec timeout augmenté (30s) pour éviter les expirations réseau
    const result = await prisma.$transaction(
      async (tx) => {
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
                ville: pdv?.ville || 'Guinée',
                soldeDette: 0,
              },
            });
            finalClientId = nouveauClient.id;
          }
        }

        // 2. Créer la vente et ses lignes
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
            pointVente: true,
          },
        });

        // 3. Récupérer en 2 requêtes groupées toutes les variantes et stocks boutique (ultra-rapide)
        const validVarianteIds = cartItems
          .map((item: { varianteId?: number }) => item.varianteId)
          .filter((id: any): id is number => typeof id === 'number' && !isNaN(id));

        const [variantesDb, stockPointsDb] = await Promise.all([
          validVarianteIds.length > 0
            ? tx.produitVariante.findMany({
                where: { id: { in: validVarianteIds } },
                include: { produit: true },
              })
            : Promise.resolve([]),
          validVarianteIds.length > 0
            ? tx.stockParPoint.findMany({
                where: {
                  varianteId: { in: validVarianteIds },
                  pointDeVenteId: pvId,
                },
              })
            : Promise.resolve([]),
        ]);

        const varianteMap = new Map(variantesDb.map((v) => [v.id, v]));
        const stockPointMap = new Map(stockPointsDb.map((sp) => [sp.varianteId, sp]));

        // Préparer les mises à jour et les mouvements
        const updatePromises: Promise<any>[] = [];
        const mouvementsData: Array<{
          varianteId: number;
          pointDeVenteId: number;
          typeMouvement: string;
          quantite: number;
          stockAvant: number;
          stockApres: number;
          motif: string;
          referenceDoc: string;
        }> = [];

        for (const item of cartItems) {
          if (!item.varianteId) continue;
          const v = varianteMap.get(item.varianteId);
          if (!v) continue;

          const stockAvant = v.quantiteStock;
          const stockApres = Math.max(0, stockAvant - item.quantite);

          // Update stock global
          updatePromises.push(
            tx.produitVariante.update({
              where: { id: item.varianteId },
              data: { quantiteStock: stockApres },
            })
          );

          // Update stock spécifique boutique
          const stockPoint = stockPointMap.get(item.varianteId);
          const stockBoutiqueApres = stockPoint
            ? Math.max(0, stockPoint.quantite - item.quantite)
            : stockApres;

          if (stockPoint) {
            updatePromises.push(
              tx.stockParPoint.update({
                where: { id: stockPoint.id },
                data: { quantite: stockBoutiqueApres },
              })
            );
          }

          // Préparer le mouvement de stock
          mouvementsData.push({
            varianteId: item.varianteId,
            pointDeVenteId: pvId,
            typeMouvement: 'VENTE',
            quantite: -item.quantite,
            stockAvant,
            stockApres,
            motif: `Vente ${referenceVente}`,
            referenceDoc: referenceVente,
          });

          // Noter pour alerte stock bas hors transaction
          if (stockBoutiqueApres <= 10) {
            lowStockAlerts.push({
              produitNom: v.produit?.nom || item.nom,
              varianteInfo: `${v.taille || ''} ${v.couleur || ''}`.trim(),
              quantiteRestante: stockBoutiqueApres,
              boutiqueNom: pdv?.nom || `Boutique #${pvId}`,
            });
          }
        }

        // Exécuter toutes les mises à jour de stock en parallèle
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }

        // Insérer tous les mouvements en une seule commande batch
        if (mouvementsData.length > 0) {
          await tx.stockMouvement.createMany({
            data: mouvementsData,
          });
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

        // 5. Créer la facture associée
        const facture = await tx.facture.create({
          data: {
            numeroFacture: numeroFacture,
            venteId: vente.id,
            pointDeVenteId: pvId,
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
      },
      {
        maxWait: 15000, // Attente max pool de 15 secondes
        timeout: 30000, // Timeout transaction de 30 secondes
      }
    );

    // Déclencher les alertes SMS hors de la transaction DB pour ne pas la bloquer
    for (const alert of lowStockAlerts) {
      notifyAdminLowStock(alert).catch((e) => console.error('Erreur SMS stock bas POS:', e));
    }

    return NextResponse.json({
      success: true,
      vente: result.vente,
      facture: result.facture,
      pointDeVente: pdv,
      message: 'Vente validée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur Checkout POS:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors du traitement de la vente' },
      { status: 500 }
    );
  }
}
