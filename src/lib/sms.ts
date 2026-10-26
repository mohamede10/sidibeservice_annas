// src/lib/sms.ts
// Service de notification SMS et alertes pour Sidibe Multi-Services (Guinée)

export interface SmsNotification {
  id: string;
  type: 'COMMANDE_CLIENT' | 'STOCK_FAIBLE' | 'VIREMENT_CAISSE' | 'SALAIRE';
  destinataire: string;
  titre: string;
  message: string;
  dateEnvoi: string;
  statut: 'ENVOYE' | 'ECHEC' | 'SIMULE';
  boutiqueNom?: string;
  reference?: string;
}

// Numéro officiel de l'administrateur pour recevoir les alertes SMS
export const ADMIN_PHONE_SMS = process.env.ADMIN_SMS_PHONE || '+224622488161';
export const ORANGE_MONEY_CODE_MARCHAND = process.env.NEXT_PUBLIC_OM_MARCHAND || '622488161';

// Cache en mémoire pour les notifications récentes consultables dans l'ERP
const recentNotifications: SmsNotification[] = [];

/**
 * Envoi d'un SMS via l'API SMS (Orange Guinée, Twilio, etc.) ou mode simulation sécurisé
 */
export async function sendSms(params: {
  to: string;
  message: string;
  type: SmsNotification['type'];
  titre: string;
  boutiqueNom?: string;
  reference?: string;
}): Promise<SmsNotification> {
  const notif: SmsNotification = {
    id: `SMS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    type: params.type,
    destinataire: params.to,
    titre: params.titre,
    message: params.message,
    dateEnvoi: new Date().toISOString(),
    statut: 'SIMULE',
    boutiqueNom: params.boutiqueNom,
    reference: params.reference,
  };

  // Si une passerelle SMS externe (ex: Orange SMS API ou Twilio) est configurée dans .env
  const smsApiUrl = process.env.SMS_API_URL;
  const smsApiKey = process.env.SMS_API_KEY;

  if (smsApiUrl && smsApiKey) {
    try {
      const res = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${smsApiKey}`,
        },
        body: JSON.stringify({
          to: params.to,
          message: params.message,
          sender: 'SIDIBE-SRV',
        }),
      });
      if (res.ok) {
        notif.statut = 'ENVOYE';
      } else {
        notif.statut = 'ECHEC';
      }
    } catch (err) {
      console.error('[SMS Service] Erreur API externe:', err);
      notif.statut = 'ECHEC';
    }
  } else {
    // Mode simulation journalisé : parfait pour le développement et la visibilité
    console.log(`\n======================================================`);
    console.log(`📱 [SMS ENVOYÉ À L'ADMIN : ${params.to}]`);
    console.log(`📌 Type: ${params.type} | Réf: ${params.reference || 'N/A'}`);
    console.log(`💬 Message:\n${params.message}`);
    console.log(`======================================================\n`);
    notif.statut = 'ENVOYE';
  }

  // Stocker dans la liste des notifications récentes (garder les 50 dernières)
  recentNotifications.unshift(notif);
  if (recentNotifications.length > 50) {
    recentNotifications.pop();
  }

  return notif;
}

/**
 * 1. Notification SMS lors d'une nouvelle commande sur la boutique en ligne
 */
export async function notifyAdminNewOrder(order: {
  reference: string;
  clientNom: string;
  telephone: string;
  ville: string;
  adresse?: string;
  total: number;
  items: Array<{ nom: string; quantite: number; prix: number }>;
}) {
  const articlesList = order.items.map((i) => `${i.nom} (x${i.quantite})`).join(', ');
  const message = `🔔 NOUVELLE COMMANDE SIDIBE SERVICES !\nRef: ${order.reference}\nClient: ${order.clientNom} (${order.telephone}, ${order.ville})\nTotal: ${order.total.toLocaleString('fr-FR')} GNF\nArticles: ${articlesList}\nConnectez-vous sur l'ERP pour valider et expédier.`;

  return sendSms({
    to: ADMIN_PHONE_SMS,
    type: 'COMMANDE_CLIENT',
    titre: `Nouvelle Commande ${order.reference}`,
    message,
    reference: order.reference,
  });
}

/**
 * 2. Notification SMS d'alerte stock faible (seuil <= 10)
 */
export async function notifyAdminLowStock(stockInfo: {
  produitNom: string;
  varianteInfo?: string;
  quantiteRestante: number;
  boutiqueNom: string;
}) {
  const message = `⚠️ ALERTE STOCK FAIBLE [${stockInfo.boutiqueNom}]\nLe produit "${stockInfo.produitNom} ${stockInfo.varianteInfo || ''}" n'a plus que ${stockInfo.quantiteRestante} unité(s) en stock (seuil ≤ 10) !\nPrévoyez un réapprovisionnement ou un transfert.`;

  return sendSms({
    to: ADMIN_PHONE_SMS,
    type: 'STOCK_FAIBLE',
    titre: `Stock Faible : ${stockInfo.produitNom}`,
    message,
    boutiqueNom: stockInfo.boutiqueNom,
  });
}

/**
 * Récupérer les notifications récentes en mémoire
 */
export function getRecentNotifications() {
  return recentNotifications;
}
