import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier logo fourni' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Le fichier doit être une image valide (PNG, JPG, WEBP, SVG)' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Répertoire de destination dans public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.png';
    const fileName = `logo_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${fileName}`;

    // Mettre à jour settings.json
    const settingsPath = path.join(process.cwd(), 'public', 'settings.json');
    let currentSettings: any = {};
    if (fs.existsSync(settingsPath)) {
      try {
        currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch {
        // ignore
      }
    }

    currentSettings.logoUrl = logoUrl;
    fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Logo mis à jour avec succès',
    });
  } catch (error: any) {
    console.error('Erreur upload logo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mise à jour du logo' },
      { status: 500 }
    );
  }
}

