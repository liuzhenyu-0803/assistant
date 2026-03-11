import type { ErrorCode } from './api.js';

export type { ErrorCode };

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RUN_ACTIVE: 409,
  CONFIG_INCOMPLETE: 422,
  INTERNAL_ERROR: 500,
};
