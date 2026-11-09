import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, montant, modePaiement = 'ESPECES', notes = '', venteId, recuParId } = body;

    if (!clientId || !montant || parseFloat(String(montant)) <= 0) {
      return NextResponse.json({ success: false, error: 'Montant ou client invalide' }, { status: 400 });
    }

    const payeMontant = parseFloat(String(montant));
    const refRecu = `REC-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer le client
      const client = await tx.client.findUnique({
        where: { id: parseInt(String(clientId)) },
      });

      if (!client) {
        throw new Error('Client introuvable');
      }

      // 2. Décrémenter le solde de dette global du client
      const nouveauSolde = Math.max(0, client.soldeDette - payeMontant);

      await tx.client.update({
        where: { id: client.id },
        data: { soldeDette: nouveauSolde },
      });

      // 3. Imputer automatiquement le remboursement sur les factures/ventes impayées du client
      let resteAImputer = payeMontant;
      let primaryVenteId: number | undefined = venteId ? parseInt(String(venteId)) : undefined;

      // Récupérer les ventes impayées ou partielles du client (ordonnées par date croissante)
      const ventesImpayees = await tx.vente.findMany({
        where: {
          clientId: client.id,
          typeVente: { not: 'COMMANDE_EN_LIGNE' },
          montantRestant: { gt: 0 },
        },
        orderBy: { dateVente: 'asc' },
        include: { factures: true },
      });

      // Si une vente spécifique était ciblée, la traiter en priorité
      let ventesATraiter = [...ventesImpayees];
      if (primaryVenteId) {
        const targetedIndex = ventesATraiter.findIndex((v) => v.id === primaryVenteId);
        if (targetedIndex > -1) {
          const targeted = ventesATraiter.splice(targetedIndex, 1)[0];
          ventesATraiter = [targeted, ...ventesATraiter];
        }
      }

      // Répartition du montant payé sur chaque vente
      for (const v of ventesATraiter) {
        if (resteAImputer <= 0) break;

        if (!primaryVenteId) {
          primaryVenteId = v.id;
        }

        const montantSurCetteVente = Math.min(resteAImputer, v.montantRestant);
        const nouveauPaye = v.montantPaye + montantSurCetteVente;
        const nouveauRestant = Math.max(0, v.total - nouveauPaye);
        const nouveauStatut = nouveauRestant <= 0 ? 'PAYE' : 'PARTIEL';

        await tx.vente.update({
          where: { id: v.id },
          data: {
            montantPaye: nouveauPaye,
            montantRestant: nouveauRestant,
            statutPaiement: nouveauStatut,
          },
        });

        // Mettre à jour les factures associées
        if (v.factures && v.factures.length > 0) {
          await tx.facture.updateMany({
            where: { venteId: v.id },
            data: {
              statut: nouveauRestant <= 0 ? 'PAYEE' : 'IMPAYEE',
            },
          });
        }

        resteAImputer -= montantSurCetteVente;
      }

      // 4. Enregistrer la trace comptable dans paiements_dette
      const paiement = await tx.paiementDette.create({
        data: {
          clientId: client.id,
          venteId: primaryVenteId || undefined,
          montant: payeMontant,
          modePaiement: modePaiement,
          referenceRecu: refRecu,
          recuParId: recuParId ? parseInt(String(recuParId)) : undefined,
          notes: notes || `Remboursement dette / acompte client ${client.nom}`,
        },
      });

      return { paiement, client, nouveauSolde };
    });

    return NextResponse.json({
      success: true,
      message: 'Remboursement enregistré avec succès',
      data: result,
    });
  } catch (error) {
    console.error('Erreur API Remboursement Dette:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors du remboursement' }, { status: 500 });
  }
}
