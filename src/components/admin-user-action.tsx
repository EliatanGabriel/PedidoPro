"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function AdminUserAction({ id, platformRole, isSelf }: { id: string; platformRole: string; isSelf: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const promoting = platformRole !== "PLATFORM_ADMIN";

  async function changeRole() {
    const message = promoting ? "Conceder acesso de administrador da plataforma a este usuário?" : "Remover o acesso de administrador da plataforma deste usuário?";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformRole: promoting ? "PLATFORM_ADMIN" : "USER" }),
    }, "Não foi possível alterar o perfil do usuário.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (isSelf) return <span className="text-xs text-[#87928b]">Você</span>;
  return <div>
    <button type="button" disabled={busy} onClick={() => void changeRole()} className={`text-xs font-semibold ${promoting ? "text-[#177a56]" : "text-red-700"}`}>
      {busy ? "Salvando…" : promoting ? "Tornar admin" : "Remover admin"}
    </button>
    {error && <p role="alert" className="mt-1 max-w-48 text-xs text-red-700">{error}</p>}
  </div>;
}
