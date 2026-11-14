"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recognizeMaterial } from "@/lib/material-recognition";
import { documentQuality } from "@/lib/document-quality";
import {
  MATERIAL_TYPES,
  parseMaterial,
  removePrivateFile,
  savePrivateFile,
  validateUpload,
} from "@/lib/materials";

export type MaterialActionState = { ok?: boolean; message?: string };

const metadataSchema = z.object({
  projectId: z.string().cuid(),
  materialType: z.enum(MATERIAL_TYPES),
});

export async function uploadMaterial(
  _: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const parsed = metadataSchema.safeParse({
    projectId: formData.get("projectId"),
    materialType: formData.get("materialType"),
  });
  if (!parsed.success) return { message: "材料分类或项目参数无效。" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { message: "请选择需要上传的文件。" };
  const validationError = validateUpload(file);
  if (validationError) return { message: validationError };
  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true },
  });
  if (!project) return { message: "项目不存在或已被删除。" };
  if (await prisma.material.count({ where: { projectId: project.id, name: file.name } })) {
    return { message: "项目中已有同名文件，请在文件名中标明版本后上传，避免来源混淆。" };
  }
  let storagePath: string | null = null;
  try {
    storagePath = await savePrivateFile(project.id, file);
    const parseResult = await parseMaterial(storagePath, file.name);
    await prisma.material.create({
      data: {
        projectId: project.id,
        name: file.name,
        category: parsed.data.materialType,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storagePath,
        parseStatus: parseResult.status,
        parsedContent: parseResult.content,
        sourceLocation: parseResult.location,
      },
    });
    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/materials`);
    return {
      ok: true,
      message:
        parseResult.status === "parsed"
          ? "材料上传并解析成功。"
          : "材料已上传，但解析结果需要人工确认。",
    };
  } catch {
    if (storagePath) await removePrivateFile(storagePath);
    return { message: "材料上传失败，请检查文件后重试。" };
  }
}

export async function recognizeMaterialAction(formData: FormData) {
  const id = z.string().cuid().safeParse(formData.get("materialId"));
  if (!id.success) return { ok: false, message: "材料参数无效。" };
  try {
    const result = await recognizeMaterial(id.data);
    const material = await prisma.material.findUniqueOrThrow({ where: { id: id.data } });
    revalidatePath(`/projects/${material.projectId}`, "layout");
    return result;
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "识别失败，原内容已保留。" }; }
}

export async function saveMaterialTranscript(formData: FormData) {
  const parsed = z.object({ id: z.string().cuid(), content: z.string().trim().min(1).max(2_000_000), original: z.string() }).safeParse({
    id: formData.get("materialId"), content: formData.get("content"), original: formData.get("original"),
  });
  if (!parsed.success) return { ok: false, message: "请输入有效的材料全文。" };
  const material = await prisma.material.findUnique({ where: { id: parsed.data.id } });
  if (!material) return { ok: false, message: "材料已不存在。" };
  if ((material.parsedContent ?? "") !== parsed.data.original) return { ok: false, message: "内容已经更新，请关闭弹窗后重新打开。" };
  const isPdf = /\.pdf$/i.test(material.name);
  const pageCount = material.sourceLocation?.match(/^共\s*(\d+)\s*页/)?.[1];
  if (!documentQuality(parsed.data.content, isPdf, pageCount ? Number(pageCount) : undefined).complete) {
    return { ok: false, message: "请按原件页数保留连续且不重复的 [第 n 页] 标记并补全各页内容。原件空白页可写[原件空白页]。" };
  }
  const saved = await prisma.$transaction(async (tx) => {
    const updated = await tx.material.updateMany({
      where: { id: material.id, parsedContent: material.parsedContent, parseStatus: material.parseStatus },
      data: { parsedContent: parsed.data.content, parseStatus: "verified", sourceLocation: `${pageCount ? `共 ${pageCount} 页` : "原件"}；人工已核对转录` },
    });
    if (!updated.count) return false;
    await tx.reviewEvent.create({ data: { projectId: material.projectId, action: "确认材料转录", target: material.name,
      detail: JSON.stringify({ before: material.parsedContent, after: parsed.data.content }) } });
    return true;
  });
  if (!saved) return { ok: false, message: "内容已经更新，请关闭弹窗后重新打开。" };
  revalidatePath(`/projects/${material.projectId}`, "layout");
  return { ok: true, message: "转录已确认并留痕。材料有变更时请重新提取和匹配。" };
}

export async function deleteMaterial(formData: FormData) {
  const id = z.string().cuid().safeParse(formData.get("materialId"));
  if (!id.success) return;
  const material = await prisma.material.findUnique({ where: { id: id.data } });
  if (!material) return;
  await prisma.$transaction(async (tx) => {
    const evidence = await tx.evidence.findMany({
      where: {
        projectId: material.projectId,
        OR: [
          { evidenceId: { startsWith: "AI-", endsWith: `-${material.id}` } },
          { evidenceId: { startsWith: "MANUAL-", endsWith: `-${material.id}` } },
          { evidenceId: `AI-${material.id.slice(-10)}` },
        ],
      },
      select: { id: true },
    });
    const ids = evidence.map((item) => item.id);
    await tx.risk.deleteMany({ where: { projectId: material.projectId, evidenceId: { in: ids } } });
    await tx.evidence.deleteMany({ where: { id: { in: ids } } });
    await tx.material.delete({ where: { id: material.id } });
    await tx.reviewEvent.create({ data: {
      projectId: material.projectId,
      action: "删除材料",
      target: material.name,
      detail: JSON.stringify({ materialId: material.id, category: material.category }),
    } });
  });
  await removePrivateFile(material.storagePath);
  revalidatePath("/");
  revalidatePath(`/projects/${material.projectId}`, "layout");
}

export async function initializeDemoMaterials(formData: FormData) {
  const projectId = z.string().cuid().safeParse(formData.get("projectId"));
  if (!projectId.success) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId.data },
    select: { id: true, isDemo: true },
  });
  if (!project?.isDemo) return;
  await prisma.material.deleteMany({
    where: { projectId: project.id, storagePath: { startsWith: "demo/" } },
  });
  await prisma.material.createMany({
    data: [
      {
        projectId: project.id,
        name: "验收要求书（模拟）.txt",
        category: "验收要求书",
        mimeType: "text/plain",
        size: 6380,
        storagePath: "demo/acceptance.txt",
        parseStatus: "parsed",
        sourceLocation: "共12个段落",
        parsedContent:
          "[段落 1] AC-01 系统应支持管理员、客服、只读用户三类角色。\n\n[段落 4] AC-04 在标准测试数据下，工单查询响应时间不得超过2.0秒。\n\n[段落 6] AC-06 系统应每日自动备份，并保留备份数据180天。\n\n[段落 8] AC-08 系统应支持将工单明细导出为CSV文件。\n\n[段落 12] AC-12 本次交付版本应为V2.0。",
      },
      {
        projectId: project.id,
        name: "功能测试报告V1.8（模拟）.txt",
        category: "测试报告",
        mimeType: "text/plain",
        size: 4520,
        storagePath: "demo/test-report.txt",
        parseStatus: "parsed",
        sourceLocation: "共8个段落",
        parsedContent:
          "[段落 1] 测试报告版本：V1.8。\n\n[段落 3] 已完成管理员和客服两类角色权限测试。\n\n[段落 5] 查询性能P95为2.7秒。\n\n[段落 7] 当前支持导出XLSX格式。",
      },
      {
        projectId: project.id,
        name: "系统首页截图（模拟）.png",
        category: "系统截图",
        mimeType: "image/png",
        size: 128000,
        storagePath: "demo/dashboard.png",
        parseStatus: "manual_review",
        sourceLocation: "图片暂未进行OCR，请人工确认",
        parsedContent: null,
      },
    ],
  });
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/materials`);
}
