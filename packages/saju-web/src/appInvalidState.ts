export interface InvalidInputEffects {
  clearError: boolean
  clearResult: boolean
  stopLoading: boolean
}

export function invalidInputEffects(message: string | null): InvalidInputEffects {
  if (message === null) {
    return {
      clearError: false,
      clearResult: false,
      stopLoading: false,
    };
  }
  return {
    clearError: true,
    clearResult: true,
    stopLoading: true,
  };
}
