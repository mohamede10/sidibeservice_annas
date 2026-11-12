/** Export CSV compatible Excel (UTF-8 BOM + séparateur `;` pour Excel FR). */

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function stampFilename(base: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const sep = ';';
  const lines = [
    headers.map(escapeCsvCell).join(sep),
    ...rows.map((row) => row.map(escapeCsvCell).join(sep)),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvSections(
  filename: string,
  sections: Array<{ title?: string; headers: string[]; rows: Array<Array<string | number | boolean | null | undefined>> }>
): void {
  const sep = ';';
  const lines: string[] = [];
  sections.forEach((section, i) => {
    if (i > 0) lines.push('');
    if (section.title) lines.push(escapeCsvCell(section.title));
    lines.push(section.headers.map(escapeCsvCell).join(sep));
    section.rows.forEach((row) => lines.push(row.map(escapeCsvCell).join(sep)));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
