import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  Skeleton,
  type IconName,
} from '@/components/ui';
import {
  getResourceCatalog,
  type CatalogResourceItem,
  type CatalogQuery,
} from '@/api';
import { getApiErrorMessage } from '@/api/errors';

type ResourceFilterType = 'ALL' | 'LINK' | 'PDF' | 'VIDEO' | 'IMAGE' | 'DOCUMENT';

const getTypeIcon = (type: string): IconName => {
  switch (type) {
    case 'VIDEO':
      return 'circlePlay';
    case 'PDF':
    case 'DOCUMENT':
      return 'fileText';
    case 'IMAGE':
      return 'image';
    case 'LINK':
    default:
      return 'externalLink';
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'VIDEO':
      return 'Video';
    case 'PDF':
      return 'PDF';
    case 'DOCUMENT':
      return 'Documento';
    case 'IMAGE':
      return 'Imagen';
    case 'LINK':
      return 'Enlace';
    default:
      return type;
  }
};

const ResourcesCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceFilterType>('ALL');

  const [resources, setResources] = useState<CatalogResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query: CatalogQuery = {};
    if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
    if (selectedType !== 'ALL') query.type = selectedType;

    getResourceCatalog(query)
      .then((res) => {
        if (!cancelled) {
          setResources(res.resources || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'No se pudo cargar el catálogo de recursos.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedType]);

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedType('ALL');
  };

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-6 pb-12 duration-300 sm:space-y-8">
      <PageHeader
        eyebrow="Biblioteca"
        title="Catálogo de Recursos"
        description="Explora materiales didácticos, enlaces, guías y documentación académica validada por la facultad."
      />

      {/* Barra de filtros */}
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-0">
            <Input
              type="search"
              placeholder="Buscar recursos por título o descripción…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar en el catálogo"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="resource-type-filter" className="sr-only">
              Filtrar por tipo
            </label>
            <select
              id="resource-type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ResourceFilterType)}
              className="h-[42px] rounded-control border border-surface-200 bg-surface-50 px-3 text-sm text-surface-700 transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-focus/25 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-200"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="PDF">PDF</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Enlace web</option>
              <option value="IMAGE">Imagen</option>
              <option value="DOCUMENT">Documento</option>
            </select>

            {(searchTerm || selectedType !== 'ALL') && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 pt-1 border-t border-surface-100 dark:border-surface-800">
          <span>
            {resources.length} {resources.length === 1 ? 'recurso disponible' : 'recursos disponibles'}
          </span>
          {debouncedSearch && <span>Filtro activo: &ldquo;{debouncedSearch}&rdquo;</span>}
        </div>
      </Card>

      {/* Estado de carga */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <Card key={idx} padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card padding="md" role="alert" className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <Icon name="circleAlert" className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">{error}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm((s) => s);
                  setDebouncedSearch((s) => s);
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Vacío */}
      {!loading && !error && resources.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon="search"
            title="No se encontraron recursos"
            description={
              searchTerm || selectedType !== 'ALL'
                ? 'Prueba con otros términos de búsqueda o cambiando el filtro de tipo.'
                : 'Aún no hay recursos publicados en el catálogo institucional.'
            }
            action={
              searchTerm || selectedType !== 'ALL' ? (
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  Restablecer filtros
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {/* Grid de recursos */}
      {!loading && !error && resources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((item) => {
            const iconName = getTypeIcon(item.type);
            const typeLabel = getTypeLabel(item.type);

            return (
              <Card
                key={item.id}
                variant="interactive"
                padding="md"
                className="flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                      <Icon name={iconName} className="h-5 w-5" />
                    </span>
                    <Badge variant="brand" size="sm">
                      {typeLabel}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-surface-400 italic">
                        Sin descripción adicional.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between gap-2">
                  <span className="text-2xs text-surface-400 truncate">
                    {item.authorName ? `Por ${item.authorName}` : 'Institucional'}
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                  >
                    <span>Abrir</span>
                    <Icon name="externalLink" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourcesCatalog;
