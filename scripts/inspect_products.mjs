import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const produits = await prisma.produit.findMany({
      select: { id: true, nom: true, imageUrl: true, categorieNom: true },
      take: 20
    });
    console.log(`Nombre total de produits: ${produits.length}`);
    console.log(JSON.stringify(produits, null, 2));
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
