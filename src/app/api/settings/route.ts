import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const defaultSettings = {
  companyName: 'SIDIBE SERVICES',
  logoUrl: '/img/logo.jpeg',
  description: 'Décoration, rideaux, linge de lit, tapis et mobilier en Guinée',
  telephone: '+224 622 48 81 61',
  email: 'sidibeoumar413@gmail.com',
  adresse: 'Kankan • Siguiri • Conakry — République de Guinée',
};

function getSettingsFilePath() {
  return path.join(process.cwd(), 'public', 'settings.json');
}

export async function GET() {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const settings = JSON.parse(content);
      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ success: true, settings: defaultSettings });
  } catch (error: any) {
    console.error('Erreur lecture settings:', error);
    return NextResponse.json({ success: true, settings: defaultSettings });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filePath = getSettingsFilePath();

    let current = defaultSettings;
    if (fs.existsSync(filePath)) {
      try {
        current = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        // ignore
      }
    }

    const updated = {
      ...current,
      ...body,
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('Erreur sauvegarde settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}

