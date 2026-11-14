import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        <Loader2 className="size-5 animate-spin text-blue-900" />
        正在加载验收证据链…
      </div>
    </main>
  );
}
