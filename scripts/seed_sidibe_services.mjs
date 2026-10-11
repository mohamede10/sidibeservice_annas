import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DUMP_PATH = path.resolve('..', 'sidibe_bd', 'dum_db_sidibe.sql');

function parseSqlValues(line) {
  const valuesIdx = line.indexOf('VALUES ');
  if (valuesIdx === -1) return [];
  const content = line.substring(valuesIdx + 7).trim().replace(/;$/, '');
  
  const results = [];
  let current = '';
  let inString = false;
  let escape = false;
  let inTuple = false;
  let tuple = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      current += char;
      continue;
    }
    if (char === "'" && !escape) {
      inString = !inString;
      current += char;
      continue;
    }
    if (!inString) {
      if (char === '(' && !inTuple) {
        inTuple = true;
        tuple = [];
        current = '';
        continue;
      }
      if (char === ')' && inTuple) {
        tuple.push(cleanVal(current));
        results.push(tuple);
        inTuple = false;
        tuple = [];
        current = '';
        continue;
      }
      if (char === ',' && inTuple) {
        tuple.push(cleanVal(current));
        current = '';
        continue;
      }
    }
    current += char;
  }
  return results;
}

function cleanVal(v) {
  v = v.trim();
  if (v === 'NULL' || v === 'null') return null;
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  }
  const n = Number(v);
  return isNaN(n) ? v : n;
}

