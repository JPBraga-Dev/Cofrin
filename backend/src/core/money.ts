/**
 * Canonical monetary arithmetic for the domain. API payloads still use decimal
 * reais, but every sum, comparison and subtraction is performed in cents.
 */
export type MoneyInCents = number & { readonly __moneyInCents: unique symbol };

export function toCents(value: number): MoneyInCents {
  if (!Number.isFinite(value)) throw new Error("Valor monetário inválido.");
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Valor monetário fora do limite suportado.");
  return cents as MoneyInCents;
}

export function fromCents(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error("Valor em centavos inválido.");
  return value / 100;
}

export function sumInCents(values: number[]): MoneyInCents {
  return values.reduce((total, value) => total + toCents(value), 0) as MoneyInCents;
}
