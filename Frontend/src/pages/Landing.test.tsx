import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

const montar = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );

const texto = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Colores fuera del sistema de diseño (`@theme` en src/index.css). */
const coloresFueraDePaleta = (html: string) =>
  html.match(/(?:rose|emerald|purple|cyan|lime|fuchsia|sky|indigo)-\d{2,3}/g) ?? [];

/** Sube desde un elemento hasta <section> buscando un centrado heredado. */
const tieneCentradoHeredado = (el: HTMLElement) => {
  let node = el.parentElement;
  while (node && node.tagName !== 'SECTION' && node.tagName !== 'BODY') {
    if (typeof node.className === 'string' && node.className.includes('text-center')) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
};

describe('Landing', () => {
  it('renderiza el titular y todas las secciones con su copy', () => {
    montar();

    expect(
      texto(screen.getByRole('heading', { level: 1 })),
    ).toContain('Domina tu malla curricular con rutas de aprendizaje inteligentes');

    for (const titulo of [
      'Diseñado para la excelencia en ingeniería',
      'Cómo funciona tu camino de aprendizaje',
      'Desarrollado en la ESFOT',
      'Potencia tu rendimiento académico',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeTruthy();
    }

    expect(screen.getByText('50+')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
    expect(screen.getByText('Jimmy Lucero')).toBeTruthy();
    expect(screen.getByText('David Cajamarca')).toBeTruthy();
  });

  it('expone los enlaces de navegación ancla y de ruta', () => {
    montar();

    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h): h is string => h !== null);

    for (const esperado of ['/login', '/register', '#caracteristicas', '#como-funciona', '#equipo']) {
      expect(hrefs).toContain(esperado);
    }
  });

  it('usa exclusivamente la paleta de colores del sistema (Spec S3)', () => {
    const { container } = montar();

    expect(coloresFueraDePaleta(container.innerHTML)).toEqual([]);
  });

  it('alinea el bloque del titular a la izquierda, sin text-center heredado (Spec S4)', () => {
    montar();

    expect(tieneCentradoHeredado(screen.getByRole('heading', { level: 1 }))).toBe(false);
  });

  it('no centra ningún encabezado de sección (Spec S5: ritmo asimétrico)', () => {
    montar();

    const encabezados = screen.getAllByRole('heading', { level: 2 });
    expect(encabezados.length).toBeGreaterThanOrEqual(4);
    for (const encabezado of encabezados) {
      expect(tieneCentradoHeredado(encabezado)).toBe(false);
    }
  });
});
