import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <FileQuestion className="mx-auto size-10 text-slate-500" />
        <h1 className="mt-4 text-xl font-semibold text-slate-950">
          找不到这个页面
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          项目可能已被删除，或地址不完整。
        </p>
        <Link
          href="/"
          className={buttonVariants({
            className: "mt-5 bg-blue-950 hover:bg-blue-900",
          })}
        >
          返回项目概览
        </Link>
      </div>
    </main>
  );
}
