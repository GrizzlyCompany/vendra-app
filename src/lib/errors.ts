export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string) {
    super(message, 'PERMISSION_ERROR', 403);
    this.name = 'PermissionError';
  }
}

export function handleSupabaseError(error: any): AppError {
  if (error?.code === 'PGRST116') {
    return new NotFoundError('Recurso no encontrado');
  }
  
  if (error?.code === '42501') {
    return new PermissionError('No tienes permisos para realizar esta acción');
  }
  
  if (error?.message?.includes('JWT')) {
    return new AuthError('Sesión expirada. Por favor, inicia sesión nuevamente');
  }
  
  return new AppError(
    error?.message || 'Ha ocurrido un error inesperado',
    'UNKNOWN_ERROR'
  );
}

