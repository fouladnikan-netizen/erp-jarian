import { describe, it, expect } from 'vitest';
import {
  isForbiddenError,
  isUnauthorizedError,
  getApiErrorMessage,
  FORBIDDEN_MESSAGE,
} from '../../api/apiErrors.js';

describe('401 vs 403 UX', () => {
  it('distinguishes unauthorized and forbidden', () => {
    expect(isUnauthorizedError({ response: { status: 401 } })).toBe(true);
    expect(isForbiddenError({ response: { status: 403 } })).toBe(true);
    expect(isUnauthorizedError({ response: { status: 403 } })).toBe(false);
  });

  it('maps 403 to permission message without implying logout', () => {
    expect(getApiErrorMessage({ response: { status: 403, data: {} } })).toBe(FORBIDDEN_MESSAGE);
  });
});
