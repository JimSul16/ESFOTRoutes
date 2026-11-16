import { useState, useMemo } from 'react';
import { Badge, Button, Icon, type IconName } from '@/components/ui';
import type { Resource } from '../../../types';

export interface ModuleResourcePickerProps {
  availableResources: Resource[];
  selectedResourceIds: string[];
  onToggleResource: (resourceId: string) => void;
  moduleTitle: string;
  routeCategory?: string;
}

type ResourceTypeFilter = 'ALL' | 'PDF' | 'VIDEO' | 'LINK' | 'IMAGE';
type ViewTab = 'all' | 'assigned' | 'suggested';

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'o', 'un', 'una', 'unos', 'unas',
  'por', 'para', 'con', 'sin', 'sobre', 'desde', 'hasta', 'del', 'al', 'que',
  'curso', 'modulo', 'conceptos', 'basico', 'basicos', 'avanzado', 'avanzados',
  'introduccion', 'general', 'tema', 'guia', 'practica', 'practico'
]);

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const extractKeywords = (text: string): string[] => {
  const normalized = normalizeText(text);
  const words = normalized.split(/[^a-z0-9]+/);
  return words.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
};

const getResourceIcon = (type: Resource['type']): IconName => {
  switch (type) {
    case 'VIDEO':
      return 'circlePlay';
    case 'PDF':
      return 'fileText';
    case 'IMAGE':
      return 'image';
    case 'LINK':
    default:
      return 'externalLink';
  }
};

