export function getFeatureFlags() {
  return {
    previewCountries: process.env.ENABLE_PREVIEW_COUNTRIES !== 'false',
    pdfExport: process.env.ENABLE_PDF_EXPORT === 'true',
  };
}
