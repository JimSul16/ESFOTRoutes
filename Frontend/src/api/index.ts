/**
 * Barrel export for all API modules.
 * Import from '@/api' instead of individual files.
 *
 * Cada módulo desenvuelve el sobre que devuelve el backend, de modo que los
 * componentes reciben siempre el dato final, no `{ success, ... }`.
 */

// Auth
export {
  login,
  isLoginSuccess,
  register,
  verifyAccount,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getSessions,
  unlockAccount,
} from './auth.api';
export type {
  AuthMessageResponse,
  ChangePasswordData,
  ForgotPasswordData,
  LoginCredentials,
  LoginResponse,
  LoginSuccessResponse,
  RegisterData,
  ResetPasswordData,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UnlockAccountResult,
} from './auth.api';

// Admin
export { getUsers, createUser, updateUser, toggleUserStatus, unlockUser } from './admin.api';
export type {
  AdminActionResponse,
  AdminRoleName,
  AdminUserMutationResponse,
  CreateUserPayload,
  UpdateUserPayload,
} from './admin.api';

// Resources
export {
  getResources,
  createResource,
  updateResource,
  deleteResource,
} from './resource.api';

// Routes
export {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getMyRoutes,
  enrollRoute,
  completeModule,
} from './route.api';
export type { RouteMutationResponse } from './route.api';

// Chat
export { sendChatMessage, generateAssessment } from './chat.api';
export type {
  AssessmentPayload,
  AssessmentResponse,
  SendChatMessagePayload,
  SendChatMessageResponse,
} from './chat.api';

// Graph
export {
  getSubjects,
  getSubjectTopics,
  submitSelfDiagnosis,
  generatePersonalizedAdaptiveRoute,
  getGraphRecommendations,
  getTopicGraphContext,
  getModuleTopics,
} from './graph.api';

// Upload
export { uploadFile, uploadProfileImage, uploadCoverImage } from './upload.api';

// Execute
export { runCode } from './execute.api';
export type { ExecuteRunPayload, ExecuteRunResponse } from './execute.api';

// Analytics
export { getWeeklyActivity } from './analytics.api';
export type { WeeklyActivityDay, WeeklyActivityResponse } from './analytics.api';