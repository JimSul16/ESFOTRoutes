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
} from '@/components/ui';
import { getRoutes, deleteRoute } from '../../../api/route.api';
import RouteBuilder from './RouteBuilder';
import { getApiErrorMessage } from '../../../api/errors';
import { getDifficultyMeta } from '@/utils/uiMaps';
import type { LearningRoute } from '../../../types';

const RoutesManager = () => {
  const [routes, setRoutes] = useState<LearningRoute[]>([]);
  const [fetching, setFetching] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [routeToEdit, setRouteToEdit] = useState<LearningRoute | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      setFetching(true);
      try {
        const routesData = await getRoutes();
        if (!cancelled) setRoutes(routesData);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'Error al cargar las rutas'));
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
    // `reloadKey` solo dispara el refresco tras una mutación.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [reloadKey]);

  const refreshRoutes = () => setReloadKey((key) => key + 1);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ruta? Se perderán sus submódulos asociados.')) return;
    try {
      await deleteRoute(id);
      toast.success('Ruta eliminada correctamente');
      refreshRoutes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la ruta'));
    }
  };

  const handleCreateNew = () => {
    setRouteToEdit(null);
    setCurrentView('form');
  };

  const handleEdit = (route: LearningRoute) => {
    setRouteToEdit(route);
    setCurrentView('form');
  };

  const handleFormClose = (wasSaved: boolean) => {
    setCurrentView('list');
    setRouteToEdit(null);
    if (wasSaved) {
      refreshRoutes();
    }
  };

  const groupedRoutes = routes.reduce<Record<string, LearningRoute[]>>((acc, route) => {
    const category = route.category || 'Sin Clasificar';
    (acc[category] ??= []).push(route);
    return acc;
  }, {});

  if (currentView === 'form') {
    return (
      <RouteBuilder
        initialData={routeToEdit}
        onCancel={() => handleFormClose(false)}
        onSaveSuccess={() => handleFormClose(true)}
      />
    );
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-6 pb-12 duration-300 sm:space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Gestión de Rutas de Aprendizaje"
        description="Administra, edita o elimina las rutas categorizadas por ejes de conocimiento."
        actions={
          <Button
            type="button"
            onClick={handleCreateNew}
            iconLeft={<Icon name="plus" className="h-4 w-4" />}
          >
            Crear Nueva Ruta
          </Button>
        }
      />

      {fetching ? (
        <div aria-busy="true" className="space-y-4">
          <span className="sr-only">Cargando rutas…</span>
          {[0, 1].map((index) => (
            <Card key={index} padding="none" className="overflow-hidden">
              <CardHeader className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-3 w-3" />
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="w-1/3" />
                    <Skeleton className="hidden h-6 w-24 sm:block" />
                    <Skeleton className="ml-auto h-8 w-28" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="route"
            title="No hay rutas estructuradas aún"
            description="Crea la primera ruta para organizar módulos, recursos y evaluaciones del catálogo."
            action={
              <Button
                type="button"
                onClick={handleCreateNew}
                iconLeft={<Icon name="plus" className="h-4 w-4" />}
              >
                Crear primera ruta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
            <Card key={category} padding="none" className="overflow-hidden">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500"
                  />
                  <h2 className="truncate font-display text-base font-bold text-surface-900 dark:text-white">
                    {category}
                  </h2>
                </div>

                <Badge variant="default" size="sm">
                  {categoryRoutes.length}{' '}
                  {categoryRoutes.length === 1 ? 'ruta' : 'rutas'}
                </Badge>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-50 text-2xs uppercase tracking-wider text-surface-500 dark:bg-surface-850 dark:text-surface-400">
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Título de la Ruta
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Dificultad
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Tiempo
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Evaluación IA
                      </th>
                      <th scope="col" className="px-6 py-3 text-right font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {categoryRoutes.map((route) => {
                      const difficulty = getDifficultyMeta(route.difficulty);

                      return (
                        <tr
                          key={route.id}
                          className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40"
                        >
                          <td className="max-w-[22rem] px-6 py-4">
                            <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                              {route.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                              <Icon name="layers" className="h-3 w-3" />
                              {route.modules?.length ?? 0} módulos
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <Badge variant={difficulty.variant} size="sm">
                              {difficulty.label}
                            </Badge>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-sm text-surface-600 dark:text-surface-300">
                              <Icon name="clock" className="h-3.5 w-3.5 text-surface-400" />
                              {route.estimatedTime ?? 0} min
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {route.evaluationRules ? (
                              <Badge variant="default" size="sm">
                                Sí
                              </Badge>
                            ) : (
                              <Badge variant="accent" size="sm">
                                No
                              </Badge>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(route)}
                                aria-label={`Editar ${route.title}`}
                                iconLeft={<Icon name="pencil" className="h-3.5 w-3.5" />}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(route.id)}
                                aria-label={`Eliminar ${route.title}`}
                                iconLeft={<Icon name="trash" className="h-3.5 w-3.5" />}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutesManager;
