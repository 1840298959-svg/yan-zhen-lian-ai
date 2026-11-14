"use client";

import { useState } from "react";
import { matchProjectEvidence } from "@/app/actions/matching";
import { Button } from "@/components/ui/button";
import { Loader2, SearchCheck } from "lucide-react";

export function MatchingRunner({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 font-medium text-teal-950">
            <SearchCheck className="size-4" />
            运行证据匹配与规则检查
          </p>
          <p className="mt-1 text-sm text-teal-800">
            仅绑定已有文件和明确位置；找不到证据时输出“缺少证据”。
          </p>
        </div>
        <form
          action={async (formData) => {
            setPending(true);
            setMessage("");
            const result = await matchProjectEvidence(formData);
            setMessage(result.message);
            setPending(false);
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <Button
            type="submit"
            disabled={pending}
            className="bg-teal-800 hover:bg-teal-900"
          >
            {pending ? <Loader2 className="animate-spin" /> : <SearchCheck />}
            {pending ? "检查中…" : "开始匹配"}
          </Button>
        </form>
      </div>
      {message && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-teal-900"
        >
            {message}
        </p>
      )}
    </div>
  );
}
