/**
 * Domain money model — amounts are numeric; formatting stays in shared/utils.
 * Do not put presentation (fonts, locale strings) here.
 */

export type CurrencyCode = 'IRR';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export function money(amount: number, currency: CurrencyCode = 'IRR'): Money {
  return { amount, currency };
}
