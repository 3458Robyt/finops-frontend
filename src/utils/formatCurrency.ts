export function formatCurrencyAmount(
  value: number,
  currency: string | null | undefined,
  maximumFractionDigits = 2,
): string {
  if (!Number.isFinite(value)) return '—';

  const normalizedCurrency = currency?.trim().toUpperCase() ?? '';
  const amountFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits });
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return `${amountFormatter.format(value)} (${normalizedCurrency ? `moneda ${normalizedCurrency}` : 'moneda no disponible'})`;
  }

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'code',
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${amountFormatter.format(value)} (moneda ${normalizedCurrency})`;
  }
}
