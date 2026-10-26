import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModuleItem from './ModuleItem';
import type { Module } from '../../../../types';

const modulo = (over: Partial<Module> = {}): Module => ({
  id: 'mod-1',
  title: 'Primer módulo',
  description: 'Contenido del módulo',
  resources: [],
  ...over,
});

const renderItem = (over: Partial<Module> = {}, overProps = {}) =>
  render(
    <ModuleItem
      module={modulo(over)}
      index={0}
      isExpanded={false}
      isLast={false}
      onToggle={vi.fn()}
      onGenerateAssessment={vi.fn()}
      isGeneratingAssessment={false}
      {...overProps}
    />
  );

describe('ModuleItem — tipo pedagógico del módulo', () => {
  /**
   * Regresión: la clasificación no era excluyente, así que
   * "Módulo 3: Dominio Práctico de ..." pintaba a la vez
   * "Dominio Avanzado Acreditado" y "Consolidación Práctica": dos etiquetas
   * incompatibles en el mismo encabezado.
   */
  it('"Dominio Práctico" muestra una sola etiqueta', () => {
    renderItem({ title: 'Módulo 3: Dominio Práctico de Redes y TCP/IP' });

    expect(screen.getByText('Práctica consolidada')).toBeTruthy();
    expect(screen.queryByText('Dominio avanzado acreditado')).toBeNull();
    expect(screen.queryByText('Refuerzo sugerido')).toBeNull();
  });

  it('"Validación y Maestría Práctica" se clasifica como dominio acreditado', () => {
    renderItem({ title: 'Módulo 1: Validación y Maestría Práctica de Redes' });

    expect(screen.getByText('Dominio avanzado acreditado')).toBeTruthy();
    expect(screen.queryByText('Práctica consolidada')).toBeNull();
  });

  it('"Nivelación y Refuerzo Focalizado" se clasifica como refuerzo', () => {
    renderItem({ title: 'Módulo 2: Nivelación y Refuerzo Focalizado' });

    expect(screen.getByText('Refuerzo sugerido')).toBeTruthy();
    expect(screen.queryByText('Dominio avanzado acreditado')).toBeNull();
  });

  it('"Convalidación y Repaso de Conceptos Dominados" ignora los acentos', () => {
    renderItem({ title: 'Módulo 1: Convalidación y Repaso de Conceptos Dominados' });

    expect(screen.getByText('Dominio avanzado acreditado')).toBeTruthy();
  });

  it('un módulo de ruta troncal no lleva etiqueta de refuerzo ni de dominio', () => {
    renderItem({ title: 'Módulo 1: Introducción a Redes' });

    expect(screen.getByText('Módulo troncal')).toBeTruthy();
    expect(screen.queryByText('Refuerzo sugerido')).toBeNull();
    expect(screen.queryByText('Dominio avanzado acreditado')).toBeNull();
  });
});

describe('ModuleItem — estados y contenido', () => {
  it('muestra el estado "Completado" con la nota cuando el módulo está aprobado', () => {
    renderItem({ isPassed: true, score: 88 });

    expect(screen.getByText(/Completado · 88%/)).toBeTruthy();
  });

  it('el encabezado es un botón con aria-expanded', () => {
    renderItem({}, { isExpanded: true });

    expect(screen.getByRole('button', { expanded: true })).toBeTruthy();
  });

  it('expande y contrae el panel de recursos al pulsar el título', () => {
    const onToggle = vi.fn();
    render(
      <ModuleItem
        module={modulo({
          title: 'Módulo 1: Introducción a Redes',
          resources: [{ id: 'r1', title: 'Guía de redes', url: 'https://x.pdf', type: 'PDF' }],
        })}
        index={0}
        isExpanded={false}
        isLast={false}
        onToggle={onToggle}
        onGenerateAssessment={vi.fn()}
        isGeneratingAssessment={false}
      />
    );

    fireEvent.click(screen.getByText('Módulo 1: Introducción a Redes'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('colapsado muestra el resumen de la descripción', () => {
    renderItem({ description: 'Resumen del módulo para el estudiante' });

    expect(screen.getByText('Resumen del módulo para el estudiante')).toBeTruthy();
  });
});
