/**
 * Speqtus Medical Ordering Platform — Saved Sets Input Validator
 * Validates OT Set naming and prevents empty or excessive names.
 */

export interface SavedSetNameValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
}

export function validateSavedSetName(name: unknown): SavedSetNameValidationResult {
  if (typeof name !== 'string') {
    return { isValid: false, error: 'Set name must be a string.' };
  }

  const trimmed = name.trim().replace(/[\r\n\t]+/g, ' ');
  if (!trimmed) {
    return { isValid: false, error: 'OT Set name cannot be empty.' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'OT Set name cannot exceed 100 characters.' };
  }

  return {
    isValid: true,
    sanitizedName: trimmed,
  };
}
