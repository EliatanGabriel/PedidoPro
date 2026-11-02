export function hasTenantPermission(role: string, permissions: unknown, companyActive: boolean, permission: string) {
  if (!companyActive) return false;
  if (role === "OWNER") return true;
  return Array.isArray(permissions) && permissions.includes(permission);
}
