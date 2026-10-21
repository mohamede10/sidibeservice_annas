//src\components\PWAInstall.tsx
'use client';
import '@khmyznikov/pwa-install';

export default function PWAInstall() {
  return <pwa-install manifest-url="/manifest.json"></pwa-install>;
}