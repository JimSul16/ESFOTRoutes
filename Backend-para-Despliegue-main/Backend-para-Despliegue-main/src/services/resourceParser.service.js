import axios from 'axios';
import * as cheerio from 'cheerio';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export const prepareResourceForGemini = async (resource) => {
  try {
    if (!resource.url) return '';
    let parsedUrl;
    try {
      parsedUrl = new URL(resource.url);
    } catch {
      return `\n[Aviso: URL inválida para ${resource.title}]\n`;
    }
    
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return `\n[Aviso: Protocolo no permitido para ${resource.title}]\n`;
    }

    const hostname = parsedUrl.hostname;
    const isPrivateIp = /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)|(^169\.254\.)/.test(hostname) || hostname === 'localhost';
    
    if (isPrivateIp) {
      return `\n[Aviso: IP privada no permitida para ${resource.title}]\n`;
    }

    if (resource.type === 'VIDEO') {
      return `\n--- Video de YouTube: ${resource.title} ---\nEnlace: ${resource.url}\n`;
    }

    if (resource.type === 'LINK') {
      const response = await axios.get(resource.url, { timeout: 5000 });
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header, aside, svg, iframe, noscript, form, button').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      return `\n--- Artículo Web: ${resource.title} ---\n${text.substring(0, 50000)}\n`;
    }

    if (resource.type === 'PDF') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(resource.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const buffer = await response.arrayBuffer();
      const data = await pdfParse(Buffer.from(buffer));
      return `\n--- Documento PDF: ${resource.title} ---\n${data.text.substring(0, 150000)}\n`;
    }

    if (resource.type === 'IMAGE') {
      return `\n--- Imagen referencial: ${resource.title} ---\nEnlace: ${resource.url}\n`;
    }

    return '';
  } catch (error) {
    console.error(`Error al procesar el recurso ${resource.title}:`, error);
    return `\n[Aviso: No se pudo extraer el texto de ${resource.title}]\n`;
  }
};