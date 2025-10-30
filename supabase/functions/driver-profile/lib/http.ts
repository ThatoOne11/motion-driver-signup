export function jsonStatus(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const jsonOk = (body: unknown) => jsonStatus(body, 200);
export const jsonBadRequest = (message: string, error?: string) =>
  jsonStatus({ Message: message, HasErrors: true, Error: error }, 400);
export const jsonUnauthorized = (message = "Unauthorised") =>
  jsonStatus({ Message: message, HasErrors: true }, 401);
export const jsonServerError = (message: string, error?: string) =>
  jsonStatus({ Message: message, HasErrors: true, Error: error }, 500);
export const jsonUpstreamError = (message: string, error?: string) =>
  jsonStatus({ Message: message, HasErrors: true, Error: error }, 502);
