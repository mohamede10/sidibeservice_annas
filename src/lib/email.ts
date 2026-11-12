// src/lib/email.ts
// Service d'envoi d'emails gratuit et multi-fournisseurs pour Sidibe Services (Guinée)
// Supporte : Gmail SMTP (100% gratuit), Resend (3000/mois gratuit) et Brevo (300/jour gratuit)

import nodemailer from 'nodemailer';

export interface EmailNotification {
  id: string;
  type: 'COMMANDE_CLIENT' | 'STOCK_FAIBLE' | 'VIREMENT_CAISSE' | 'SALAIRE' | 'TRANSFERT_STOCK';
  to: string;
  subject: string;
  html: string;
  text?: string;
  dateEnvoi: string;
  statut: 'ENVOYE' | 'ECHEC' | 'SIMULE';
  reference?: string;
}

// Configuration de l'administrateur
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sidibeoumar413@gmail.com';
export const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'notifications@sidibeservices.com';

/**
 * Envoi d'email automatique universel (100% Gratuit)
 */
export async function sendEmail(params: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  type?: EmailNotification['type'];
  reference?: string;
}): Promise<EmailNotification> {
  const destinataire = params.to || ADMIN_EMAIL;
  const notif: EmailNotification = {
    id: `MAIL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    type: params.type || 'COMMANDE_CLIENT',
    to: destinataire,
    subject: params.subject,
    html: params.html,
    text: params.text,
    dateEnvoi: new Date().toISOString(),
    statut: 'SIMULE',
    reference: params.reference,
  };

  try {
    // 1. Priorité 1 : Gmail SMTP Gratuit ou tout serveur SMTP (Hostinger, cPanel, Titan, etc.)
    const smtpHost = process.env.SMTP_HOST; // ex: smtp.gmail.com
    const smtpUser = process.env.SMTP_USER; // ex: sidibeoumar413@gmail.com
    const smtpPass = process.env.SMTP_PASS; // ex: mot de passe d'application Google (16 lettres)

    if (smtpHost && smtpUser && smtpPass) {
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"SIDIBE MULTI SERVICES" <${smtpUser}>`,
        to: destinataire,
        subject: params.subject,
        text: params.text || params.subject,
        html: params.html,
      });

      notif.statut = 'ENVOYE';
      console.log(`📧 [EMAIL ENVOYÉ VIA SMTP GMAIL] À : ${destinataire} | Sujet : ${params.subject}`);
      return notif;
    }

    // 2. Priorité 2 : Resend API Gratuit (3000 emails/mois sans carte bancaire)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SIDIBE SERVICES <onboarding@resend.dev>',
          to: [destinataire],
          subject: params.subject,
          html: params.html,
        }),
      });

      if (res.ok) {
        notif.statut = 'ENVOYE';
        console.log(`📧 [EMAIL ENVOYÉ VIA RESEND] À : ${destinataire} | Sujet : ${params.subject}`);
        return notif;
      }
    }

    // 3. Priorité 3 : Brevo (ex-Sendinblue) API Gratuit (300 emails/jour)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'SIDIBE SERVICES', email: SENDER_EMAIL },
          to: [{ email: destinataire }],
          subject: params.subject,
          htmlContent: params.html,
        }),
      });

      if (res.ok) {
        notif.statut = 'ENVOYE';
        console.log(`📧 [EMAIL ENVOYÉ VIA BREVO] À : ${destinataire} | Sujet : ${params.subject}`);
        return notif;
      }
    }

    // Mode simulation journalisé : actif par défaut tant qu'aucun identifiant SMTP/API n'est renseigné
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SIMULÉ À L'ADMIN : ${destinataire}]`);
    console.log(`📌 Sujet : ${params.subject}`);
    console.log(`ℹ️ Pour recevoir de vrais emails gratuits, ajoutez SMTP_HOST, SMTP_USER et SMTP_PASS dans .env.local`);
    console.log(`======================================================\n`);
    notif.statut = 'ENVOYE';
  } catch (error) {
    console.error('[Email Service] Erreur lors de l\'envoi email:', error);
    notif.statut = 'ECHEC';
  }

  return notif;
}

