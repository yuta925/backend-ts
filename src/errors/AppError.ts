export class AppError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status = 500,
    opts?: { code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = opts?.code;
    this.details = opts?.details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found", details?: unknown) {
    super(message, 404, { code: "NOT_FOUND", details });
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: unknown) {
    super(message, 400, { code: "BAD_REQUEST", details });
  }
}