import {
  validateSajuFormInput,
  type FormValidationInput,
  type ValidationResult,
} from './formValidation';

export function runValidatedSubmission<T extends FormValidationInput>(
  payload: T,
  onInvalid: (message: string | null) => void,
  onSubmit: (payload: T) => void,
): ValidationResult {
  const validation = validateSajuFormInput(payload);
  if (validation.summary) {
    onInvalid(validation.summary);
    return validation;
  }
  onInvalid(null);
  onSubmit(payload);
  return validation;
}

export function scheduleDebouncedSubmit(
  currentTimer: ReturnType<typeof setTimeout> | undefined,
  delayMs: number,
  callback: () => void,
): ReturnType<typeof setTimeout> {
  if (currentTimer) clearTimeout(currentTimer);
  return setTimeout(callback, delayMs);
}
