"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractProjectClauses } from "@/app/actions/clauses";
import { matchProjectEvidence } from "@/app/actions/matching";
import { Button } from "@/components/ui/button";
import { Loader2, Play, RotateCcw } from "lucide-react";

export function ReviewRunner({ projectId, hasBaseline }: { projectId: string; hasBaseline: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function run(mode: "all" | "match") {
    setBusy(true);
    const data = new FormData(); data.set("projectId", projectId);
    try {
      if (mode === "all") {
        setMessage("步骤 1/2：分段提取验收条款，正在校验原文和来源…");
        const extraction = await extractProjectClauses(data);
        if (!extraction.ok) { setMessage(extraction.message); return; }
        setMessage(`步骤 1/2 完成。${extraction.message} 正在逐批匹配交付证据…`);
      } else setMessage("正在重新核验证据，已保存的人工结论将被保留…");
      const match = await matchProjectEvidence(data);
      setMessage(match.message + (match.ok ? " 请逐条检查证据并完成人工复核。" : ""));
    } catch { setMessage("本次请求中断，请查看下方记录后重试。此前保存的数据仍然保留。"); }
    finally { setBusy(false); router.refresh(); }
  }
  return <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold text-teal-950">启动项目预检</h2><p className="mt-1 text-sm text-teal-900">提取条款 → 核对原文 → 匹配证据。结果保存后由你逐条复核。</p></div>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !hasBaseline} onClick={() => run("all")} className="bg-teal-800 hover:bg-teal-900">{busy ? <Loader2 className="animate-spin" /> : <Play />}提取并核验</Button><Button variant="outline" disabled={busy} onClick={() => run("match")}><RotateCcw />只重跑证据</Button></div>
    </div>
    {message && <p role="status" className="mt-4 rounded-lg bg-white p-3 text-sm leading-6 text-teal-900">{message}</p>}
  </div>;
}
