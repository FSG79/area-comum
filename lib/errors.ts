export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

export function unauthorized(message = "Faça login para continuar."): AppError {
  return new AppError(message, 401);
}

export function forbidden(message = "Seu perfil não tem permissão para esta ação."): AppError {
  return new AppError(message, 403);
}

export function notFound(message = "Registro não encontrado."): AppError {
  return new AppError(message, 404);
}

export function conflict(message: string): AppError {
  return new AppError(message, 409);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[area-comum] erro inesperado:", error);
  return Response.json(
    { ok: false, error: "Erro interno inesperado. Tente novamente." },
    { status: 500 },
  );
}
