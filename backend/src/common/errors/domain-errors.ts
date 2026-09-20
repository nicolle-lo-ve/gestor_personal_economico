export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}
export class NotFoundError extends DomainError { constructor(message = 'No se encontró el recurso.') { super('NOT_FOUND', message, 404); } }
export class UnauthorizedError extends DomainError { constructor(message = 'Sesión no válida.') { super('UNAUTHORIZED', message, 401); } }
export class BusinessRuleError extends DomainError { constructor(message: string, details?: any) { super('BUSINESS_RULE_VIOLATION', message, 422, details); } }
export class ConflictError extends DomainError { constructor(message: string) { super('CONFLICT', message, 409); } }