export function isAdminAuthorized(authHeader: string | null): boolean {
  const secret = process.env.ADMIN_TOKEN || "change-me";
  if (!authHeader) {
    return false;
  }
  return authHeader === `Bearer ${secret}`;
}
