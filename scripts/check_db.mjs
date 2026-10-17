import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { pointVenteDefaut: true }
    });
    console.log('✅ Connexion réussie à Supabase PostgreSQL !');
    console.log('Utilisateur admin présent :', users);
    
    const countPoints = await prisma.pointDeVente.count();
    const countVentes = await prisma.vente.count();
    const countProduits = await prisma.produit.count();
    console.log(`📊 Statistiques : Points de vente = ${countPoints}, Ventes = ${countVentes}, Produits = ${countProduits}`);
  } catch (err) {
    console.error('❌ Erreur de connexion :', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
