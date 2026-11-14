"use client";

import { useActionState } from "react";
import { saveManualEvidence } from "@/app/actions/matching";
import { Button } from "@/components/ui/button";

export function ManualEvidenceForm({ projectId, clauseId, materials }: {
  projectId: string; clauseId: string; materials: { id: string; name: string; category: string }[];
}) {
  const [state, action, pending] = useActionState(saveManualEvidence, null);
  const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">录入人工复核结论</summary>
      {materials.length ? <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="clauseId" value={clauseId} />
        <label className="block space-y-1 text-sm">交付材料
          <select required name="materialId" defaultValue="" className={field}>
            <option value="" disabled>选择原始材料</option>
            {materials.map((material) => <option key={material.id} value={material.id}>{material.category} · {material.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">证据位置<input required name="location" maxLength={200} placeholder="例如第 3 页、表 2" className={field} /></label>
        <label className="block space-y-1 text-sm">原文摘录或截图所见<textarea required name="excerpt" maxLength={1600} rows={2} className={field} /></label>
        <label className="block space-y-1 text-sm">人工结论
          <select name="status" defaultValue="uncertain" className={field}>
            <option value="uncertain">待确认</option><option value="satisfied">满足</option><option value="partial">部分满足</option><option value="failed">不满足</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">判定理由<textarea required name="reason" maxLength={800} rows={2} className={field} /></label>
        <Button type="submit" disabled={pending}>{pending ? "保存中…" : "保存人工结论"}</Button>
        {state && <p role="status" className={state.ok ? "text-sm text-teal-800" : "text-sm text-red-800"}>{state.message}</p>}
      </form> : <p className="mt-3 text-sm text-slate-600">请先在材料管理上传交付证据。</p>}
    </details>
  );
}
