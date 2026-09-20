import { Decimal } from 'decimal.js';

export class Money {
  static format(amount: Decimal | string | number): string {
    return new Decimal(amount).toFixed(2);
  }
}