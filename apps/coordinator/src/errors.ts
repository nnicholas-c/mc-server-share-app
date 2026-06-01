export class CoordinatorError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "coordinator_error"
  ) {
    super(message);
  }
}

export function notFound(message = "Not found") {
  return new CoordinatorError(404, message, "not_found");
}

export function conflict(message = "Conflict") {
  return new CoordinatorError(409, message, "conflict");
}

export function unauthorized(message = "Unauthorized") {
  return new CoordinatorError(401, message, "unauthorized");
}

export function badRequest(message = "Bad request") {
  return new CoordinatorError(400, message, "bad_request");
}
