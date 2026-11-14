"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-10 text-red-700" />
        <h1 className="mt-4 text-xl font-semibold text-slate-950">
          页面暂时无法加载
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          系统遇到暂时性错误，当前没有修改或删除你的材料。请重试；如果问题持续，请查看终端中的错误信息。
        </p>
        <Button onClick={reset} className="mt-5 bg-blue-950 hover:bg-blue-900">
          重新加载
        </Button>
      </div>
    </main>
  );
}
