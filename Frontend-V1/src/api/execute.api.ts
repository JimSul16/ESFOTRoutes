import httpClient from './httpClient';
import type { ExecuteCodePayload, ExecuteCodeResponse } from '../types';

export type ExecuteRunPayload = ExecuteCodePayload;
export type ExecuteRunResponse = ExecuteCodeResponse;

export const runCode = async (payload: ExecuteCodePayload): Promise<ExecuteCodeResponse> => {
  const response = await httpClient.post<ExecuteCodeResponse>('/execute/run', payload);
  return response.data;
};

export const executeCode = runCode;