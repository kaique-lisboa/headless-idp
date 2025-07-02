export class AppError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export const TenantMismatchError = new AppError('Tenant mismatch', 400);