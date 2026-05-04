import "server-only";
import { apiFetch } from "@/lib/api";

export type RoleEntry = {
  name: string;
  permissions: string[];
  editable: boolean;
  description: string | null;
};

export type RolesPayload = {
  roles: RoleEntry[];
  permissions: string[];
};

export async function listRoles(): Promise<RolesPayload> {
  const res = await apiFetch<{ data: RolesPayload }>("/api/v1/roles");
  return res.data;
}

export async function updateRolePermissions(
  name: string,
  permissions: string[],
): Promise<RoleEntry> {
  const res = await apiFetch<{ data: RoleEntry }>(
    `/api/v1/roles/${encodeURIComponent(name)}/permissions`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    },
  );
  return res.data;
}
