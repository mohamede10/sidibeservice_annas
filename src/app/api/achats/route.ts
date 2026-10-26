import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pointVenteId = searchParams.get('pointVenteId');

    const where = pointVenteId ? { pointDeVenteId: parseInt(pointVenteId) } : undefined;

    const achats = await prisma.achat.findMany({
      where,
      include: {
        fournisseur: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
        pointDeVente: { select: { id: true, nom: true, codeBoutique: true } },
        utilisateur: { select: { id: true, nom: true } },
        lignes: {
          include: {
            variante: {
              include: { produit: { select: { id: true, nom: true } } },
            },
          },
        },
      },
      orderBy: { dateAchat: 'desc' },
      take: 100,
    });

    const pointsDeVente = await prisma.pointDeVente.findMany({
      where: { active: true },
      select: { id: true, nom: true, codeBoutique: true, ville: true },
      orderBy: { nom: 'asc' },
    });

    const fournisseurs = await prisma.fournisseur.findMany({
      orderBy: { nom: 'asc' },
    });

    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: {
        variantes: { select: { id: true, taille: true, couleur: true, reference: true, prix: true, coutAchat: true } },
      },
      orderBy: { nom: 'asc' },
      take: 300,
    });

    return NextResponse.json({ success: true, achats, pointsDeVente, fournisseurs, produits });
  } catch (error) {
    console.error('Erreur API Achats GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement achats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fournisseurNom,
      fournisseurTelephone,
      fournisseurAdresse,
      fournisseurVille,
      fournisseurId,
      pointDeVenteId,
      utilisateurId,
      fraisTransport,
      lignes, // [{ varianteId, produitNom, quantite, prixUnitaireGros, prixVenteDetail }]
    } = body;

    if (!pointDeVenteId || !lignes || lignes.length === 0) {
      return NextResponse.json({ success: false, error: 'Boutique destination et articles requis' }, { status: 400 });
    }

    const ref = `ACH-${Date.now().toString().slice(-8)}`;
    const frais = parseFloat(fraisTransport ?? '0') || 0;
    const totalLignes = lignes.reduce(
      (sum: number, l: { prixUnitaireGros: string | number; quantite: string | number }) =>
        sum + parseFloat(String(l.prixUnitaireGros)) * parseInt(String(l.quantite)),
      0
    );
    const totalAchat = totalLignes + frais;

    // Upsert fournisseur if info provided but no ID
    let fId = fournisseurId ? parseInt(fournisseurId) : null;
    if (!fId && fournisseurNom) {
      const existing = await prisma.fournisseur.findFirst({
        where: { nom: { equals: fournisseurNom } },
      });
      if (existing) {
        fId = existing.id;
        await prisma.fournisseur.update({
          where: { id: existing.id },
          data: {
            telephone: fournisseurTelephone || existing.telephone,
            adresse: fournisseurAdresse || existing.adresse,
            ville: fournisseurVille || existing.ville,
          },
        });
      } else {
        const f = await prisma.fournisseur.create({
          data: {
            nom: fournisseurNom,
            telephone: fournisseurTelephone || null,
            adresse: fournisseurAdresse || null,
            ville: fournisseurVille || 'Kankan',
          },
        });
        fId = f.id;
      }
    }

    const achat = await prisma.$transaction(async (tx) => {
      const newAchat = await tx.achat.create({
        data: {
          reference: ref,
          fournisseurId: fId,
          fournisseurNom: fournisseurNom || null,
          telephone: fournisseurTelephone || null,
          adresse: fournisseurAdresse || null,
          totalAchat,
          statut: 'RECU',
          pointDeVenteId: parseInt(pointDeVenteId),
          utilisateurId: utilisateurId ? parseInt(utilisateurId) : null,
          lignes: {
            create: lignes.map((l: {
              varianteId?: string | number;
              produitNom?: string;
              quantite: string | number;
              prixUnitaireGros: string | number;
            }) => ({
              varianteId: l.varianteId ? parseInt(String(l.varianteId)) : null,
              produitNom: l.produitNom || null,
              quantite: parseInt(String(l.quantite)),
              prixUnitaire: parseFloat(String(l.prixUnitaireGros)),
              totalLigne: parseFloat(String(l.prixUnitaireGros)) * parseInt(String(l.quantite)),
            })),
          },
        },
        include: {
          lignes: true,
          pointDeVente: { select: { nom: true } },
        },
      });

      // Update stocks and prices for each line
      for (const ligne of lignes) {
        if (!ligne.varianteId) continue;

        const varId = parseInt(String(ligne.varianteId));
        const qte = parseInt(String(ligne.quantite));
        const prixGros = parseFloat(String(ligne.prixUnitaireGros));
        const prixVente = ligne.prixVenteDetail ? parseFloat(String(ligne.prixVenteDetail)) : null;
        const pdvId = parseInt(pointDeVenteId);

        // Get current stock
        const stockParPoint = await tx.stockParPoint.findUnique({
          where: { varianteId_pointDeVenteId: { varianteId: varId, pointDeVenteId: pdvId } },
        });
        const qteAvant = stockParPoint?.quantite ?? 0;

        // Upsert stock at destination boutique
        await tx.stockParPoint.upsert({
          where: { varianteId_pointDeVenteId: { varianteId: varId, pointDeVenteId: pdvId } },
          update: { quantite: { increment: qte } },
          create: { varianteId: varId, pointDeVenteId: pdvId, quantite: qte },
        });

        // Update global variant stock and pricing
        const updateData: Record<string, unknown> = {
          quantiteStock: { increment: qte },
          coutAchat: prixGros,
        };
        if (prixVente && prixVente > 0) {
          updateData.prix = prixVente;
        }
        await tx.produitVariante.update({
          where: { id: varId },
          data: updateData,
        });

        // Stock movement
        await tx.stockMouvement.create({
          data: {
            varianteId: varId,
            pointDeVenteId: pdvId,
            typeMouvement: 'ACHAT',
            quantite: qte,
            stockAvant: qteAvant,
            stockApres: qteAvant + qte,
            motif: `Achat fournisseur - ${fournisseurNom || 'N/A'} (Réf: ${ref})`,
            referenceDoc: ref,
            utilisateurId: utilisateurId ? parseInt(utilisateurId) : null,
          },
        });
      }

      return newAchat;
    }, {
      maxWait: 20000,
      timeout: 45000,
    });

    return NextResponse.json({ success: true, achat });
  } catch (error) {
    console.error('Erreur API Achats POST:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la création de l\'achat' }, { status: 500 });
  }
}
