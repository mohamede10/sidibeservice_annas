import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('--- TEST DES VARIABLES D\'ENVIRONNEMENT ---');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'Présente' : 'Manquante');
console.log('SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? 'Présente' : 'Manquante');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Présente' : 'Manquante');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Présente' : 'Manquante');

async function testPrisma() {
  console.log('\n--- TEST DE CONNEXION PRISMA / POSTGRESQL (SUPABASE) ---');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('✅ Connexion Prisma à la base PostgreSQL réussie !');
    
    // Essayer de compter les tables
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Table User accessible. Nombre d'utilisateurs : ${userCount}`);
      if (userCount > 0) {
        const users = await prisma.user.findMany({ select: { id: true, login: true, nom: true, role: true } });
        console.log('Utilisateurs trouvés :', users);
      }
    } catch (tblErr) {
      console.log('⚠️ Tables Prisma non encore créées ou problème de schéma :', tblErr.message);
    }
  } catch (err) {
    console.error('❌ Erreur de connexion Prisma :', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testSupabase() {
  console.log('\n--- TEST DU CLIENT SUPABASE JS ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ URL ou Clé Supabase manquante');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Erreur Supabase Client Auth :', error.message);
    } else {
      console.log('✅ Client Supabase connecté à l\'API Supabase avec succès !');
    }
  } catch (err) {
    console.error('❌ Exception Client Supabase :', err.message);
  }
}

async function main() {
  await testPrisma();
  await testSupabase();
}

main();
