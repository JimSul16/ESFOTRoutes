import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  PageHeader,
  Skeleton,
  type BadgeVariant,
} from '@/components/ui';
import { getResources, deleteResource } from '../../../api/resource.api';
import { getApiErrorMessage } from '../../../api/errors';
import ResourceBuilder from './ResourceBuilder';
import type { Resource } from '../../../types';

type ResourceFilterType = 'ALL' | 'PDF' | 'VIDEO' | 'LINK' | 'IMAGE';

const sanitizeUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '#';
};

const TYPE_TONES: Record<string, BadgeVariant> = {
  VIDEO: 'warning',
  PDF: 'accent',
  IMAGE: 'brand',
  LINK: 'default',
  DOCUMENT: 'accent',
};

const ResourcesManager = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceFilterType>('ALL');

  const filteredResources = resources.filter((res) => {
    const matchesType = typeFilter === 'ALL' || res.type === typeFilter;
    if (!matchesType) return false;
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    const titleMatch = res.title.toLowerCase().includes(term);
    const descMatch = (res.description ?? '').toLowerCase().includes(term);
    return titleMatch || descMatch;
  });

  const hasActiveFilter = searchQuery.trim().length > 0 || typeFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
  };

  useEffect(() => {
    let cancelled = false;

    const loadResources = async () => {
      setFetching(true);
      try {
        const data = await getResources();
        if (!cancelled) setResources(data);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'Error al cargar los recursos'));
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    loadResources();

    return () => {
      cancelled = true;
    };
    // `reloadKey` solo dispara el refresco tras una mutación.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [reloadKey]);

  const refreshResources = () => setReloadKey((key) => key + 1);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este recurso?')) return;
    try {
      await deleteResource(id);
      toast.success('Recurso eliminado exitosamente');
      refreshResources();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el recurso'));
    }
  };

  const handleCreateNew = () => {
    setResourceToEdit(null);
    setCurrentView('form');
  };

  const handleEdit = (resource: Resource) => {
    setResourceToEdit(resource);
    setCurrentView('form');
  };

  const handleFormClose = (wasSaved: boolean) => {
    setCurrentView('list');
    setResourceToEdit(null);
    if (wasSaved) {
      refreshResources();
    }
  };

  if (currentView === 'form') {
    return (
      <ResourceBuilder
        initialData={resourceToEdit}
        onCancel={() => handleFormClose(false)}
        onSaveSuccess={() => handleFormClose(true)}
      />
    );
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-6 pb-12 duration-300 sm:space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Gestión de Recursos"
        description="Catálogo centralizado de materiales y archivos para tus rutas."
        actions={
          <Button
            type="button"
            onClick={handleCreateNew}
            iconLeft={<Icon name="plus" className="h-4 w-4" />}
          >
            Agregar Nuevo Recurso
          </Button>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-surface-900 dark:text-white">
              Recursos Disponibles
            </h2>
            <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
              Materiales reutilizables en los módulos de las rutas.
            </p>
          </div>

          {!fetching && (
            <Badge variant={hasActiveFilter ? 'brand' : 'default'} size="sm">
              {hasActiveFilter
                ? `${filteredResources.length} de ${resources.length} recursos`
                : `${resources.length} ${resources.length === 1 ? 'recurso' : 'recursos'}`}
            </Badge>
          )}
        </CardHeader>

        {/* Barra de herramientas: Búsqueda y Filtro por Tipo */}
        {!fetching && resources.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-850/40 sm:flex-row sm:items-center sm:p-5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar recurso por título o descripción..."
                className="w-full rounded-control border border-surface-200 bg-white py-2 pl-9 pr-8 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ResourceFilterType)}
                aria-label="Filtrar por tipo"
                className="rounded-control border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">Enlace</option>
                <option value="IMAGE">Imagen</option>
              </select>

              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  iconLeft={<Icon name="x" className="h-3.5 w-3.5" />}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        )}

        {fetching ? (
          <ul aria-busy="true" className="divide-y divide-surface-100 dark:divide-surface-800">
            <span className="sr-only">Cargando catálogo de recursos…</span>
            {[0, 1, 2, 3].map((index) => (
              <li key={index} className="flex items-center gap-4 px-6 py-4">
                <Skeleton variant="rect" className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="w-1/3" />
                  <Skeleton className="w-1/4" />
                </div>
                <Skeleton className="hidden h-6 w-20 sm:block" />
              </li>
            ))}
          </ul>
        ) : resources.length === 0 ? (
          <EmptyState
            icon="bookOpen"
            title="No hay recursos guardados aún"
            description="Agrega PDFs, videos, imágenes o enlaces para enriquecer los módulos de tus rutas."
            action={
              <Button
                type="button"
                onClick={handleCreateNew}
                iconLeft={<Icon name="plus" className="h-4 w-4" />}
              >
                Agregar primer recurso
              </Button>
            }
          />
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon="search"
            title="No se encontraron recursos"
            description="No hay recursos que coincidan con los criterios de búsqueda seleccionados."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={handleClearFilters}
                iconLeft={<Icon name="refreshCw" className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead>
                <tr className="bg-surface-50 text-2xs uppercase tracking-wider text-surface-500 dark:bg-surface-850 dark:text-surface-400">
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Título
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Enlace / Archivo
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredResources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40"
                  >
                    <td className="max-w-[18rem] px-6 py-4">
                      <p
                        className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100"
                        title={resource.title}
                      >
                        {resource.title}
                      </p>
                      {resource.description && (
                        <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">
                          {resource.description}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={TYPE_TONES[resource.type] ?? 'default'} size="sm">
                        {resource.type}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <a
                        href={sanitizeUrl(resource.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        Ver Recurso
                        <Icon name="externalLink" className="h-3.5 w-3.5" />
                      </a>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(resource)}
                          aria-label={`Editar ${resource.title}`}
                          iconLeft={<Icon name="pencil" className="h-3.5 w-3.5" />}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(resource.id)}
                          aria-label={`Eliminar ${resource.title}`}
                          iconLeft={<Icon name="trash" className="h-3.5 w-3.5" />}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResourcesManager;
