"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

const projectLinks = [
  ["审查中心", "/review"], ["项目概览", ""], ["材料管理", "/materials"], ["验收条款", "/clauses"],
  ["证据矩阵", "/matrix"], ["风险清单", "/risks"], ["预检报告", "/report"],
];

export function AppHeader({ aiConfigured }: { aiConfigured: boolean }) {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const links = projectId && projectId !== "new" ? projectLinks.map(([label, suffix]) => [label, `/projects/${projectId}${suffix}`]) : [["验收工作台", "/"]];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-8">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-teal-200"><ShieldCheck className="size-5" /></span>
            <strong className="text-base font-semibold text-slate-950">验真链 AI</strong>
          </Link>
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${aiConfigured ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`}>
            {aiConfigured ? "AI 接口已配置" : "AI 未配置 · 可手动录入"}
          </span>
        </div>
        <nav aria-label="主导航" className="flex gap-4 overflow-x-auto sm:gap-6">
          {links.map(([label, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium ${pathname === href ? "border-teal-700 text-teal-800" : "border-transparent text-slate-600 hover:text-slate-950"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
