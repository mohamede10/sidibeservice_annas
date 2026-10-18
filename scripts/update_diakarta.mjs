import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const p = await prisma.produit.update({
      where: { id: 1 },
      data: {
        imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
        description: 'Magnifique coussin décoratif Jakarta haute qualité, confection soignée, finitions dorées luxueuses pour canapé et salon moderne.',
      },
    });
    console.log('✅ Produit 1 mis à jour avec photo réelle et description :', p.nom, p.imageUrl);
  } catch (e) {
    console.error('Erreur mise à jour :', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
