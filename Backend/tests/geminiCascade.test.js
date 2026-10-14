import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  executeWithGeminiCascade,
  generateCurricularFallbackAssessment,
  PRIMARY_MODEL,
  BACKUP_MODEL
} from '../src/services/chat.service.js';

describe('Gemini AI Cascade Dispatcher & Resilience (SESION-13-OCTUBRE-2026)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe utilizar el modelo primario (Nivel 1) cuando la llamada tiene éxito', async () => {
    const mockFn = jest.fn().mockResolvedValue('Resultado Exitoso Nivel 1');

    const result = await executeWithGeminiCascade(mockFn);

    expect(result).toBe('Resultado Exitoso Nivel 1');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({
      modelName: PRIMARY_MODEL,
      tier: 1
    }));
  });

  it('debe conmutar al modelo de respaldo (Nivel 2) si el primario falla con 429 / cuota agotada', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('429 Too Many Requests: Resource exhausted'))
      .mockResolvedValueOnce('Resultado Exitoso Nivel 2');

    const result = await executeWithGeminiCascade(mockFn);

    expect(result).toBe('Resultado Exitoso Nivel 2');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, expect.objectContaining({
      modelName: PRIMARY_MODEL,
      tier: 1
    }));
    expect(mockFn).toHaveBeenNthCalledWith(2, expect.objectContaining({
      modelName: BACKUP_MODEL,
      tier: 2
    }));
  });

  it('debe lanzar error cuando fallan ambos niveles para permitir activación de contingencia Nivel 3', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Nivel 1 429'))
      .mockRejectedValueOnce(new Error('Nivel 2 429'));

    await expect(executeWithGeminiCascade(mockFn)).rejects.toThrow(
      /Todos los niveles de Gemini API fallaron/
    );
  });

  it('debe generar evaluación offline con estructura garantizada en Nivel 3 (Banco Curricular)', () => {
    const moduleData = {
      title: 'Fundamentos de Redes y Modelo OSI',
      description: 'Arquitecturas en capas, direccionamiento y protocolos'
    };

    const assessment = generateCurricularFallbackAssessment(moduleData, [], 'completa');

    expect(assessment).toBeDefined();
    expect(Array.isArray(assessment.questions)).toBe(true);
    expect(assessment.questions.length).toBeGreaterThan(0);
    expect(assessment.questions[0]).toHaveProperty('question');
    expect(assessment.questions[0]).toHaveProperty('options');
    expect(assessment.questions[0]).toHaveProperty('correctAnswer');
    expect(assessment.practicalChallenge).toBeDefined();
    expect(assessment.practicalChallenge).toHaveProperty('title');
    expect(assessment.practicalChallenge).toHaveProperty('tasks');
  });
});