const ModuleResourcePicker = ({
  availableResources,
  selectedResourceIds,
  onToggleResource,
  moduleTitle,
  routeCategory = '',
}: ModuleResourcePickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('ALL');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');

  // Extraer keywords del título del módulo y la categoría de la ruta
  const keywords = useMemo(() => {
    const raw = `${moduleTitle} ${routeCategory}`;
    return Array.from(new Set(extractKeywords(raw)));
  }, [moduleTitle, routeCategory]);

  // Mapa de sugeridos por relevancia
  const suggestedResourceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (keywords.length === 0) return map;

    availableResources.forEach((res) => {
      const resText = normalizeText(`${res.title} ${res.description ?? ''} ${res.subject ?? ''}`);
      const isMatch = keywords.some((kw) => resText.includes(kw));
      if (isMatch) {
        map.set(res.id, true);
      }
    });

    return map;
  }, [availableResources, keywords]);

  const assignedCount = selectedResourceIds.length;
  const suggestedCount = availableResources.filter((r) => suggestedResourceMap.has(r.id)).length;

  // Filtrado de recursos
  const filteredResources = useMemo(() => {
    return availableResources.filter((res) => {
      // Filtro por pestaña
      if (activeTab === 'assigned' && !selectedResourceIds.includes(res.id)) {
        return false;
      }
      if (activeTab === 'suggested' && !suggestedResourceMap.has(res.id)) {
        return false;
      }

      // Filtro por tipo
      if (typeFilter !== 'ALL' && res.type !== typeFilter) {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = normalizeText(searchQuery);
        const matchTitle = normalizeText(res.title).includes(query);
        const matchDesc = normalizeText(res.description ?? '').includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [availableResources, activeTab, selectedResourceIds, suggestedResourceMap, typeFilter, searchQuery]);

  // Recursos asignados para los chips de selección rápida
  const assignedResources = useMemo(() => {
    const idSet = new Set(selectedResourceIds);
    return availableResources.filter((r) => idSet.has(r.id));
  }, [availableResources, selectedResourceIds]);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setActiveTab('all');
  };

  return (
    <div className="space-y-3">
      {/* Resumen de recursos asignados (chips removibles) */}
      {assignedResources.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-brand-200/60 bg-brand-50/40 p-3 dark:border-brand-500/20 dark:bg-brand-950/20">
          <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            <span className="flex items-center gap-1.5">
              <Icon name="layers" className="h-3.5 w-3.5" />
              Recursos asignados a este curso ({assignedCount})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {assignedResources.map((res) => (
              <span
                key={res.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-surface-800 shadow-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
              >
                <Icon name={getResourceIcon(res.type)} className="h-3 w-3 text-surface-500" />
                <span className="max-w-[12rem] truncate" title={res.title}>
                  {res.title}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleResource(res.id)}
                  aria-label={`Desasignar ${res.title}`}
                  className="rounded-full p-0.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Barra de pestañas y búsqueda */}
      <div className="space-y-2 rounded-lg border border-surface-200 bg-surface-50/70 p-3 dark:border-surface-700 dark:bg-surface-850/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Pestañas: Todos, Asignados, Sugeridos */}
          <div className="flex items-center gap-1 rounded-control bg-surface-200/70 p-1 text-xs dark:bg-surface-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-control px-2.5 py-1 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-surface-900 shadow-xs dark:bg-surface-700 dark:text-white'
                  : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
              }`}
            >
              Todos ({availableResources.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned')}
              className={`rounded-control px-2.5 py-1 font-medium transition-colors ${
                activeTab === 'assigned'
                  ? 'bg-white text-surface-900 shadow-xs dark:bg-surface-700 dark:text-white'
                  : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
              }`}
            >
              Asignados ({assignedCount})
            </button>
            {suggestedCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('suggested')}
                className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 font-medium transition-colors ${
                  activeTab === 'suggested'
                    ? 'bg-brand-600 text-white shadow-xs dark:bg-brand-500'
                    : 'text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-white'
                }`}
              >
                <Icon name="sparkles" className="h-3 w-3" />
                Sugeridos ({suggestedCount})
              </button>
            )}
          </div>

          {/* Selector de Tipo */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ResourceTypeFilter)}
              aria-label="Filtrar por tipo de recurso"
              className="rounded-control border border-surface-200 bg-white px-2.5 py-1 text-xs font-medium text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
            >
              <option value="ALL">Cualquier tipo</option>
              <option value="PDF">PDF</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Enlace</option>
              <option value="IMAGE">Imagen</option>
            </select>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-surface-400">
            <Icon name="search" className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o palabra clave en el catálogo..."
            className="w-full rounded-control border border-surface-200 bg-white py-1.5 pl-8 pr-7 text-xs text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Listado de recursos con scroll */}
      {availableResources.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-center text-xs text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400">
          No hay recursos en el sistema. Crea recursos en el catálogo primero.
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-4 text-center text-xs text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400">
          <p>
            {activeTab === 'assigned'
              ? 'No hay recursos asignados a este curso todavía.'
              : activeTab === 'suggested'
                ? 'No se encontraron recursos sugeridos para los términos de este curso.'
                : 'No se encontraron recursos con los filtros seleccionados.'}
          </p>
          {(searchQuery || typeFilter !== 'ALL' || activeTab !== 'all') && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Mostrar todos
            </Button>
          )}
        </div>
      ) : (
        <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-surface-200 bg-white p-2 dark:border-surface-700 dark:bg-surface-900">
          {filteredResources.map((res) => {
            const isAssigned = selectedResourceIds.includes(res.id);
            const isSuggested = suggestedResourceMap.has(res.id);

            return (
              <label
                key={res.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors ${
                  isAssigned
                    ? 'border border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-950/30'
                    : 'border border-transparent hover:bg-surface-100 dark:hover:bg-surface-800/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => onToggleResource(res.id)}
                  className="mt-0.5 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      name={getResourceIcon(res.type)}
                      className="h-3.5 w-3.5 shrink-0 text-surface-500"
                    />
                    <span className="truncate text-xs font-semibold text-surface-900 dark:text-surface-100">
                      {res.title}
                    </span>
                    {isSuggested && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-100 px-1.5 py-0.2 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        <Icon name="sparkles" className="h-2.5 w-2.5" />
                        Sugerido
                      </span>
                    )}
                  </div>

                  {res.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-surface-500 dark:text-surface-400">
                      {res.description}
                    </p>
                  )}
                </div>

                <Badge variant="default" size="sm" className="shrink-0 text-[10px] uppercase">
                  {res.type}
                </Badge>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleResourcePicker;
