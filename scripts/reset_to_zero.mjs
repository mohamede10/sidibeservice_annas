import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function resetToZero() {
  console.log('====================================================');
  console.log('🔄 RÉINITIALISATION COMPLÈTE DE LA BASE SUPABASE');
  console.log('====================================================\n');

  try {
    await prisma.$connect();
    console.log('✅ Connecté à Supabase PostgreSQL avec succès.');

    // 1. Suppression de toutes les données dans l'ordre des contraintes
    console.log('🗑️  Suppression de toutes les données existantes...');
    
    await prisma.stockMouvement.deleteMany({});
    await prisma.transfertLigne.deleteMany({});
    await prisma.transfertStock.deleteMany({});
    await prisma.factureLigne.deleteMany({});
    await prisma.facture.deleteMany({});
    await prisma.paiementDette.deleteMany({});
    await prisma.venteLigne.deleteMany({});
    await prisma.vente.deleteMany({});
    await prisma.achatLigne.deleteMany({});
    await prisma.achat.deleteMany({});
    await prisma.clotureCaisse.deleteMany({});
    await prisma.depense.deleteMany({});
    await prisma.stockParPoint.deleteMany({});
    await prisma.produitVariante.deleteMany({});
    await prisma.produit.deleteMany({});
    await prisma.categorie.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.fournisseur.deleteMany({});

    // Dissocier les gérants et points de vente avant suppression
    await prisma.pointDeVente.updateMany({ data: { gerantId: null } });
    await prisma.user.updateMany({ data: { pointVenteId: null } });
    await prisma.user.deleteMany({});
    await prisma.pointDeVente.deleteMany({});

    console.log('✅ Toutes les tables ont été vidées à 0.');

    // 2. Création du Point de Vente de départ
    console.log('\n🏢 Création du point de vente initial (Boutique Principale)...');
    const pointVente = await prisma.pointDeVente.create({
      data: {
        nom: 'Boutique Principale Bamako',
        codeBoutique: 'BAM-01',
        ville: 'Bamako',
        adresse: 'Hamdallaye ACI 2000, Bamako',
        telephone: '+223 70 00 00 00',
        email: 'contact@sidibeservices.ml',
        active: true,
      },
    });
    console.log(`✅ Point de vente créé : [${pointVente.codeBoutique}] ${pointVente.nom} (ID: ${pointVente.id})`);

    // 3. Création du compte administrateur unique de départ
    console.log('\n👤 Création du compte Administrateur initial...');
    const adminUser = await prisma.user.create({
      data: {
        nom: 'Direction Générale Sidibé',
        login: 'admin',
        motDePasse: 'admin123',
        role: 'ADMIN',
        profil: 'Administrateur Général (Accès Multi-Villes)',
        ville: 'Bamako',
        telephone: '+223 70 00 00 01',
        email: 'admin@sidibeservices.ml',
        pointVenteId: pointVente.id,
        active: true,
      },
    });
    console.log(`✅ Administrateur créé : ${adminUser.nom} (Login: ${adminUser.login}, Mot de passe: admin123)`);

    // Lier l'administrateur comme gérant du point de vente initial
    await prisma.pointDeVente.update({
      where: { id: pointVente.id },
      data: { gerantId: adminUser.id },
    });

    // 4. Rapport d'état à zéro
    console.log('\n====================================================');
    console.log('📊 RAPPORT D\'ÉTAT DES ENREGISTREMENTS (BASE À ZÉRO) :');
    console.log('====================================================');
    const counts = {
      'Points de Vente': await prisma.pointDeVente.count(),
      'Utilisateurs': await prisma.user.count(),
      'Clients': await prisma.client.count(),
      'Fournisseurs': await prisma.fournisseur.count(),
      'Catégories': await prisma.categorie.count(),
      'Produits': await prisma.produit.count(),
      'Variantes': await prisma.produitVariante.count(),
      'Stocks par point': await prisma.stockParPoint.count(),
      'Ventes': await prisma.vente.count(),
      'Lignes de vente': await prisma.venteLigne.count(),
      'Achats': await prisma.achat.count(),
      'Dépenses': await prisma.depense.count(),
      'Clôtures de caisse': await prisma.clotureCaisse.count(),
      'Transferts de stock': await prisma.transfertStock.count(),
      'Factures': await prisma.facture.count(),
      'Paiements dette': await prisma.paiementDette.count(),
      'Mouvements de stock': await prisma.stockMouvement.count(),
    };

    for (const [table, count] of Object.entries(counts)) {
      console.log(`• ${table.padEnd(22)} : ${count}`);
    }

    console.log('\n✨ Initialisation réussie ! Base Supabase prête à démarrer de 0.');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation :', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetToZero();
