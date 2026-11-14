"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer, PlayCircle } from "lucide-react";
import { runDemoCase } from "@/app/actions/report";

export type CsvRow = {
  clauseId: string;
  requirement: string;
  status: string;
  evidence: string;
  location: string;
  confidence: string;
  risk: string;
  review: string;
  clauseFile: string;
  clauseLocation: string;
  evidenceExcerpt: string;
};

function csvCell(value: string) {
  const flattened = value.replace(/[\r\n]+/g, " ");
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(flattened) || /^[\t\r]/.test(value) ? "'" + flattened : flattened;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function ReportTools({
  projectId,
  isDemo,
  rows,
}: {
  projectId: string;
  isDemo: boolean;
  rows: CsvRow[];
}) {
  const [pending, setPending] = useState(false);
  function downloadCsv() {
    const header = [
      "数据类型",
      "条款编号",
      "验收要求",
      "匹配状态",
      "候选证据",
      "证据位置",
      "匹配置信度",
      "风险说明",
      "人工复核",
      "条款来源",
      "条款位置",
      "证据摘录",
    ];
    const body = rows.map((row) =>
      [
        isDemo ? "模拟案例" : "项目预检",
        row.clauseId,
        row.requirement,
        row.status,
        row.evidence,
        row.location,
        row.confidence,
        row.risk,
        row.review,
        row.clauseFile,
        row.clauseLocation,
        row.evidenceExcerpt,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(
      ["\uFEFF" + [header.map(csvCell).join(","), ...body].join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isDemo ? "验真链AI-模拟案例-证据矩阵.csv" : "验真链AI-证据矩阵.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="report-tools flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={downloadCsv}>
        <Download />
        导出CSV
      </Button>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer />
        打印 / PDF
      </Button>
      {isDemo && (
        <form
          action={async (formData) => {
            setPending(true);
            await runDemoCase(formData);
            setPending(false);
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <Button
            type="submit"
            className="bg-teal-800 hover:bg-teal-900"
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <PlayCircle />}
            {pending ? "正在运行…" : "一键运行模拟案例"}
          </Button>
        </form>
      )}
    </div>
  );
}
