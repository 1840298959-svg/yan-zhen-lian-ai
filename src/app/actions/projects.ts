"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations/project";
import { redirect } from "next/navigation";

export type CreateProjectState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createProject(_: CreateProjectState, formData: FormData): Promise<CreateProjectState> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"), code: formData.get("code"), description: formData.get("description"),
    acceptanceVersion: formData.get("acceptanceVersion"), owner: formData.get("owner") || undefined,
  });
  if (!parsed.success) return { error: "请检查表单中的内容。", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await prisma.project.create({ data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "该项目编号已存在，请更换后重试。" };
    return { error: "创建项目失败，请稍后重试。" };
  }
  redirect("/?created=1");
}
