"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import { updateRiskStatus } from "@/app/actions/risks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RiskRow = {
  id: string;
  level: string;
  type: string;
  description: string;
  suggestion: string;
  status: string;
  clause: { clauseId: string } | null;
  evidence: { evidenceId: string; fileName: string; sourceLocation: string } | null;
};

const levels: Record<string, [string, string]> = {
  high: ["高", "bg-red-100 text-red-800"],
  medium: ["中", "bg-amber-100 text-amber-800"],
  low: ["低", "bg-slate-100 text-slate-700"],
};

function RiskStatusForm({ projectId, risk }: { projectId: string; risk: RiskRow }) {
  const isOpen = risk.status === "open";
  const [result, action, pending] = useActionState(
    async (_: { ok: boolean; message: string } | null, formData: FormData) => updateRiskStatus(formData),
    null,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={risk.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="status" value={isOpen ? "closed" : "open"} />
      <Button size="sm" type="submit" variant="outline" disabled={pending}>
        {isOpen ? <CheckCircle2 /> : <RotateCcw />} {pending ? "保存中…" : isOpen ? "标记已处理" : "重新打开"}
      </Button>
      {result && !result.ok && <span role="alert" className="text-xs text-red-800">{result.message}</span>}
    </form>
  );
}

export function RiskList({ projectId, risks }: { projectId: string; risks: RiskRow[] }) {
  const [status, setStatus] = useState("all");
  const [level, setLevel] = useState("all");
  const visible = risks.filter((risk) =>
    (status === "all" || (risk.status === "open") === (status === "open")) &&
    (level === "all" || risk.level === level),
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select aria-label="风险处理状态" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="all">全部处理状态</option><option value="open">待处理</option><option value="closed">已处理</option>
        </select>
        <select aria-label="风险级别" value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="all">全部级别</option>
          {Object.entries(levels).map(([value, [label]]) => <option key={value} value={value}>{label}风险</option>)}
        </select>
        <span aria-live="polite" className="ml-auto text-sm text-slate-600">显示 {visible.length} / {risks.length} 项</span>
      </div>
      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((risk) => {
            const [levelLabel, tone] = levels[risk.level] ?? levels.medium;
            return (
              <article id={`risk-${risk.id}`} key={risk.id} className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-5 target:border-teal-600 target:ring-2 target:ring-teal-200">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={tone}>{levelLabel}风险</Badge>
                  <Badge variant="outline">{risk.type}</Badge>
                  <span className="ml-auto text-xs font-medium text-slate-600">{risk.status === "open" ? "待处理" : "已处理"}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-6">{risk.description}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">整改建议　{risk.suggestion}</p>
                <p className="mt-3 text-xs leading-5 text-slate-600">{risk.clause?.clauseId ?? "未关联条款"} · {risk.evidence ? `${risk.evidence.fileName} · ${risk.evidence.sourceLocation}` : "无关联证据"}</p>
                <div className="mt-3 border-t border-slate-100 pt-3"><RiskStatusForm projectId={projectId} risk={risk} /></div>
              </article>
            );
          })}
        </div>
      ) : <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-10 text-sm text-slate-600"><ShieldAlert className="size-4" />{risks.length ? "没有符合筛选条件的风险。" : "当前没有风险记录。完成核验后可在这里跟踪问题。"}</p>}
    </div>
  );
}
