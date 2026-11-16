import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar, EmptyState, ProgressBar, StatCard, ThemeToggle } from './index';

describe('ProgressBar', () => {
  it('expone el progreso con semántica ARIA y lo limita a 0–100', () => {
    render(<ProgressBar value={150} label="Avance" showValue />);

    const bar = screen.getByRole('progressbar', { name: 'Avance' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calcula el porcentaje a partir de max', () => {
    render(<ProgressBar value={3} max={12} label="Módulos" showValue />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('trata valores no finitos como cero', () => {
    render(<ProgressBar value={Number.NaN} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('EmptyState', () => {
  it('renderiza título, descripción y acción', () => {
    render(
      <EmptyState
        title="Sin rutas"
        description="Aún no tienes rutas asignadas."
        action={<button type="button">Explorar</button>}
      />
    );

    expect(screen.getByRole('heading', { name: 'Sin rutas' })).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes rutas asignadas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('muestra etiqueta, valor y tendencia', () => {
    render(
      <StatCard
        label="Rutas activas"
        value={4}
        trend="+12%"
        trendDirection="up"
        hint="vs. mes anterior"
      />
    );

    expect(screen.getByText('Rutas activas')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('vs. mes anterior')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('usa las iniciales del nombre y lo expone a lectores de pantalla', () => {
    render(<Avatar name="Ana María Pérez" />);

    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByText('Ana María Pérez')).toBeInTheDocument();
  });

  it('renderiza la imagen con su texto alternativo', () => {
    render(<Avatar name="Ana Pérez" src="/ana.png" />);

    const image = screen.getByRole('img', { name: 'Ana Pérez' });
    expect(image).toHaveAttribute('src', '/ana.png');
  });
});

describe('ThemeToggle', () => {
  it('anuncia la acción contraria al tema actual y dispara onToggle', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ThemeToggle theme="light" onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Activar modo oscuro' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<ThemeToggle theme="dark" onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Activar modo claro' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
