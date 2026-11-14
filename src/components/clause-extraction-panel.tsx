"use client";

import { useState } from "react";
import { extractProjectClauses } from "@/app/actions/clauses";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function ClauseExtractionPanel({
  projectId,
  hasBaseline,
}: {
  projectId: string;
  hasBaseline: boolean;
}) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"demo" | "ai" | "">("");
  const [pending, setPending] = useState(false);
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 font-medium text-blue-950">
            <Sparkles className="size-4" />
            从已解析的验收基线材料提取条款
          </p>
          <p className="mt-1 text-sm text-blue-800">
            {hasBaseline
              ? "提取结果会保留原始条款和来源位置。低于75%的结果需要人工确认。"
              : "请先上传并解析验收基线材料。内置条款仅供模拟案例使用。"}
          </p>
        </div>
        <form
          action={async (formData) => {
            setPending(true);
            setMessage("");
            const result = await extractProjectClauses(formData);
            setPending(false);
            setMessage(result.message ?? "");
            setMode(result.mode ?? "");
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <Button
            type="submit"
            disabled={pending}
            className="shrink-0 bg-blue-950 hover:bg-blue-900"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {pending ? "正在提取…" : "提取验收条款"}
          </Button>
        </form>
      </div>
      {message && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-blue-900"
        >
          {mode === "demo" && (
            <strong className="mr-1 text-teal-700">演示模式</strong>
          )}
          {message}
        </p>
      )}
    </div>
  );
}
