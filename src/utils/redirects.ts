import { redirect } from "elysia";

export const redirectToLogin = (tenantId: string) => {
  return redirect(`/${tenantId}/flow/v1/login`, 302);
}

export const redirectToRedirect = (tenantId: string) => {
  return redirect(`/${tenantId}/flow/v1/redirect`, 302);
}