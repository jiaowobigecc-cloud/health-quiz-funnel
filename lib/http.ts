import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getZodIssues } from "./validation";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function problem(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}

export function validationProblem(error: ZodError) {
  return problem(422, "VALIDATION_ERROR", "Request body failed validation.", getZodIssues(error));
}

export async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function readRouteParams<T extends Record<string, string>>(context: {
  params: T | Promise<T>;
}) {
  return await context.params;
}
