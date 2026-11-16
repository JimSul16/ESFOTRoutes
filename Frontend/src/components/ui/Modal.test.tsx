import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './index';

describe('Modal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('expone un diálogo accesible y enfoca el primer interactivo', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título" description="Descripción">
        <p>Contenido</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Título');
    expect(dialog).toHaveAccessibleDescription('Descripción');
    expect(screen.getByRole('button', { name: 'Cerrar modal' })).toHaveFocus();
  });

  it('usa aria-label cuando no hay título visible', () => {
    render(
      <Modal isOpen onClose={vi.fn()} aria-label="Detalle del recurso" hideCloseButton>
        <p>Contenido</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Detalle del recurso');
  });

  it('cierra con Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra con Escape cuando closeOnEscape es false', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Título" closeOnEscape={false}>
        <p>Contenido</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra al pulsar el fondo y no al pulsar el contenido', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Contenido'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('respeta closeOnBackdrop={false}', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Título" closeOnBackdrop={false}>
        <p>Contenido</p>
      </Modal>
    );

    fireEvent.click(screen.getByTestId('modal-backdrop'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('atrapa el foco entre el primer y el último elemento', () => {
    render(
      <Modal
        isOpen
        onClose={vi.fn()}
        title="Título"
        footer={<button type="button">Guardar</button>}
      >
        <button type="button">Primero</button>
      </Modal>
    );

    const close = screen.getByRole('button', { name: 'Cerrar modal' });
    const save = screen.getByRole('button', { name: 'Guardar' });

    // Shift+Tab en el primero debe saltar al último.
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();

    // Tab en el último debe volver al primero.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('bloquea el scroll del documento y lo restaura al cerrar', () => {
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('devuelve el foco al disparador al cerrarse', () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.textContent = 'Abrir';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    expect(screen.getByRole('button', { name: 'Cerrar modal' })).toHaveFocus();

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        <p>Contenido</p>
      </Modal>
    );

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
