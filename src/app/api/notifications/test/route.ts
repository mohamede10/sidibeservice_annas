import { NextRequest, NextResponse } from 'next/server';
import { sendSms, ADMIN_PHONE_SMS } from '@/lib/sms';
import { sendEmail, ADMIN_EMAIL } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { canal = 'EMAIL', to } = body;

    if (canal === 'SMS') {
      const destinataire = to || ADMIN_PHONE_SMS;
      const resSms = await sendSms({
        to: destinataire,
        type: 'COMMANDE_CLIENT',
        titre: 'Test Alerte SMS Sidibe Services',
        message: '🔔 Ceci est un test de notification SMS automatique depuis votre ERP Sidibe Services (Guinée) !',
        reference: 'TEST-SMS',
      });

      return NextResponse.json({
        success: true,
        message: `Notification SMS test envoyée avec succès vers ${destinataire}`,
        result: resSms,
      });
    }

    // Par défaut : EMAIL
    const destinataireEmail = to || ADMIN_EMAIL;
    const resMail = await sendEmail({
      to: destinataireEmail,
      subject: '✅ Test de Notification Email - Sidibe Services',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #fff; border-radius: 12px;">
          <h2 style="color: #f59e0b; margin-top: 0;">Test d'Email Réussi !</h2>
          <p>Bonjour cher Administrateur,</p>
          <p>Ce message confirme que le service d'envoi d'emails automatique de votre ERP <strong>Sidibe Services</strong> est correctement configuré et opérationnel.</p>
          <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Vous recevrez désormais des alertes automatiques lors d'une <strong>nouvelle commande client</strong>, d'un <strong>versement de caisse</strong> ou d'un <strong>stock faible (&le; 10 unités)</strong>.
            </p>
          </div>
          <p style="font-size: 11px; color: #64748b; margin-top: 25px;">
            SIDIBE SERVICES • Kankan • Siguiri • Conakry — République de Guinée
          </p>
        </div>
      `,
      type: 'COMMANDE_CLIENT',
      reference: 'TEST-EMAIL',
    });

    return NextResponse.json({
      success: true,
      message: `Notification Email test envoyée avec succès vers ${destinataireEmail}`,
      result: resMail,
    });
  } catch (error: any) {
    console.error('Erreur test notification:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors du test de notification' },
      { status: 500 }
    );
  }
}