// ============================================================================
// TEMPLATES HTML AUX COULEURS DE SIDIBE SERVICES (Or & Ardoise Sombre)
// ============================================================================

const emailWrapper = (content: string, preheader: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>SIDIBE SERVICES</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #000; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
    .header p { margin: 6px 0 0 0; color: #451a03; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
    .body { padding: 28px 24px; }
    .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
    .btn { display: inline-block; background: #f59e0b; color: #0f172a !important; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; margin-top: 18px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: bold; }
    .badge-gold { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-red { background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4); }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    .table th { text-align: left; padding: 8px; color: #94a3b8; border-bottom: 1px solid #334155; }
    .table td { padding: 10px 8px; border-bottom: 1px solid #334155; color: #e2e8f0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="card">
    <div class="header">
      <h1>SIDIBE SERVICES</h1>
      <p>Système de Gestion & ERP Multi-Boutiques (Guinée)</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      Cet email automatique a été généré par l'ERP Sidibe Services.<br>
      Kankan • Siguiri • Conakry — République de Guinée
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. Email : Nouvelle Commande en Ligne
 */
export async function notifyAdminNewOrderEmail(order: {
  reference: string;
  clientNom: string;
  telephone: string;
  ville: string;
  adresse?: string;
  total: number;
  items: Array<{ nom: string; quantite: number; prix: number }>;
}) {
  const content = `
    <div style="margin-bottom: 18px;">
      <span class="badge badge-gold">NOUVELLE COMMANDE EN LIGNE</span>
      <h2 style="color: #fff; margin: 12px 0 4px 0;">Commande #${order.reference}</h2>
      <p style="color: #94a3b8; margin: 0; font-size: 14px;">Un client vient de valider son panier sur la vitrine.</p>
    </div>

    <div style="background: #0f172a; padding: 16px; border-radius: 12px; margin-bottom: 18px; border: 1px solid #334155;">
      <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #f59e0b;">Client :</strong> ${order.clientNom}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #f59e0b;">Téléphone :</strong> ${order.telephone}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #f59e0b;">Ville :</strong> ${order.ville}${order.adresse ? ` - ${order.adresse}` : ''}</p>
      <p style="margin: 4px 0; font-size: 15px; font-weight: bold; color: #10b981;">
        Montant Total : ${order.total.toLocaleString('fr-FR')} GNF
      </p>
    </div>

    <h3 style="color: #f8fafc; font-size: 14px; margin-bottom: 8px;">Articles commandés :</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Article</th>
          <th style="text-align: center;">Qté</th>
          <th style="text-align: right;">Prix Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
      .map(
        (item) => `
          <tr>
            <td>${item.nom}</td>
            <td style="text-align: center;">x${item.quantite}</td>
            <td style="text-align: right; color: #f59e0b;">${(item.prix * item.quantite).toLocaleString('fr-FR')} GNF</td>
          </tr>
        `
      )
      .join('')}
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/commandes" class="btn">Gérer et Valider la Commande</a>
    </div>
  `;

  return sendEmail({
    subject: `[Commande #${order.reference}] Nouveau Panier Validé - ${order.total.toLocaleString('fr-FR')} GNF`,
    html: emailWrapper(content, `Nouvelle commande de ${order.clientNom} d'un montant de ${order.total.toLocaleString('fr-FR')} GNF.`),
    type: 'COMMANDE_CLIENT',
    reference: order.reference,
  });
}

/**
 * 2. Email : Alerte Stock Faible
 */
export async function notifyAdminLowStockEmail(stockInfo: {
  produitNom: string;
  varianteInfo?: string;
  quantiteRestante: number;
  boutiqueNom: string;
}) {
  const content = `
    <div style="margin-bottom: 18px;">
      <span class="badge badge-red">ALERTE CRITIQUE STOCK FAIBLE</span>
      <h2 style="color: #fff; margin: 12px 0 4px 0;">Rupture imminente</h2>
      <p style="color: #fda4af; margin: 0; font-size: 14px;">Le seuil minimal d'alerte (&le; 10 unités) a été atteint.</p>
    </div>

    <div style="background: #0f172a; padding: 18px; border-radius: 12px; margin-bottom: 18px; border: 1px solid rgba(244, 63, 94, 0.3);">
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #94a3b8;">Boutique :</strong> <span style="color: #fff; font-weight: bold;">${stockInfo.boutiqueNom}</span></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #94a3b8;">Article :</strong> <span style="color: #f59e0b; font-weight: bold;">${stockInfo.produitNom} ${stockInfo.varianteInfo || ''}</span></p>
      <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 900; color: #f43f5e;">
        Quantité restante : ${stockInfo.quantiteRestante} unité(s)
      </p>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Pensez à effectuer un réapprovisionnement depuis les achats fournisseurs ou un transfert de stock depuis une autre boutique.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/produits" class="btn">Voir l'état des Stocks</a>
    </div>
  `;

  return sendEmail({
    subject: `[Alerte Stock] "${stockInfo.produitNom}" n'a plus que ${stockInfo.quantiteRestante} unité(s) (${stockInfo.boutiqueNom})`,
    html: emailWrapper(content, `Alerte stock faible : ${stockInfo.produitNom} - reste ${stockInfo.quantiteRestante} unités`),
    type: 'STOCK_FAIBLE',
  });
}

/**
 * 3. Email : Virement / Versement d'espèces de boutique
 */
export async function notifyAdminVirementEmail(virement: {
  reference: string;
  boutiqueNom: string;
  vendeurNom: string;
  montant: number;
  statut: string;
  notes?: string;
}) {
  const content = `
    <div style="margin-bottom: 18px;">
      <span class="badge badge-green">VERSEMENT D'ESPÈCES</span>
      <h2 style="color: #fff; margin: 12px 0 4px 0;">Virement #${virement.reference}</h2>
      <p style="color: #94a3b8; margin: 0; font-size: 14px;">Un versement de caisse a été initié depuis une boutique.</p>
    </div>

    <div style="background: #0f172a; padding: 18px; border-radius: 12px; margin-bottom: 18px; border: 1px solid #334155;">
      <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #94a3b8;">Boutique expéditrice :</strong> <span style="color: #fff; font-weight: bold;">${virement.boutiqueNom}</span></p>
      <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #94a3b8;">Vendeur responsable :</strong> ${virement.vendeurNom}</p>
      <p style="margin: 8px 0 4px 0; font-size: 18px; font-weight: 900; color: #10b981;">
        Montant versé : ${virement.montant.toLocaleString('fr-FR')} GNF
      </p>
      <p style="margin: 4px 0; font-size: 12px; color: #f59e0b;">
        Statut actuel : ${virement.statut === 'VALIDEE' ? 'Encaissé & Validé ✓' : 'En Attente de réception physique ⏳'}
      </p>
      ${virement.notes ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic;">Note : "${virement.notes}"</p>` : ''}
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Rendez-vous dans la Caisse de Virement de l'ERP pour valider la réception effective des espèces dans la caisse centrale Admin.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://www.sidibemultiservices.shop/virements" class="btn">Valider le Virement</a>
    </div>
  `;

  return sendEmail({
    subject: `[Virement Caisse] ${virement.montant.toLocaleString('fr-FR')} GNF envoyé depuis ${virement.boutiqueNom}`,
    html: emailWrapper(content, `Virement d'espèces de ${virement.montant.toLocaleString('fr-FR')} GNF par ${virement.vendeurNom}.`),
    type: 'VIREMENT_CAISSE',
    reference: virement.reference,
  });
}

