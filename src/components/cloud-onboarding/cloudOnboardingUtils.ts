export function readCloudOnboardingError(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error) || cause.name === 'AbortError') return fallback;
  const details = 'details' in cause && cause.details !== null && typeof cause.details === 'object'
    ? cause.details as { readonly actionCode?: unknown; readonly field?: unknown }
    : undefined;
  const field = typeof details?.field === 'string' ? details.field : undefined;
  const fieldLabel = field === 'tenancyId' ? 'Tenancy OCID'
    : field === 'userId' ? 'User OCID'
      : field === 'privateKey' ? 'clave privada PEM'
        : field === 'passphrase' ? 'passphrase'
          : field === 'fingerprint' ? 'fingerprint'
            : field === 'region' ? 'región'
              : undefined;
  const fieldMessage = fieldLabel === undefined ? '' : ` Campo relacionado: ${fieldLabel}.`;
  const action = typeof details?.actionCode === 'string' ? ` Código de acción: ${details.actionCode}.` : '';
  return `${cause.message}${fieldMessage}${action}`;
}
