import { ZodError } from "zod";
import { CoordinatorError } from "./errors";

export async function parseJson<T>(request: Request, parser: { parse: (input: unknown) => T }) {
  const body = await request.json().catch(() => undefined);
  return parser.parse(body);
}

export function jsonError(error: unknown) {
  if (error instanceof CoordinatorError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      { error: { code: "validation_error", issues: error.issues } },
      { status: 400 }
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 }
  );
}
