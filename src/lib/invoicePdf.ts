// src/lib/invoicePdf.ts
// Génération de factures PDF professionnelles, envoi WhatsApp et Email pour Sidibe Multi-Services

import { emitToast } from '@/contexts/ToastContext';

export interface InvoiceData {
  numeroFacture: string;
  referenceVente: string;
  dateFacture: string;
  boutique: {
    nom: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    codeBoutique?: string;
  };
  client: {
    nom: string;
    telephone?: string;
    adresse?: string;
    email?: string;
    ville?: string;
  };
  lignes: Array<{
    designation: string;
    varianteInfo?: string;
    quantite: number;
    prixUnitaire: number;
    totalLigne: number;
  }>;
  total: number;
  montantPaye: number;
  montantRestant: number;
  modePaiement: string;
  vendeurNom?: string;
}

/**
 * Formate un montant en GNF
 */
export function formatGNF(montant: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' GNF';
}

/**
 * Ouvre une fenêtre d'impression pour la facture au format A4 / Ticket
 */
export function printInvoice(data: InvoiceData) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    emitToast(
      'Veuillez autoriser les fenêtres pop-up pour imprimer ou télécharger la facture.',
      'warning',
      'Pop-up bloqué'
    );
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.numeroFacture} - Sidibe Multi-Services</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #fff; color: #1e293b; padding: 20px; font-size: 13px; line-height: 1.5; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 25px; }
    .logo-area h1 { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .logo-area span { color: #d97706; }
    .logo-area p { color: #64748b; font-size: 12px; margin-top: 3px; }
    .invoice-meta { text-align: right; }
    .invoice-badge { display: inline-block; background: #fef3c7; color: #92400e; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 6px; }
    .invoice-number { font-size: 18px; font-weight: 800; color: #0f172a; }
    .meta-date { font-size: 12px; color: #64748b; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .party-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .party-title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-info { font-size: 12px; color: #475569; line-height: 1.4; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    th:last-child { text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
    td:last-child { text-align: right; font-weight: 700; }
    tr:nth-child(even) { background: #f8fafc; }

    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
    .totals-row.grand-total { border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 900; color: #0f172a; }
    .totals-row.paid { color: #16a34a; font-weight: 700; }
    .totals-row.rest { color: #dc2626; font-weight: 800; }

    .footer { border-top: 1px dashed #cbd5e1; padding-top: 20px; text-align: center; color: #64748b; font-size: 11px; }
    .footer p { margin-bottom: 4px; }
    .orange-money-box { margin-top: 15px; padding: 10px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 6px; display: inline-block; font-size: 12px; color: #c2410c; font-weight: 700; }

    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #d97706; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">🖨️ Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="logo-area">
        <h1>SIDIBE <span>MULTI-SERVICES</span></h1>
        <p>Décoration d'Intérieur • Tapis de Luxe • Rideaux • Linge de Lit</p>
        <p><strong>Boutique :</strong> ${data.boutique.nom} ${data.boutique.codeBoutique ? `(${data.boutique.codeBoutique})` : ''}</p>
        <p>${data.boutique.adresse || 'Centre Commercial'} • ${data.boutique.ville || 'Kankan'}</p>
        <p>Tél : ${data.boutique.telephone || '+224 622 48 81 61'}</p>
      </div>
      <div class="invoice-meta">
        <div class="invoice-badge">${data.montantRestant <= 0 ? 'FACTURE PAYÉE' : 'AVOIR / CRÉDIT'}</div>
        <div class="invoice-number">${data.numeroFacture}</div>
        <div class="meta-date">Date : ${new Date(data.dateFacture).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <div class="meta-date">Réf. Vente : <strong>${data.referenceVente}</strong></div>
      </div>
    </div>

    <div class="parties-grid">
      <div class="party-box">
        <div class="party-title">Émise par (Vendeur)</div>
        <div class="party-name">${data.boutique.nom}</div>
        <div class="party-info">
          Ville : ${data.boutique.ville || 'Kankan'}<br>
          Adresse : ${data.boutique.adresse || 'Centre Commercial'}<br>
          Contact : ${data.boutique.telephone || '+224 622 48 81 61'}<br>
          ${data.vendeurNom ? `Servi par : ${data.vendeurNom}` : ''}
        </div>
      </div>

      <div class="party-box">
        <div class="party-title">Client Facturé</div>
        <div class="party-name">${data.client.nom}</div>
        <div class="party-info">
          Téléphone : ${data.client.telephone || 'Non renseigné'}<br>
          Adresse : ${data.client.adresse || 'Kankan'}<br>
          ${data.client.email ? `Email : ${data.client.email}<br>` : ''}
          Ville : ${data.client.ville || 'Kankan'}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Désignation Article</th>
          <th>Modèle / Variante</th>
          <th style="text-align: center;">Qté</th>
          <th style="text-align: right;">Prix Unitaire</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.lignes
          .map(
            (l) => `
          <tr>
            <td><strong>${l.designation}</strong></td>
            <td>${l.varianteInfo || 'Standard'}</td>
            <td style="text-align: center;">${l.quantite}</td>
            <td style="text-align: right;">${formatGNF(l.prixUnitaire)}</td>
            <td>${formatGNF(l.totalLigne)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals-area">
      <div class="totals-table">
        <div class="totals-row">
          <span>Sous-total HT :</span>
          <span>${formatGNF(data.total)}</span>
        </div>
        <div class="totals-row">
          <span>Mode de paiement :</span>
          <span style="font-weight: 700;">${data.modePaiement}</span>
        </div>
        <div class="totals-row paid">
          <span>Montant Réglé :</span>
          <span>${formatGNF(data.montantPaye)}</span>
        </div>
        ${
          data.montantRestant > 0
            ? `
          <div class="totals-row rest">
            <span>Reste à payer :</span>
            <span>${formatGNF(data.montantRestant)}</span>
          </div>
        `
            : ''
        }
        <div class="totals-row grand-total">
          <span>Total TTC :</span>
          <span style="color: #d97706;">${formatGNF(data.total)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Merci pour votre confiance et pour votre achat chez <strong>Sidibe Multi-Services</strong> !</p>
      <p>Pour tout règlement à distance Orange Money Guinée :</p>
      <div class="orange-money-box">
        🟠 Code Marchand Orange Money : <strong>622 48 81 61</strong> (Composez le *144*4*4#)
      </div>
      <p style="margin-top: 15px; font-size: 10px; color: #94a3b8;">
        Les marchandises vendues ne sont ni reprises ni échangées après 48 heures.
      </p>
    </div>
  </div>

  <script>
    // Déclenchement automatique de l'impression
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Génère le lien WhatsApp avec message formaté de la facture
 */
export function getWhatsAppInvoiceUrl(data: InvoiceData): string {
  const phone = (data.client.telephone || '').replace(/[^0-9]/g, '');
  // Formatage indicatif Guinée (+224)
  const formattedPhone = phone.startsWith('224') ? phone : `224${phone}`;

  const message = `Bonjour ${data.client.nom},\n\nVoici votre facture de chez *Sidibe Multi-Services* (${data.boutique.nom}) :\n\n📄 *Facture N° :* ${data.numeroFacture}\n🔖 *Réf Vente :* ${data.referenceVente}\n📅 *Date :* ${new Date(data.dateFacture).toLocaleDateString('fr-FR')}\n\n*Articles commandés :*\n${data.lignes.map((l) => `• ${l.designation} (${l.varianteInfo || 'Standard'}) x${l.quantite} = ${formatGNF(l.totalLigne)}`).join('\n')}\n\n💰 *Total :* ${formatGNF(data.total)}\n✅ *Montant réglé :* ${formatGNF(data.montantPaye)}${data.montantRestant > 0 ? `\n⚠️ *Reste à payer :* ${formatGNF(data.montantRestant)}` : ''}\n💳 *Mode :* ${data.modePaiement}\n\n🟠 *Paiement Orange Money :* Code Marchand 622 48 81 61\n\nMerci pour votre fidélité ! Pour toute question, contactez-nous au ${data.boutique.telephone || '+224 622 48 81 61'}.`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien Email (mailto) avec récapitulatif complet de la facture
 */
export function getEmailInvoiceUrl(data: InvoiceData): string {
  const email = data.client.email || '';
  const subject = `Facture ${data.numeroFacture} — Sidibe Multi-Services`;
  const body = `Bonjour ${data.client.nom},\n\nVeuillez trouver ci-dessous le récapitulatif de votre achat auprès de Sidibe Multi-Services (${data.boutique.nom}) :\n\nNuméro de Facture : ${data.numeroFacture}\nDate : ${new Date(data.dateFacture).toLocaleDateString('fr-FR')}\nBoutique : ${data.boutique.nom} (${data.boutique.ville || 'Kankan'})\n\nDétail des articles :\n${data.lignes.map((l) => `- ${l.designation} (${l.varianteInfo || 'Standard'}) x${l.quantite} : ${formatGNF(l.totalLigne)}`).join('\n')}\n\nMontant Total : ${formatGNF(data.total)}\nMontant Payé : ${formatGNF(data.montantPaye)}\n${data.montantRestant > 0 ? `Reste Dû : ${formatGNF(data.montantRestant)}\n` : ''}Mode de paiement : ${data.modePaiement}\n\nCode Marchand Orange Money Guinée : 622 48 81 61\n\nCordialement,\nService Commercial Sidibe Multi-Services\n${data.boutique.telephone || '+224 622 48 81 61'}`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
