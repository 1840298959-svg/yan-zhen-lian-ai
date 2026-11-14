"use client";

import { DragEvent, useActionState, useEffect, useRef, useState } from "react";
import {
  uploadMaterial,
  type MaterialActionState,
} from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, UploadCloud, X } from "lucide-react";

const initialState: MaterialActionState = {};
const groups = [
  {
    label: "验收基线材料",
    options: ["合同", "任务书", "需求说明书", "验收要求书"],
  },
  {
    label: "交付证据",
    options: [
      "测试报告",
      "系统截图",
      "运行日志",
      "配置文件",
      "用户手册",
      "培训记录",
    ],
  },
];

export function MaterialUploadForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(uploadMaterial, initialState);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) {
      const timeout = window.setTimeout(() => {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [state]);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    if (inputRef.current && nextFile) {
      const transfer = new DataTransfer();
      transfer.items.add(nextFile);
      inputRef.current.files = transfer.files;
    }
  }

  function useDroppedFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files.item(0);
    if (nextFile) chooseFile(nextFile);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <label
          htmlFor="materialType"
          className="mb-2 block text-sm font-medium text-slate-800"
        >
          材料分类
        </label>
        <select
          id="materialType"
          name="materialType"
          defaultValue="验收要求书"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={useDroppedFile}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-slate-50"}`}
      >
        <input
          ref={inputRef}
          id="material-file"
          name="file"
          type="file"
          className="sr-only"
          accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg"
          onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)}
          required={!file}
        />
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left">
            <span className="flex min-w-0 items-center gap-3">
              <FileUp className="size-5 shrink-0 text-blue-900" />
              <span className="min-w-0">
                <strong className="block truncate text-sm">{file.name}</strong>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              aria-label="移除文件"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="mx-auto size-9 text-blue-900" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              拖拽文件到此处，或{" "}
              <label
                htmlFor="material-file"
                className="cursor-pointer text-blue-800 hover:underline"
              >
                选择文件
              </label>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              支持 PDF、DOCX、TXT、CSV、PNG、JPG，单个文件不超过10MB
            </p>
          </>
        )}
      </div>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || !file}
        className="w-full bg-blue-950 hover:bg-blue-900"
      >
        {pending ? <Loader2 className="animate-spin" /> : <FileUp />}
        {pending ? "正在上传并解析…" : "上传并解析"}
      </Button>
    </form>
  );
}
