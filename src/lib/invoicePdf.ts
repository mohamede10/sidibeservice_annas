// src/lib/invoicePdf.ts
// Génération de factures PDF professionnelles, téléchargement et envoi WhatsApp / Email pour Sidibe Multi-Services

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
 * Génère le document PDF vectoriel de haute qualité avec jsPDF
 */
export function generateInvoicePdfDoc(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2; // 182mm

  // 1. Bandeau supérieur ambre / doré
  doc.setFillColor(217, 119, 6);
  doc.rect(marginX, 12, usableWidth, 2, 'F');

  // 2. En-tête : Marque & Coordonnées
  let currentY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('SIDIBE', marginX, currentY);

  const sidibeWidth = doc.getTextWidth('SIDIBE ');
  doc.setTextColor(217, 119, 6); // Ambre / Or
  doc.text('MULTI-SERVICES', marginX + sidibeWidth, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Décoration d'Intérieur • Tapis de Luxe • Rideaux • Linge de Lit", marginX, currentY);

  currentY += 4.5;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const boutiqueInfo = `Boutique : ${data.boutique.nom}${data.boutique.codeBoutique ? ` (${data.boutique.codeBoutique})` : ''} • ${data.boutique.adresse || 'Centre Commercial'} • ${data.boutique.ville || 'Kankan'}`;
  doc.text(boutiqueInfo, marginX, currentY);

  currentY += 4.5;
  doc.text(`Tél : ${data.boutique.telephone || '+224 622 48 81 61'}`, marginX, currentY);

  // 3. Encadré d'identification de facture (Côté droit)
  const isPaid = data.montantRestant <= 0;
  const badgeText = isPaid ? 'FACTURE PAYÉE' : 'AVOIR / CRÉDIT';
  const badgeWidth = 42;
  const badgeHeight = 7;
  const rightBoxX = pageWidth - marginX - badgeWidth;

  // Badge de statut
  if (isPaid) {
    doc.setFillColor(220, 252, 231); // Vert clair
    doc.setDrawColor(187, 247, 208);
    doc.setTextColor(22, 101, 52); // Vert foncé
  } else {
    doc.setFillColor(254, 243, 199); // Ambre clair
    doc.setDrawColor(253, 230, 138);
    doc.setTextColor(146, 64, 14); // Ambre foncé
  }
  doc.roundedRect(rightBoxX, 18, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(badgeText, rightBoxX + badgeWidth / 2, 22.5, { align: 'center' });

  // Numéro de facture
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(data.numeroFacture, pageWidth - marginX, 31, { align: 'right' });

  // Date et Référence
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date(data.dateFacture).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Date : ${dateStr}`, pageWidth - marginX, 36, { align: 'right' });
  doc.text(`Réf. Vente : ${data.referenceVente}`, pageWidth - marginX, 40.5, { align: 'right' });

  // Ligne de séparation
  currentY = 46;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // 4. Cartouches Vendeur et Client
  currentY += 4;
  const colWidth = (usableWidth - 8) / 2; // 87mm
  const boxHeight = 27;

  // Box Vendeur
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('ÉMISE PAR (VENDEUR)', marginX + 4, currentY + 5);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.boutique.nom, marginX + 4, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ville : ${data.boutique.ville || 'Kankan'}`, marginX + 4, currentY + 15);
  doc.text(`Contact : ${data.boutique.telephone || '+224 622 48 81 61'}`, marginX + 4, currentY + 19.5);
  if (data.vendeurNom) {
    doc.text(`Servi par : ${data.vendeurNom}`, marginX + 4, currentY + 24);
  }

  // Box Client
  const clientBoxX = marginX + colWidth + 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(clientBoxX, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CLIENT FACTURÉ', clientBoxX + 4, currentY + 5);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.client.nom, clientBoxX + 4, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tél : ${data.client.telephone || 'Non renseigné'}`, clientBoxX + 4, currentY + 15);
  doc.text(`Adresse : ${data.client.adresse || 'Kankan'} • ${data.client.ville || 'Kankan'}`, clientBoxX + 4, currentY + 19.5);
  if (data.client.email) {
    doc.text(`Email : ${data.client.email}`, clientBoxX + 4, currentY + 24);
  }

  // 5. Tableau des articles avec jspdf-autotable
  const tableStartY = currentY + boxHeight + 6;
  const tableHead = [['Désignation Article', 'Variante / Détail', 'Qté', 'Prix Unitaire', 'Total']];
  const tableBody = data.lignes.map((l) => [
    l.designation,
    l.varianteInfo || 'Standard',
    String(l.quantite),
    formatGNF(l.prixUnitaire),
    formatGNF(l.totalLigne),
  ]);

  const runAutoTable = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;
  runAutoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 40 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || (tableStartY + 30);

  // 6. Section des Totaux
  const totalsWidth = 78;
  const totalsX = pageWidth - marginX - totalsWidth;
  let totY = finalY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Sous-total HT :', totalsX, totY);
  doc.text(formatGNF(data.total), pageWidth - marginX, totY, { align: 'right' });

  totY += 5;
  doc.text('Mode de règlement :', totalsX, totY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.modePaiement, pageWidth - marginX, totY, { align: 'right' });

  totY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Montant Réglé :', totalsX, totY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatGNF(data.montantPaye), pageWidth - marginX, totY, { align: 'right' });

  if (data.montantRestant > 0) {
    totY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Reste à payer :', totalsX, totY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(formatGNF(data.montantRestant), pageWidth - marginX, totY, { align: 'right' });
  }

  totY += 4;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(totalsX, totY, pageWidth - marginX, totY);

  totY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL TTC :', totalsX, totY);
  doc.setTextColor(217, 119, 6);
  doc.text(formatGNF(data.total), pageWidth - marginX, totY, { align: 'right' });

  // 7. Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = Math.max(totY + 14, pageHeight - 32);

  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Merci pour votre confiance et pour votre achat chez Sidibe Multi-Services !',
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(pageWidth / 2 - 55, footerY + 8, 110, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.text(
    '🟠 Orange Money Guinée : Code Marchand 622 48 81 61 (*144*4*4#)',
    pageWidth / 2,
    footerY + 12.5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Les marchandises vendues ne sont ni reprises ni échangées après 48 heures.',
    pageWidth / 2,
    footerY + 20,
    { align: 'center' }
  );

  return doc;
}

/**
 * Télécharge directement le fichier PDF de la facture sur l'appareil
 */
export function downloadInvoicePdf(data: InvoiceData): void {
  const doc = generateInvoicePdfDoc(data);
  const safeNumber = data.numeroFacture.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Facture_${safeNumber}.pdf`;
  doc.save(fileName);
  emitToast(`Facture ${fileName} téléchargée en PDF avec succès.`, 'success', 'PDF Généré');
}

/**
 * Envoie la facture au format PDF sur WhatsApp.
 * - Sur mobile / navigateur compatible Web Share (fichiers) :
 *   Partage directement le document PDF généré dans WhatsApp.
 * - Sur ordinateur / navigateur classique :
 *   Télécharge automatiquement le fichier PDF sur la machine,
 *   ouvre la discussion WhatsApp Web / Desktop avec le message d'introduction pré-rempli,
 *   et guide l'utilisateur avec un toast pour glisser le PDF dans la discussion.
 */
export async function sendInvoiceViaWhatsApp(data: InvoiceData): Promise<{
  success: boolean;
  mode: 'shared' | 'downloaded_and_opened';
}> {
  const doc = generateInvoicePdfDoc(data);
  const safeNumber = data.numeroFacture.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Facture_${safeNumber}.pdf`;

  const phone = (data.client.telephone || '').replace(/[^0-9]/g, '');
  const formattedPhone = phone
    ? phone.startsWith('224')
      ? phone
      : `224${phone}`
    : '';

  const accompagnementMessage = `Bonjour *${data.client.nom}*,\n\nVeuillez trouver ci-joint votre *facture officielle en format PDF* de chez *Sidibe Multi-Services* (${data.boutique.nom}).\n\n📄 *Facture N° :* ${data.numeroFacture}\n🔖 *Réf Vente :* ${data.referenceVente}\n📅 *Date :* ${new Date(data.dateFacture).toLocaleDateString('fr-FR')}\n💰 *Total TTC :* ${formatGNF(data.total)}\n✅ *Montant réglé :* ${formatGNF(data.montantPaye)}${data.montantRestant > 0 ? `\n⚠️ *Reste à payer :* ${formatGNF(data.montantRestant)}` : ''}\n💳 *Mode :* ${data.modePaiement}\n\n🟠 *Paiement Orange Money :* Code Marchand 622 48 81 61 (*144*4*4#)\n\nMerci pour votre fidélité ! Pour toute question, contactez-nous au ${data.boutique.telephone || '+224 622 48 81 61'}.`;

  const waUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(accompagnementMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(accompagnementMessage)}`;

  // Tente le partage natif de fichier PDF (Mobile / PWA / Web Share API)
  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      await navigator.share({
        files: [pdfFile],
        title: `Facture ${data.numeroFacture} - Sidibe Multi-Services`,
        text: `Bonjour ${data.client.nom}, voici votre facture officielle PDF (N° ${data.numeroFacture}) de Sidibe Multi-Services.`,
      });
      emitToast('Facture PDF transmise vers WhatsApp avec succès !', 'success', 'WhatsApp');
      return { success: true, mode: 'shared' };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, mode: 'shared' };
    }
    console.warn('Partage de fichier direct non supporté, basculement en mode téléchargement + discussion:', err);
  }

  // Repli Desktop / Navigateurs classiques :
  // 1. Télécharge automatiquement le fichier PDF
  doc.save(fileName);

  // 2. Ouvre WhatsApp avec le contact et le message pré-rempli
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }

  // 3. Notification d'assistance claire
  emitToast(
    `La facture PDF "${fileName}" a été téléchargée ! La discussion WhatsApp s'est ouverte : il vous suffit de glisser le fichier PDF dans la discussion pour l'envoyer.`,
    'success',
    'Facture PDF prête pour WhatsApp'
  );

  return { success: true, mode: 'downloaded_and_opened' };
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
 * Génère le lien WhatsApp avec message formaté de la facture (utilisé si besoin)
 */
export function getWhatsAppInvoiceUrl(data: InvoiceData): string {
  const phone = (data.client.telephone || '').replace(/[^0-9]/g, '');
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
