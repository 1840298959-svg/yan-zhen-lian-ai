"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteMaterial, recognizeMaterialAction, saveMaterialTranscript } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, ScanText, Trash2, X, Loader2, ExternalLink, CheckCheck } from "lucide-react";

export type MaterialRow = { id: string; name: string; category: string; mimeType: string; size: number; parseStatus: string; parsedContent: string | null; sourceLocation: string | null; createdAt: string; hasPreview: boolean };
const statusLabels: Record<string, string> = { parsed: "文本已解析", verified: "转录已核对", vision_review: "视觉转录待核对", manual_review: "需识别或补录", pending: "待解析" };

function TranscriptEditor({ material }: { material: MaterialRow }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <form action={async (data) => {
    setPending(true);
    try { const result = await saveMaterialTranscript(data); setMessage(result.message); }
    catch { setMessage("保存失败，请重试。"); } finally { setPending(false); }
  }} className="flex h-full flex-col gap-3">
    <input type="hidden" name="materialId" value={material.id} />
    <input type="hidden" name="original" value={material.parsedContent ?? ""} />
    <label htmlFor="transcript" className="text-sm font-semibold">可核对的转录文本</label>
    <p className="text-xs leading-5 text-slate-500">对照原件检查数字、单位、版本与否定词。PDF 请保留 [第 n 页] 标记；真正的空白页填写 [原件空白页]。</p>
    <textarea id="transcript" name="content" defaultValue={material.parsedContent ?? ""} className="min-h-80 w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7" placeholder="可先点击视觉识别，或在此录入经核对的材料全文。" required />
    <Button type="submit" disabled={pending}><CheckCheck />{pending ? "保存中…" : "确认已核对原件并保存"}</Button>
    {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
  </form>;
}

export function MaterialList({ materials }: { materials: MaterialRow[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [viewingId, setViewingId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const viewing = materials.find((m) => m.id === viewingId);
  if (!materials.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center"><FileText className="mx-auto size-8 text-slate-400" /><p className="mt-3 text-sm text-slate-600">上传材料后在这里检查原件和解析内容。</p></div>;
  return <>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["材料", "分类 / 大小", "解析状态", "操作"].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{materials.map((material) => <tr key={material.id}>
          <td className="max-w-xs px-4 py-4"><p className="break-words font-medium">{material.name}</p><p className="mt-1 text-xs text-slate-500">{material.sourceLocation || material.createdAt}</p></td>
          <td className="px-4 py-4 text-slate-500">{material.category}<p className="mt-1 text-xs">{(material.size / 1024 / 1024).toFixed(2)} MB</p></td>
          <td className="px-4 py-4"><Badge className={["parsed", "verified"].includes(material.parseStatus) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{statusLabels[material.parseStatus] ?? "待检查"}</Badge></td>
          <td className="px-4 py-4"><div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setViewingId(material.id); setMessage(""); dialog.current?.showModal(); }}><Eye />核对原件</Button>
            <form action={deleteMaterial} onSubmit={(e) => { if (!confirm(`确定删除“${material.name}”及其证据关联吗？`)) e.preventDefault(); }}><input type="hidden" name="materialId" value={material.id} /><Button type="submit" variant="ghost" size="sm" aria-label={`删除 ${material.name}`}><Trash2 className="text-red-700" /></Button></form>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <dialog ref={dialog} onClose={() => setViewingId(undefined)} aria-labelledby="material-title" className="fixed inset-0 m-auto max-h-[94vh] w-[96vw] max-w-7xl overflow-auto rounded-2xl bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50">
      {viewing && <>
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-5">
          <div><h2 id="material-title" className="font-semibold">{viewing.name}</h2><p className="mt-1 text-xs text-slate-500">原件与转录对照 · {statusLabels[viewing.parseStatus]}</p></div>
          <div className="flex items-center gap-2">
            {viewing.hasPreview && (viewing.mimeType.startsWith("image/") || /\.pdf$/i.test(viewing.name)) && <Button disabled={pending} variant="outline" onClick={async () => {
              setPending(true); setMessage("正在逐页识别，完成后请核对转录内容…");
              const data = new FormData(); data.set("materialId", viewing.id);
              try { const result = await recognizeMaterialAction(data); setMessage(result.message); router.refresh(); }
              catch { setMessage("识别中断，原内容已保留。可在审查中心查看记录。"); } finally { setPending(false); }
            }}>{pending ? <Loader2 className="animate-spin" /> : <ScanText />}{pending ? "识别中…" : "视觉识别"}</Button>}
            <Button variant="ghost" aria-label="关闭材料核对" onClick={() => dialog.current?.close()}><X /></Button>
          </div>
        </div>
        {message && <p role="status" className="mx-5 mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <section className="min-w-0"><div className="mb-3 flex justify-between"><h3 className="text-sm font-semibold">原始材料</h3>{viewing.hasPreview && <a className="flex items-center gap-1 text-xs text-teal-800" href={`/api/materials/${viewing.id}/file?download=1`}><ExternalLink className="size-3" />下载原件</a>}</div>
            {!viewing.hasPreview ? <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">此演示条目未附原件。</p> : viewing.mimeType.startsWith("image/") ? <Image src={`/api/materials/${viewing.id}/file`} alt={viewing.name} width={1400} height={1000} unoptimized className="h-auto w-full rounded-xl border border-slate-200" /> : /\.pdf$/i.test(viewing.name) ? <iframe title={`${viewing.name} 原件`} src={`/api/materials/${viewing.id}/file`} className="h-[65vh] w-full rounded-xl border border-slate-200" /> : <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7">{viewing.parsedContent || "请下载原件进行核对。"}</pre>}
          </section>
          <section className="min-w-0"><TranscriptEditor key={`${viewing.id}-${viewing.parseStatus}-${viewing.parsedContent}`} material={viewing} /></section>
        </div>
      </>}
    </dialog>
  </>;
}
