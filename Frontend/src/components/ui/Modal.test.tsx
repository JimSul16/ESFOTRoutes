import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './index';

/**
 * El overlay es el ancestro dos niveles arriba del contenido:
 * overlay > wrapper > body > children
 */
const overlayOf = (el: HTMLElement): HTMLElement => {
  const overlay = el.parentElement?.parentElement;
  if (!overlay) throw new Error('No se encontró el overlay del modal');
  return overlay;
};

afterEach(() => {
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="T">
        Contenido
      </Modal>
    );
    expect(screen.queryByText('Contenido')).toBeNull();
    expect(screen.queryByText('T')).toBeNull();
  });

  it('renderiza el contenido en un portal sobre document.body', () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        Contenido
      </Modal>
    );

    // El contenido vive en document.body, no en el contenedor del render.
    expect(container).toBeEmptyDOMElement();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('bloquea el scroll del body mientras está abierto y lo restaura al cerrar', () => {
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()}>
        Contenido
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={vi.fn()}>
        Contenido
      </Modal>
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('se cierra con la tecla Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        Contenido
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignora otras teclas', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        Contenido
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('se cierra al hacer click en el fondo', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        Contenido
      </Modal>
    );

    fireEvent.click(overlayOf(screen.getByText('Contenido')));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NO se cierra al hacer click dentro del contenido', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <button>Interior</button>
      </Modal>
    );

    fireEvent.click(screen.getByText('Interior'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('se cierra con el botón de la cabecera cuando hay título', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Con título">
        Contenido
      </Modal>
    );

    const cerrar = screen.getByRole('button');
    fireEvent.click(cerrar);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('limpia el listener al desmontar', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal isOpen onClose={onClose}>
        Contenido
      </Modal>
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});