import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function startOf(period: string, date = new Date()) {
  const d = new Date(date);
  if (period === 'day') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function endOf(period: string, date = new Date()) {
  const d = new Date(date);
  if (period === 'day') {
    d.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
    d.setDate(diff);
    d.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day'; // day | week | month | year
    const pointVenteId = searchParams.get('pointVenteId'); // null = all
    const pvId = pointVenteId ? parseInt(pointVenteId) : undefined;

    const dateDebut = startOf(period);
    const dateFin = endOf(period);

    const venteWhere = {
      dateVente: { gte: dateDebut, lte: dateFin },
      ...(pvId ? { pointVenteId: pvId } : {}),
    };

    const depenseWhere = {
      dateDepense: { gte: dateDebut, lte: dateFin },
      ...(pvId ? { pointDeVenteId: pvId } : {}),
    };

    // --- Aggregations principales ---
    const ventesAgg = await prisma.vente.aggregate({
      where: venteWhere,
      _sum: { total: true, montantPaye: true, montantRestant: true },
      _count: { _all: true },
      _avg: { total: true },
    });

    // Ventilation par mode de paiement
    const ventesParMode = await prisma.vente.groupBy({
      by: ['modePaiement'],
      where: venteWhere,
      _sum: { total: true, montantPaye: true },
      _count: { _all: true },
    });

    // Ventilation par statut de paiement
    const ventesParStatut = await prisma.vente.groupBy({
      by: ['statutPaiement'],
      where: venteWhere,
      _sum: { total: true },
      _count: { _all: true },
    });

    // Dépenses
    const depensesAgg = await prisma.depense.aggregate({
      where: depenseWhere,
      _sum: { montant: true },
      _count: { _all: true },
    });

    const depensesParCategorie = await prisma.depense.groupBy({
      by: ['categorie'],
      where: depenseWhere,
      _sum: { montant: true },
      _count: { _all: true },
    });

    // Top produits vendus (par nombre de lignes)
    const topProduits = await prisma.venteLigne.groupBy({
      by: ['nomProduit'],
      where: {
        vente: { dateVente: { gte: dateDebut, lte: dateFin }, ...(pvId ? { pointVenteId: pvId } : {}) },
      },
      _sum: { quantite: true, totalLigne: true },
      orderBy: { _sum: { totalLigne: 'desc' } },
      take: 10,
    });

    // Évolution journalière (pour graphiques)
    let evolutionData: Array<{ label: string; chiffreAffaires: number; encaisse: number; depenses: number }> = [];

    if (period === 'week' || period === 'month') {
      // Grouper par jour
      const allVentes = await prisma.vente.findMany({
        where: venteWhere,
        select: { dateVente: true, total: true, montantPaye: true },
      });
      const allDepenses = await prisma.depense.findMany({
        where: depenseWhere,
        select: { dateDepense: true, montant: true },
      });

      const byDay: Record<string, { ca: number; enc: number; dep: number }> = {};
      allVentes.forEach((v) => {
        const key = v.dateVente.toISOString().split('T')[0];
        if (!byDay[key]) byDay[key] = { ca: 0, enc: 0, dep: 0 };
        byDay[key].ca += v.total;
        byDay[key].enc += v.montantPaye;
      });
      allDepenses.forEach((d) => {
        const key = d.dateDepense.toISOString().split('T')[0];
        if (!byDay[key]) byDay[key] = { ca: 0, enc: 0, dep: 0 };
        byDay[key].dep += d.montant;
      });

      evolutionData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          label: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
          chiffreAffaires: vals.ca,
          encaisse: vals.enc,
          depenses: vals.dep,
        }));
    } else if (period === 'year') {
      // Grouper par mois
      const allVentes = await prisma.vente.findMany({
        where: venteWhere,
        select: { dateVente: true, total: true, montantPaye: true },
      });
      const allDepenses = await prisma.depense.findMany({
        where: depenseWhere,
        select: { dateDepense: true, montant: true },
      });

      const byMonth: Record<string, { ca: number; enc: number; dep: number }> = {};
      const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      allVentes.forEach((v) => {
        const m = v.dateVente.getMonth();
        const key = String(m);
        if (!byMonth[key]) byMonth[key] = { ca: 0, enc: 0, dep: 0 };
        byMonth[key].ca += v.total;
        byMonth[key].enc += v.montantPaye;
      });
      allDepenses.forEach((d) => {
        const m = d.dateDepense.getMonth();
        const key = String(m);
        if (!byMonth[key]) byMonth[key] = { ca: 0, enc: 0, dep: 0 };
        byMonth[key].dep += d.montant;
      });

      evolutionData = Object.entries(byMonth)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([month, vals]) => ({
          label: MONTHS[parseInt(month)],
          chiffreAffaires: vals.ca,
          encaisse: vals.enc,
          depenses: vals.dep,
        }));
    }

    // Ventes par point de vente
    const ventesParPDV = await prisma.vente.groupBy({
      by: ['pointVenteId', 'pointVenteNom'],
      where: venteWhere,
      _sum: { total: true, montantPaye: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    // Nombre nouveaux clients
    const nouveauxClients = await prisma.client.count({
      where: { createdAt: { gte: dateDebut, lte: dateFin } },
    });

    const chiffreAffaires = ventesAgg._sum.total || 0;
    const encaisse = ventesAgg._sum.montantPaye || 0;
    const totalDepenses = depensesAgg._sum.montant || 0;
    const beneficeNet = encaisse - totalDepenses;
    const creances = ventesAgg._sum.montantRestant || 0;

    return NextResponse.json({
      success: true,
      period,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString(),
      kpis: {
        chiffreAffaires,
        encaisse,
        creances,
        totalDepenses,
        beneficeNet,
        nombreVentes: ventesAgg._count._all,
        panierMoyen: ventesAgg._avg.total || 0,
        nouveauxClients,
        nombreDepenses: depensesAgg._count._all,
      },
      ventesParMode,
      ventesParStatut,
      depensesParCategorie,
      topProduits,
      ventesParPDV,
      evolutionData,
    });
  } catch (error) {
    console.error('Erreur API Rapports:', error);
    return NextResponse.json({ success: false, error: 'Erreur chargement rapports' }, { status: 500 });
  }
}
