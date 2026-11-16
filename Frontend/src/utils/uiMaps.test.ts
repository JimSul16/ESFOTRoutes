import { describe, expect, it } from 'vitest';
import {
  classifyModule,
  getDifficultyMeta,
  getModuleToneMeta,
  getRoleLabel,
} from './uiMaps';

describe('getDifficultyMeta', () => {
  it('mapea las dificultades conocidas a su etiqueta y variante', () => {
    expect(getDifficultyMeta('BEGINNER')).toMatchObject({
      label: 'Principiante',
      variant: 'default',
    });
    expect(getDifficultyMeta('INTERMEDIATE').variant).toBe('warning');
    expect(getDifficultyMeta('ADVANCED').variant).toBe('brand');
    expect(getDifficultyMeta('ADAPTIVE').label).toBe('Adaptativa');
  });

  it('usa un tono neutro para valores desconocidos o nulos', () => {
    expect(getDifficultyMeta('EXPERTO')).toEqual({
      label: 'EXPERTO',
      variant: 'default',
      icon: 'layers',
    });
    expect(getDifficultyMeta(null).label).toBe('General');
    expect(getDifficultyMeta(undefined).variant).toBe('default');
  });
});

describe('classifyModule', () => {
  it('reconoce los títulos que genera el grafo curricular', () => {
    expect(classifyModule('Módulo 2: Nivelación y Refuerzo Focalizado')).toBe('reinforcement');
    expect(classifyModule('Módulo 1: Validación y Maestría Práctica de Grafos')).toBe('mastery');
    expect(classifyModule('Módulo 3: Dominio Práctico de Redes')).toBe('practice');
  });

  it('es insensible a acentos y mayúsculas', () => {
    expect(classifyModule('REFUERZO DE PRERREQUISITOS')).toBe('reinforcement');
    expect(classifyModule('Práctica de Subnetting')).toBe('practice');
  });

  it('cae al módulo troncal cuando no hay señal', () => {
    expect(classifyModule('Fundamentos y Modelo OSI')).toBe('standard');
    expect(classifyModule(null)).toBe('standard');
    expect(classifyModule('')).toBe('standard');
  });
});

describe('getModuleToneMeta', () => {
  it('devuelve etiqueta, variante e icono consistentes', () => {
    expect(getModuleToneMeta('Nivelación y Refuerzo')).toMatchObject({
      label: 'Refuerzo sugerido',
      variant: 'accent',
      icon: 'zap',
    });
    expect(getModuleToneMeta('Módulo base')).toMatchObject({
      label: 'Módulo troncal',
      variant: 'brand',
      icon: 'bookOpen',
    });
  });
});

describe('getRoleLabel', () => {
  it('traduce los roles del backend y conserva los desconocidos', () => {
    expect(getRoleLabel('ADMIN')).toBe('Administrador');
    expect(getRoleLabel('STUDENT')).toBe('Estudiante');
    expect(getRoleLabel('TEACHER')).toBe('TEACHER');
    expect(getRoleLabel(null)).toBe('');
  });
});
