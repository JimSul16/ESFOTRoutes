import httpClient from './httpClient';

/** Un día de la actividad semanal (lunes → domingo). */
export interface WeeklyActivityDay {
  day: string;
  minutes: number;
  completedModules: number;
}

export interface WeeklyActivityResponse {
  success: boolean;
  weeklyActivity: WeeklyActivityDay[];
  totalMinutes: number;
  totalCompletedModules: number;
}

/**
 * Actividad real de estudio de la semana en curso.
 *
 * El backend la calcula a partir de `ModuleProgress` y
 * `LearningRoute.estimatedTime`; antes el frontend pintaba valores
 * inventados.
 */
export const getWeeklyActivity = async (): Promise<WeeklyActivityResponse> => {
  const response = await httpClient.get<WeeklyActivityResponse>('/analytics/weekly-activity');
  return response.data;
};
