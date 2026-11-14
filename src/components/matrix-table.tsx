"use client";

import { useRef, useState } from "react";
import { Eye, FileDown, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManualEvidenceForm } from "@/components/manual-evidence-form";

export type MatrixRow = {
  id: string;
  clauseId: string;
  originalText: string;
  condition: string;
  missingReason?: string;
  matches: Array<{
    id: string;
    status: string;
    reason: string;
    confidence: number;
    requiresHumanReview: boolean;
    manual: boolean;
    evidence: { fileName: string; sourceLocation: string; excerpt: string; materialId?: string };
  }>;
};

const statuses: Record<string, [string, string]> = {
  satisfied: ["满足", "bg-emerald-100 text-emerald-900"],
  partial: ["部分满足", "bg-amber-100 text-amber-900"],
  failed: ["不满足", "bg-red-100 text-red-900"],
  uncertain: ["待确认", "bg-blue-100 text-blue-900"],
  missing: ["缺少证据", "bg-slate-100 text-slate-700"],
  pending: ["未核验", "bg-slate-100 text-slate-700"],
};

function statusFor(row: MatrixRow) {
  return row.matches[0]?.status ?? (row.missingReason ? "missing" : "pending");
}

export function MatrixTable({ rows, projectId, materials }: {
  rows: MatrixRow[]; projectId: string; materials: { id: string; name: string; category: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const selected = rows.find((row) => row.id === selectedId);
  const keyword = query.trim().toLowerCase();
  const visible = rows.filter((row) =>
    (!status || statusFor(row) === status) &&
    [row.clauseId, row.originalText, row.condition, ...row.matches.map((match) => match.evidence.fileName)]
      .some((value) => value.toLowerCase().includes(keyword)),
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <label className="flex min-w-44 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3">
            <Search className="size-4 text-slate-500" />
            <input aria-label="搜索条款或证据" placeholder="搜索条款编号、原文或证据文件" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 py-2 text-sm outline-none" />
          </label>
          <select aria-label="匹配状态" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部状态</option>
            {Object.entries(statuses).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <span aria-live="polite" className="self-center px-2 text-sm text-slate-600">{visible.length} / {rows.length} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>{["条款", "验收要求", "匹配状态", "候选证据 / 位置", "复核"].map((label) => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => {
                const match = row.matches[0];
                const [label, tone] = statuses[statusFor(row)] ?? statuses.uncertain;
                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 font-mono font-semibold text-teal-800">{row.clauseId}</td>
                    <td className="max-w-md px-4 py-4"><p className="line-clamp-2 leading-6">{row.originalText}</p><p className="mt-1 text-xs text-slate-600">{row.condition}</p></td>
                    <td className="whitespace-nowrap px-4 py-4"><Badge className={tone}>{label}</Badge></td>
                    <td className="max-w-xs px-4 py-4 text-slate-700">
                      {match ? <><p className="break-words font-medium">{match.evidence.fileName}</p><p className="mt-1 text-xs text-slate-600">{match.evidence.sourceLocation}</p></> : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedId(row.id); dialog.current?.showModal(); }}><Eye /> 查看</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && <p className="px-4 py-10 text-center text-sm text-slate-600">{rows.length ? "没有符合筛选条件的条款。" : "请先录入验收条款。"}</p>}
        </div>
      </div>
      <dialog ref={dialog} onClose={() => setSelectedId(undefined)} aria-labelledby="evidence-panel-title" className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-xl overflow-auto border-l border-slate-200 bg-white text-slate-950 shadow-2xl backdrop:bg-slate-950/45">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 id="evidence-panel-title" className="font-semibold">证据复核 · {selected?.clauseId}</h2>
          <Button variant="ghost" size="sm" aria-label="关闭证据复核" onClick={() => dialog.current?.close()}><X /></Button>
        </div>
        {selected && <div className="space-y-5 p-5">
          <section className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold">原始验收条款</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.originalText}</p>
          </section>
          {selected.matches.map((match) => {
            const [label, tone] = statuses[match.status] ?? statuses.uncertain;
            return (
              <section key={match.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2"><Badge className={tone}>{label}</Badge><span className="text-xs text-slate-600">{match.manual ? "人工录入" : `置信度 ${Math.round(match.confidence * 100)}%`}{match.requiresHumanReview && " · 需复核"}</span></div>
                <div><h3 className="break-words text-sm font-semibold">{match.evidence.fileName}</h3><p className="mt-1 text-xs text-slate-600">{match.evidence.sourceLocation}</p></div>
                <blockquote className="whitespace-pre-wrap rounded-lg bg-teal-50 p-3 text-sm leading-6 text-teal-950">{match.evidence.excerpt}</blockquote>
                <p className="text-sm leading-6 text-slate-700">{match.reason}</p>
                {match.evidence.materialId && <a className="inline-flex items-center gap-2 text-sm font-medium text-teal-800 hover:underline" href={`/api/materials/${match.evidence.materialId}/file?download=1`}><FileDown className="size-4" /> 下载原始材料</a>}
              </section>
            );
          })}
          {!selected.matches.length && <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">{selected.missingReason ?? "该条款尚未运行证据核验。"}</p>}
          <ManualEvidenceForm key={selected.id} projectId={projectId} clauseId={selected.id} materials={materials} />
        </div>}
      </dialog>
    </>
  );
}
