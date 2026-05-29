export function getActionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    for (const value of Object.values(error as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;

      const message = value.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      );

      if (message) {
        return message;
      }
    }
  }

  return fallback;
}
