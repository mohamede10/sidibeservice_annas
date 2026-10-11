import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, montant, modePaiement = 'ESPECES', notes = '', venteId } = body;

    if (!clientId || !montant || parseFloat(String(montant)) <= 0) {
      return NextResponse.json({ success: false, error: 'Montant ou client invalide' }, { status: 400 });
    }

    const payeMontant = parseFloat(String(montant));
    const refRecu = `REC-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Décrémenter le solde de dette du client
      const client = await tx.client.findUnique({
        where: { id: parseInt(String(clientId)) },
      });

      if (!client) {
        throw new Error('Client introuvable');
      }

      const nouveauSolde = Math.max(0, client.soldeDette - payeMontant);

      await tx.client.update({
        where: { id: client.id },
        data: { soldeDette: nouveauSolde },
      });

      // 2. Enregistrer le paiement
      const paiement = await tx.paiementDette.create({
        data: {
          clientId: client.id,
          venteId: venteId ? parseInt(String(venteId)) : undefined,
          montant: payeMontant,
          modePaiement: modePaiement,
          referenceRecu: refRecu,
          notes: notes || `Règlement dette / acompte client ${client.nom}`,
        },
      });

      // 3. Mettre à jour la vente si venteId est fourni
      if (venteId) {
        const vente = await tx.vente.findUnique({
          where: { id: parseInt(String(venteId)) },
        });

        if (vente) {
          const nouveauPaye = vente.montantPaye + payeMontant;
          const nouveauRestant = Math.max(0, vente.total - nouveauPaye);
          const statut = nouveauRestant <= 0 ? 'PAYE' : 'PARTIEL';

          await tx.vente.update({
            where: { id: vente.id },
            data: {
              montantPaye: nouveauPaye,
              montantRestant: nouveauRestant,
              statutPaiement: statut,
            },
          });
        }
      }

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
