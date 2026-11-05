"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button, Input } from "@/components/ui";

export function CustomerForm() {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const element=event.currentTarget;setBusy(true);setError("");const data=Object.fromEntries(new FormData(element).entries());const result=await apiRequest("/api/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)},"Não foi possível cadastrar o cliente.");setBusy(false);if(!result.ok){setError(result.error);return;}element.reset();router.refresh();}
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><div className="block text-xs font-semibold">Nome<Input name="name" required minLength={2} className="mt-2" /></div><div className="block text-xs font-semibold">Telefone<Input name="phone" className="mt-2" /></div><div className="block text-xs font-semibold">E-mail<Input name="email" type="email" className="mt-2" /></div><div className="block text-xs font-semibold">CPF (opcional)<Input name="taxId" className="mt-2" /></div><div className="block text-xs font-semibold">CEP<Input name="postalCode" className="mt-2" /></div><div className="block text-xs font-semibold sm:col-span-2">Endereço<Input name="address" className="mt-2" /></div><div className="block text-xs font-semibold">Cidade<Input name="city" className="mt-2" /></div><div className="block text-xs font-semibold">Estado<Input name="state" maxLength={2} className="mt-2" /></div>{error&&<p role="alert" className="error sm:col-span-2">{error}</p>}<Button disabled={busy} className="justify-self-start">{busy?"Salvando…":"Cadastrar cliente"}</Button></form>;
}
