"use client";

import { useState } from "react";
import { deleteClause, saveClause } from "@/app/actions/clauses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

export type ClauseRow = {
  id: string;
  clauseId: string;
  originalText: string;
  object: string;
  metric: string;
  condition: string;
  method: string;
  requiredEvidence: string;
  sourceFile: string;
  sourceLocation: string;
  confidence: number;
  confirmationStatus: string;
};

const emptyClause = {
  id: "",
  clauseId: "",
  originalText: "",
  object: "",
  metric: "",
  condition: "",
  method: "",
  requiredEvidence: "",
  sourceFile: "人工新增",
  sourceLocation: "未标注",
  confidence: 0.5,
  confirmationStatus: "pending",
};

function statusLabel(status: string, confidence: number) {
  return status === "confirmed"
    ? ["已确认", "bg-emerald-100 text-emerald-800"]
    : confidence < 0.75 || status === "needs_review"
      ? ["需要人工确认", "bg-amber-100 text-amber-800"]
      : ["待确认", "bg-blue-100 text-blue-800"];
}

export function ClauseEditor({
  projectId,
  clauses,
}: {
  projectId: string;
  clauses: ClauseRow[];
}) {
  const [editing, setEditing] = useState<ClauseRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const beginAdd = () =>
    setEditing({
      ...emptyClause,
      clauseId: `AC-${String(clauses.length + 1).padStart(2, "0")}`,
    });
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          共 {clauses.length} 条 · 原始条款始终保留在“原始条款”字段中
        </p>
        <Button
          type="button"
          onClick={beginAdd}
          className="bg-blue-950 hover:bg-blue-900"
        >
          <Plus />
          新增条款
        </Button>
      </div>
      {clauses.length ? (
        <form
          action={async (formData) => {
            await (
              await import("@/app/actions/clauses")
            ).confirmClauses(formData);
            setSelected([]);
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          {selected.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === clauses.length}
                        onChange={() =>
                          setSelected(
                            selected.length === clauses.length
                              ? []
                              : clauses.map((item) => item.id),
                          )
                        }
                        aria-label="全选条款"
                      />
                    </th>
                    <th className="px-4 py-3">编号</th>
                    <th className="px-4 py-3">原始条款</th>
                    <th className="px-4 py-3">验收对象 / 指标</th>
                    <th className="px-4 py-3">来源位置</th>
                    <th className="px-4 py-3">置信度</th>
                    <th className="px-4 py-3">人工确认</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {clauses.map((clause) => {
                    const [label, style] = statusLabel(
                      clause.confirmationStatus,
                      clause.confidence,
                    );
                    return (
                      <tr
                        key={clause.id}
                        className="align-top hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(clause.id)}
                            onChange={() => toggle(clause.id)}
                            aria-label={`选择${clause.clauseId}`}
                          />
                        </td>
                        <td className="px-4 py-4 font-mono font-semibold text-blue-900">
                          {clause.clauseId}
                        </td>
                        <td className="max-w-sm px-4 py-4">
                          <p className="line-clamp-3 leading-6 text-slate-800">
                            {clause.originalText}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">
                            {clause.object}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {clause.metric}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-700">{clause.sourceFile}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {clause.sourceLocation}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-700">
                          {Math.round(clause.confidence * 100)}%
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(clause)}
                            >
                              <Pencil />
                              编辑
                            </Button>
                            <form action={deleteClause}>
                              <input
                                type="hidden"
                                name="id"
                                value={clause.id}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-red-700 hover:bg-red-50"
                              >
                                <Trash2 />
                                删除
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={!selected.length}>
              <Save />
              批量确认{selected.length ? `（${selected.length}）` : ""}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-sm text-slate-500">
          暂无条款，请先执行提取或新增条款。
        </div>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="编辑验收条款"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  {editing.id ? "编辑验收条款" : "新增验收条款"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  原始条款不可被系统自动删除，请人工核对后保存。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="关闭"
              >
                <X />
              </button>
            </div>
            <form
              action={async (formData) => {
                const result = await saveClause(formData);
                if (result.ok) setEditing(null);
              }}
              className="space-y-4 p-5"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="id" value={editing.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  条款编号
                  <Input
                    name="clauseId"
                    defaultValue={editing.clauseId}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  置信度（0-1）
                  <Input
                    name="confidence"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    defaultValue={editing.confidence}
                    required
                  />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium">
                原始条款
                <Textarea
                  name="originalText"
                  defaultValue={editing.originalText}
                  rows={3}
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  验收对象
                  <Input name="object" defaultValue={editing.object} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  验收指标
                  <Input name="metric" defaultValue={editing.metric} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  判断条件
                  <Input
                    name="condition"
                    defaultValue={editing.condition}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  验收方式
                  <Input name="method" defaultValue={editing.method} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                  所需证据（用逗号或换行分隔）
                  <Input
                    name="requiredEvidence"
                    defaultValue={editing.requiredEvidence
                      .replace(/[\[\]"]/g, "")
                      .replaceAll(",", "，")}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  来源文件
                  <Input
                    name="sourceFile"
                    defaultValue={editing.sourceFile}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  来源页码或段落
                  <Input
                    name="sourceLocation"
                    defaultValue={editing.sourceLocation}
                    required
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  取消
                </Button>
                <Button type="submit" className="bg-blue-950 hover:bg-blue-900">
                  <Save />
                  保存条款
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
