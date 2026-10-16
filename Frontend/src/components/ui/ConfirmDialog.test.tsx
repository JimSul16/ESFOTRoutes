import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './index';

describe('ConfirmDialog', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Mensaje"
      />
    );
    expect(screen.queryByText('Mensaje')).toBeNull();
  });

  it('usa los textos por defecto', () => {
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro de que deseas continuar?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('acepta textos personalizados', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Eliminar ruta"
        message="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Mejor no"
      />
    );

    expect(screen.getByText('Eliminar ruta')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mejor no' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('llama a onConfirm al confirmar', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('llama a onClose al cancelar', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('muestra "Procesando..." y deshabilita los botones de acción mientras carga', () => {
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} isLoading />);

    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const confirmar = screen.getByRole('button', { name: 'Procesando...' });

    expect(cancelar).toBeDisabled();
    expect(confirmar).toBeDisabled();
  });

  it('aplica la variante indicada al botón de confirmación', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        variant="primary"
        confirmText="Aceptar"
      />
    );

    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveClass('bg-primary-600');
  });
});