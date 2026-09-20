export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  run<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}