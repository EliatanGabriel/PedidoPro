"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function CustomerForm() {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const element=event.currentTarget;setBusy(true);setError("");const data=Object.fromEntries(new FormData(element).entries());const result=await apiRequest("/api/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)},"Não foi possível cadastrar o cliente.");setBusy(false);if(!result.ok){setError(result.error);return;}element.reset();router.refresh();}
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Nome<input name="name" required minLength={2} className="input mt-2" /></label><label className="text-xs font-semibold">Telefone<input name="phone" className="input mt-2" /></label><label className="text-xs font-semibold">E-mail<input name="email" type="email" className="input mt-2" /></label><label className="text-xs font-semibold">CPF (opcional)<input name="taxId" className="input mt-2" /></label><label className="text-xs font-semibold">CEP<input name="postalCode" className="input mt-2" /></label><label className="text-xs font-semibold sm:col-span-2">Endereço<input name="address" className="input mt-2" /></label><label className="text-xs font-semibold">Cidade<input name="city" className="input mt-2" /></label><label className="text-xs font-semibold">Estado<input name="state" maxLength={2} className="input mt-2" /></label>{error&&<p role="alert" className="error sm:col-span-2">{error}</p>}<button disabled={busy} className="button justify-self-start">{busy?"Salvando…":"Cadastrar cliente"}</button></form>;
}
