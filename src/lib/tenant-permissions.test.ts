import { describe, expect, it } from "vitest";
import { hasTenantPermission } from "./tenant-permissions";

describe("tenant permissions", () => {
  it("allows the owner only while the company is active", () => {
    expect(hasTenantPermission("OWNER", [], true, "manage_stock")).toBe(true);
    expect(hasTenantPermission("OWNER", [], false, "manage_stock")).toBe(false);
  });

  it("restricts employees to explicitly granted permissions", () => {
    const permissions = ["view_orders", "create_orders"];
    expect(hasTenantPermission("EMPLOYEE", permissions, true, "view_orders")).toBe(true);
    expect(hasTenantPermission("EMPLOYEE", permissions, true, "manage_payments")).toBe(false);
    expect(hasTenantPermission("EMPLOYEE", "view_orders", true, "view_orders")).toBe(false);
  });

  it("does not grant implicit privileges to legacy manager records", () => {
    expect(hasTenantPermission("MANAGER", [], true, "manage_stock")).toBe(false);
    expect(hasTenantPermission("MANAGER", ["view_orders"], true, "view_orders")).toBe(true);
    expect(hasTenantPermission("MANAGER", ["view_orders"], true, "manage_stock")).toBe(false);
  });
});
