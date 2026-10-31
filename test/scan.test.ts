import { describe, expect, it } from 'vitest';
import { vendorFromFileName } from '../src/lib/scan';

describe('vendorFromFileName', () => {
  it('reads Indonesian legal forms written before the name', () => {
    expect(vendorFromFileName('faktur-pt-sinar-abadi-okt.pdf')).toBe('PT Sinar Abadi');
    expect(vendorFromFileName('Faktur_Pajak_CV_Maju_Jaya_2026.pdf')).toBe('CV Maju Jaya');
    expect(vendorFromFileName('inv pt nusantara kreasi digital tbk q3.png')).toBe('PT Nusantara Kreasi Digital Tbk');
  });

  it('reads legal forms written after the name', () => {
    expect(vendorFromFileName('invoice-acme-solutions-pte-ltd-oct-2026.pdf')).toBe('Acme Solutions Pte. Ltd.');
    expect(vendorFromFileName('Tagihan Mega Data Sdn Bhd.jpg')).toBe('Mega Data Sdn. Bhd.');
    expect(vendorFromFileName('bill_cloudnine_inc.pdf')).toBe('Cloudnine Inc.');
  });

  it('returns null when the file name carries no company', () => {
    expect(vendorFromFileName('faktur-oktober.pdf')).toBeNull();
    expect(vendorFromFileName('scan_0001.pdf')).toBeNull();
    expect(vendorFromFileName('pt-2026.pdf')).toBeNull();
  });
});