async function main() {
  console.log('=== Initialisation Sidibé Services (Multi-Boutiques & Multi-Villes) ===');

  // 1. Points de Vente multi-villes
  console.log('-> Création des points de vente par ville...');
  const pvBamako1 = await prisma.pointDeVente.create({
    data: {
      nom: 'Sidibé Services - Siège Hamdallaye ACI',
      codeBoutique: 'BAM-01',
      ville: 'Bamako',
      adresse: 'Hamdallaye ACI 2000, Rue 312',
      telephone: '+223 70 11 22 33',
      email: 'bamako.aci@sidibeservices.com',
      active: true,
    }
  });

  const pvBamako2 = await prisma.pointDeVente.create({
    data: {
      nom: 'Sidibé Services - Agence Grand Marché',
      codeBoutique: 'BAM-02',
      ville: 'Bamako',
      adresse: 'Centre Commercial Grand Marché',
      telephone: '+223 70 44 55 66',
      email: 'bamako.marche@sidibeservices.com',
      active: true,
    }
  });

  const pvSikasso = await prisma.pointDeVente.create({
    data: {
      nom: 'Sidibé Services - Agence Sikasso',
      codeBoutique: 'SIK-01',
      ville: 'Sikasso',
      adresse: 'Avenue du 19 Septembre, Sikasso Centre',
      telephone: '+223 76 12 34 56',
      email: 'sikasso@sidibeservices.com',
      active: true,
    }
  });

  const pvSegou = await prisma.pointDeVente.create({
    data: {
      nom: 'Sidibé Services - Agence Ségou',
      codeBoutique: 'SEG-01',
      ville: 'Ségou',
      adresse: 'Quartier Administratif, Ségou',
      telephone: '+223 78 90 12 34',
      email: 'segou@sidibeservices.com',
      active: true,
    }
  });

  const pvKayes = await prisma.pointDeVente.create({
    data: {
      nom: 'Sidibé Services - Dépôt Régional Kayes',
      codeBoutique: 'KAY-01',
      ville: 'Kayes',
      adresse: 'Quartier Légal Ségou, Kayes',
      telephone: '+223 65 43 21 00',
      email: 'kayes@sidibeservices.com',
      active: true,
    }
  });

  // 2. Utilisateurs & Vendeurs affectés par boutique
  console.log('-> Création des utilisateurs et affectation par boutique...');
  const adminUser = await prisma.user.create({
    data: {
      nom: 'Direction Générale Sidibé',
      login: 'admin',
      email: 'direction@sidibeservices.com',
      motDePasse: 'admin123',
      role: 'ADMIN',
      profil: 'Administrateur Général (Accès Multi-Villes)',
      ville: 'Bamako',
      pointVenteId: pvBamako1.id,
    }
  });

  const vendeurBamako = await prisma.user.create({
    data: {
      nom: 'Amadou Sidibé (Vendeur Bamako)',
      login: 'vendeur.bamako',
      email: 'amadou@sidibeservices.com',
      motDePasse: '123456',
      role: 'VENDEUR',
      profil: 'Caissier / Vendeur Boutique',
      ville: 'Bamako',
      pointVenteId: pvBamako1.id,
    }
  });

  const vendeurSikasso = await prisma.user.create({
    data: {
      nom: 'Fatoumata Traoré (Vendeuse Sikasso)',
      login: 'vendeur.sikasso',
      email: 'fatou@sidibeservices.com',
      motDePasse: '123456',
      role: 'VENDEUR',
      profil: 'Responsable Caisse Sikasso',
      ville: 'Sikasso',
      pointVenteId: pvSikasso.id,
    }
  });

  const vendeurSegou = await prisma.user.create({
    data: {
      nom: 'Bakary Diarra (Vendeur Ségou)',
      login: 'vendeur.segou',
      email: 'bakary@sidibeservices.com',
      motDePasse: '123456',
      role: 'VENDEUR',
      profil: 'Caissier Ségou',
      ville: 'Ségou',
      pointVenteId: pvSegou.id,
    }
  });

  const gerantKayes = await prisma.user.create({
    data: {
      nom: 'Mamadou Coulibaly (Gérant Kayes)',
      login: 'gerant.kayes',
      email: 'mamadou@sidibeservices.com',
      motDePasse: '123456',
      role: 'GERANT',
      profil: 'Gérant Régional Kayes',
      ville: 'Kayes',
      pointVenteId: pvKayes.id,
    }
  });

  // 3. Catégories & Produits Sidibé Services
  console.log('-> Création des catégories Sidibé Services...');
  const catMatBureau = await prisma.categorie.create({
    data: {
      nom: 'Matériels & Équipements Informatiques',
      slug: 'materiels-informatiques',
      description: 'Ordinateurs, imprimantes, onduleurs, accessoires réseau',
    }
  });

  const catFournitures = await prisma.categorie.create({
    data: {
      nom: 'Fournitures de Bureau & Papeterie',
      slug: 'fournitures-bureau',
      description: 'Rames de papier, classeurs, stylos, cartouches d\'encre',
    }
  });

  const catQuincaillerie = await prisma.categorie.create({
    data: {
      nom: 'Quincaillerie & Matériaux de Construction',
      slug: 'quincaillerie-materiaux',
      description: 'Ciment, fer, outillage, peinture, câblage',
    }
  });

  const catPrestations = await prisma.categorie.create({
    data: {
      nom: 'Prestations de Services & Maintenance',
      slug: 'prestations-services',
      description: 'Installation, maintenance, réparation, logistique',
    }
  });

  const catCommerce = await prisma.categorie.create({
    data: {
      nom: 'Commerce Général & Divers',
      slug: 'commerce-general',
      description: 'Produits d\'entretien, agroalimentaire, emballages',
    }
  });

  // Import des 318 produits du dump avec adaptation Sidibé Services
  console.log('-> Parsing et import des produits du dump...');
  const dumpContent = fs.readFileSync(DUMP_PATH, 'utf-8');
  const lines = dumpContent.split('\n');

  const tableData = {};
  for (const line of lines) {
    if (line.startsWith('INSERT INTO `')) {
      const parts = line.split('`');
      const tbl = parts[1];
      if (!tableData[tbl]) tableData[tbl] = [];
      const rows = parseSqlValues(line);
      tableData[tbl].push(...rows);
    }
  }

  const allPoints = [pvBamako1, pvBamako2, pvSikasso, pvSegou, pvKayes];
  let prodCount = 0;

  if (tableData['llx_product']) {
    for (const p of tableData['llx_product']) {
      const rowid = p[0];
      const ref = p[1] ? String(p[1]) : `PRD-${rowid}`;
      const label = p[2] ? String(p[2]) : ref;
      const desc = p[3] ? String(p[3]) : '';
      const price = typeof p[4] === 'number' ? p[4] : parseFloat(p[4]) || 25000;
      const priceTtc = typeof p[5] === 'number' ? p[5] : parseFloat(p[5]) || price;

      // Catégorisation intelligente pour Sidibé Services
      let catId = catCommerce.id;
      let catNom = 'Commerce Général & Divers';
      const labelLower = label.toLowerCase();

      if (labelLower.includes('ordinateur') || labelLower.includes('imprimante') || labelLower.includes('toner') || labelLower.includes('cartouche') || labelLower.includes('cable') || labelLower.includes('souris') || labelLower.includes('clavier')) {
        catId = catMatBureau.id;
        catNom = 'Matériels & Équipements Informatiques';
      } else if (labelLower.includes('papier') || labelLower.includes('cahier') || labelLower.includes('stylo') || labelLower.includes('classeur') || labelLower.includes('registre') || labelLower.includes('chemise')) {
        catId = catFournitures.id;
        catNom = 'Fournitures de Bureau & Papeterie';
      } else if (labelLower.includes('fer') || labelLower.includes('ciment') || labelLower.includes('peinture') || labelLower.includes('vis') || labelLower.includes('tuyau') || labelLower.includes('ampoule')) {
        catId = catQuincaillerie.id;
        catNom = 'Quincaillerie & Matériaux de Construction';
      } else if (labelLower.includes('service') || labelLower.includes('installation') || labelLower.includes('reparation') || labelLower.includes('maintenance')) {
        catId = catPrestations.id;
        catNom = 'Prestations de Services & Maintenance';
      }

      try {
        const prod = await prisma.produit.create({
          data: {
            nom: label,
            ref: ref,
            description: desc,
            categorieId: catId,
            categorieNom: catNom,
            actif: true,
          }
        });

        const cout = Math.round(price * 0.7);
        const variante = await prisma.produitVariante.create({
          data: {
            produitId: prod.id,
            taille: 'Standard',
            couleur: 'Original',
            reference: `${ref}-VAR1`,
            prix: priceTtc > 0 ? priceTtc : 30000,
            coutAchat: cout > 0 ? cout : 20000,
            quantiteStock: Math.floor(Math.random() * 40) + 10,
          }
        });

        // Stocker pour chaque point de vente
        for (const pv of allPoints) {
          const qte = Math.floor(Math.random() * 25) + 3;
          await prisma.stockParPoint.create({
            data: {
              varianteId: variante.id,
              pointDeVenteId: pv.id,
              quantite: qte,
              stockMin: 3,
            }
          });
        }
        prodCount++;
      } catch (e) {
        // ignore duplicate
      }
    }
  }

  console.log(`Produits Sidibé Services créés : ${prodCount}`);

  // 4. Clients & Tiers
  console.log('-> Migration des clients et tiers...');
  const clientsList = [];
  if (tableData['llx_societe']) {
    for (const soc of tableData['llx_societe']) {
      const nom = soc[1] ? String(soc[1]) : `Tiers`;
      const phone = soc[9] ? String(soc[9]) : '';
      const email = soc[11] ? String(soc[11]) : '';
      const ville = soc[7] ? String(soc[7]) : 'Bamako';
      const adresse = soc[5] ? String(soc[5]) : '';
      const isFournisseur = soc[15] == 1;

      if (isFournisseur) {
        try {
          await prisma.fournisseur.create({
            data: { nom, telephone: phone, email, ville, adresse }
          });
        } catch {}
      } else {
        try {
          const c = await prisma.client.create({
            data: {
              nom,
              telephone: phone,
              email,
              ville,
              adresse,
              soldeDette: Math.random() > 0.75 ? Math.floor(Math.random() * 75000) : 0,
            }
          });
          clientsList.push(c);
        } catch {}
      }
    }
  }
  console.log(`Clients créés : ${clientsList.length}`);

  // 5. Ventes & Factures Récentes réparties sur les boutiques
  console.log('-> Création des ventes et factures par point de vente...');
  let totalVentes = 0;
  for (let i = 1; i <= 60; i++) {
    const pv = allPoints[i % allPoints.length];
    const user = i % 2 === 0 ? adminUser : (pv.id === pvBamako1.id ? vendeurBamako : (pv.id === pvSikasso.id ? vendeurSikasso : vendeurSegou));
    const client = clientsList[i % clientsList.length];
    const total = (Math.floor(Math.random() * 15) + 2) * 15000;
    const isCredit = i % 5 === 0;
    const paye = isCredit ? 0 : total;
    const restant = total - paye;
    const ref = `VTE-${pv.codeBoutique}-${String(1000 + i)}`;
    const facRef = `FAC-${pv.codeBoutique}-${String(1000 + i)}`;

    // Dates échelonnées pour les rapports (aujourd'hui, cette semaine, ce mois, cette année)
    const dateVente = new Date();
    dateVente.setDate(dateVente.getDate() - (i % 30));

    try {
      const v = await prisma.vente.create({
        data: {
          reference: ref,
          dateVente,
          nomClient: client ? client.nom : 'Client Comptant',
          telephoneClient: client ? client.telephone : null,
          total,
          montantPaye: paye,
          montantRestant: restant,
          modePaiement: isCredit ? 'CREDIT' : (i % 3 === 0 ? 'WAVE' : (i % 4 === 0 ? 'ORANGE_MONEY' : 'ESPECES')),
          statutPaiement: isCredit ? 'IMPAYE' : 'PAYE',
          pointVenteId: pv.id,
          pointVenteNom: pv.nom,
          vendeurId: user.id,
          clientId: client ? client.id : null,
          lignes: {
            create: [
              {
                nomProduit: 'Article Fourniture / Équipement Sidibé',
                quantite: 2,
                prixUnitaire: total / 2,
                totalLigne: total,
              }
            ]
          }
        }
      });

      await prisma.facture.create({
        data: {
          numeroFacture: facRef,
          venteId: v.id,
          pointDeVenteId: pv.id,
          utilisateurId: user.id,
          dateFacture: dateVente,
          totalFacture: total,
          statut: isCredit ? 'IMPAYEE' : 'PAYEE',
        }
      });

      totalVentes++;
    } catch {}
  }

  // 6. Dépenses par point de vente
  console.log('-> Enregistrement des dépenses par boutique...');
  for (const pv of allPoints) {
    await prisma.depense.create({
      data: {
        pointDeVenteId: pv.id,
        utilisateurId: adminUser.id,
        categorie: 'ELECTRICITE',
        motif: `Facture EDM / Énergie - ${pv.nom}`,
        montant: 35000,
        modePaiement: 'ORANGE_MONEY',
      }
    });
    await prisma.depense.create({
      data: {
        pointDeVenteId: pv.id,
        utilisateurId: adminUser.id,
        categorie: 'TRANSPORT',
        motif: `Frais logistique & acheminement stock ${pv.ville}`,
        montant: 20000,
        modePaiement: 'ESPECES',
      }
    });
  }

  // 7. Transferts de stock inter-boutiques
  console.log('-> Création d\'un transfert de stock inter-boutiques...');
  const firstVariant = await prisma.produitVariante.findFirst();
  if (firstVariant) {
    await prisma.transfertStock.create({
      data: {
        reference: 'TRF-2026-001',
        pointOrigineId: pvBamako1.id,
        pointDestinationId: pvSikasso.id,
        statut: 'VALIDE',
        initieParId: adminUser.id,
        valideParId: gerantKayes.id,
        notes: 'Réapprovisionnement stock boutique Sikasso depuis le siège Bamako',
        lignes: {
          create: [
            {
              varianteId: firstVariant.id,
              nomArticle: 'Fournitures / Équipements Sidibé Services',
              quantite: 15,
            }
          ]
        }
      }
    });
  }

  console.log('=== SEED SIDIBÉ SERVICES TERMINÉ AVEC SUCCÈS ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
