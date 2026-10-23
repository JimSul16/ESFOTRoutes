import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { toast } from 'react-toastify';
import { getResources } from '../../../api/resource.api';
import { uploadCoverImage } from '../../../api/upload.api';
import RouteBuilder from './RouteBuilder';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../api/resource.api', () => ({ getResources: vi.fn() }));
vi.mock('../../../api/route.api', () => ({ createRoute: vi.fn(), updateRoute: vi.fn() }));
vi.mock('../../../api/upload.api', () => ({ uploadCoverImage: vi.fn() }));

const mockGetResources = vi.mocked(getResources);
const mockUploadCoverImage = vi.mocked(uploadCoverImage);
const mockToastError = vi.mocked(toast.error);

/** jsdom no implementa la API de blobs: se sustituye por un stub estable. */
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock-portada'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
});

/** Crea un archivo con el tamaño forzado (evita reservar 5 MB en memoria). */
const archivo = (nombre: string, tipo: string, size = 1024) => {
  const file = new File(['contenido'], nombre, { type: tipo });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderBuilder = () => {
  const utils = render(
    <RouteBuilder initialData={null} onCancel={vi.fn()} onSaveSuccess={vi.fn()} />
  );
  const input = utils.container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  return { ...utils, input };
};

describe('RouteBuilder — validación del archivo de portada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetResources.mockResolvedValue([]);
  });

  /**
   * Regresión: el input solo llevaba `accept="image/*"`, que únicamente orienta
   * al explorador de archivos. El usuario todavía podía elegir "Todos los
   * archivos" y subir un PDF al endpoint de portada.
   */
  it('rechaza un archivo que no es una imagen', async () => {
    const { input } = renderBuilder();
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled());

    fireEvent.change(input, {
      target: { files: [archivo('guia.pdf', 'application/pdf')] },
    });

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('imagen'));
    expect(screen.queryByAltText('Portada')).toBeNull();
    expect(mockUploadCoverImage).not.toHaveBeenCalled();
  });

  it('rechaza un PDF aunque el navegador no informe el tipo MIME', async () => {
    const { input } = renderBuilder();
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled());

    fireEvent.change(input, {
      target: { files: [archivo('guia.pdf', '')] },
    });

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('imagen'));
    expect(mockUploadCoverImage).not.toHaveBeenCalled();
  });

  it('rechaza una imagen que supera los 5 MB', async () => {
    const { input } = renderBuilder();
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled());

    fireEvent.change(input, {
      target: { files: [archivo('portada.png', 'image/png', 6 * 1024 * 1024)] },
    });

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('5 MB'));
    expect(screen.queryByAltText('Portada')).toBeNull();
    expect(mockUploadCoverImage).not.toHaveBeenCalled();
  });

  it('acepta una imagen válida y muestra la vista previa', async () => {
    const { input } = renderBuilder();
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled());

    fireEvent.change(input, {
      target: { files: [archivo('portada.png', 'image/png')] },
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(screen.getByAltText('Portada')).toBeTruthy();
  });
});
