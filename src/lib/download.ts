/** Triggers a client-side file download. */
export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal RFC 4180 CSV serialiser with spreadsheet formula-injection protection. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const raw = String(v ?? '');
          const safe = typeof v !== 'number' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(','),
    )
    .join('\n');
}
