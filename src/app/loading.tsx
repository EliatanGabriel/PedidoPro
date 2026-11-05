export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7f9f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#177a56] border-t-transparent animate-spin" />
        <p className="text-sm text-[#718078]">Carregando…</p>
      </div>
    </main>
  );
}
