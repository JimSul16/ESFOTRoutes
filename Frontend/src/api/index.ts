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
  getMyProgress,
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
  MyProgress,
  MyProgressActivity,
  MyProgressRoute,
} from './auth.api';

// Admin
export {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  unlockUser,
  getUserProgress,
} from './admin.api';
export type {
  AdminActionResponse,
  AdminRoleName,
  AdminUserMutationResponse,
  CreateUserPayload,
  UpdateUserPayload,
  AdminUserProgress,
} from './admin.api';

// Resources
export {
  getResources,
  createResource,
  updateResource,
  deleteResource,
  getResourceCatalog,
} from './resource.api';
export type {
  CatalogQuery,
  CatalogResourceItem,
  CatalogResponse,
  ResourceMutationResponse,
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
  getModuleAssessments,
} from './route.api';
export type {
  RouteMutationResponse,
  ModuleAssessmentItem,
  ModuleAssessmentsResponse,
} from './route.api';

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