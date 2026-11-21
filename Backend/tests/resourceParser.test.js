/**
 * Extracción de texto de recursos PDF para el tutor y las evaluaciones.
 *
 * Regresión: con pdf-parse 2.x la llamada `require('pdf-parse')(buffer)`
 * fallaba con "pdfParse is not a function" y ningún PDF aportaba contenido.
 */
import { jest } from '@jest/globals';

const { prepareResourceForGemini } = await import('../src/services/resourceParser.service.js');

/** PDF mínimo válido de una página con el texto "Hola VLSM ESFOT". */
const buildPdf = () => {
  const stream = 'BT /F1 18 Tf 20 80 Td (Hola VLSM ESFOT) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

describe('prepareResourceForGemini — PDF', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  test('extrae el texto del PDF', async () => {
    globalThis.fetch = jest.fn(async () => new Response(buildPdf()));
    const out = await prepareResourceForGemini({ title: 'Guía', type: 'PDF', url: 'https://example.com/guia.pdf' });
    expect(out).toContain('--- Documento PDF: Guía ---');
    expect(out).toContain('Hola VLSM ESFOT');
  });

  test('un PDF corrupto devuelve un aviso, no rompe el flujo', async () => {
    globalThis.fetch = jest.fn(async () => new Response(Buffer.from('no es un pdf')));
    const out = await prepareResourceForGemini({ title: 'Roto', type: 'PDF', url: 'https://example.com/roto.pdf' });
    expect(out).toContain('No se pudo extraer el texto de Roto');
  });
});
