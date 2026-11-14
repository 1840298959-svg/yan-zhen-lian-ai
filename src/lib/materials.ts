import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import mammoth from "mammoth";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { documentQuality } from "@/lib/document-quality";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MATERIAL_TYPES = [
  "合同",
  "任务书",
  "需求说明书",
  "验收要求书",
  "测试报告",
  "系统截图",
  "运行日志",
  "配置文件",
  "用户手册",
  "培训记录",
] as const;
export const BASELINE_TYPES = new Set([
  "合同",
  "任务书",
  "需求说明书",
  "验收要求书",
]);

const extensionMimeMap: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".txt": ["text/plain", "application/octet-stream"],
  ".csv": [
    "text/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/octet-stream",
  ],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

export const storageRoot = path.resolve(process.env.YZL_DATA_DIR || process.cwd(), "storage", "materials");

export function validateUpload(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!extensionMimeMap[extension])
    return "仅支持 PDF、DOCX、TXT、CSV、PNG、JPG 文件。";
  if (
    !extensionMimeMap[extension].includes(
      file.type || "application/octet-stream",
    )
  )
    return "文件扩展名与内容类型不匹配。";
  if (file.size === 0) return "不能上传空文件。";
  if (file.size > MAX_FILE_SIZE) return "单个文件不能超过 10MB。";
  return null;
}

export async function savePrivateFile(projectId: string, file: File) {
  const projectDir = path.join(storageRoot, projectId);
  await mkdir(projectDir, { recursive: true });
  const extension = path.extname(file.name).toLowerCase();
  const absolutePath = path.join(projectDir, `${randomUUID()}${extension}`);
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  return `storage/materials/${path.relative(storageRoot, absolutePath).replaceAll("\\", "/")}`;
}

export function resolveStoragePath(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  const prefix = "storage/materials/";
  if (!normalized.startsWith(prefix)) throw new Error("不安全的文件路径");
  const absolute = path.join(storageRoot, normalized.slice(prefix.length));
  if (!absolute.startsWith(`${storageRoot}${path.sep}`))
    throw new Error("不安全的文件路径");
  return absolute;
}

export async function removePrivateFile(relativePath: string) {
  if (relativePath.startsWith("demo/")) return;
  try {
    await unlink(resolveStoragePath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

type ParseResult = {
  status: "parsed" | "manual_review";
  content: string | null;
  location: string | null;
};

export async function parseMaterial(
  relativePath: string,
  originalName: string,
): Promise<ParseResult> {
  const extension = path.extname(originalName).toLowerCase();
  const buffer = await readFile(resolveStoragePath(relativePath));
  try {
    if (extension === ".txt" || extension === ".csv") {
      const content = buffer
        .toString("utf8")
        .replace(/^\uFEFF/, "")
        .trim();
      return content
        ? {
            status: "parsed",
            content,
            location:
              extension === ".csv"
                ? `共 ${content.split(/\r?\n/).length} 行`
                : `共 ${content.split(/\r?\n/).length} 行`,
          }
        : { status: "manual_review", content: null, location: null };
    }
    if (extension === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      const paragraphs = result.value
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!paragraphs.length)
        return { status: "manual_review", content: null, location: null };
      return {
        status: "parsed",
        content: paragraphs
          .map((item, index) => `[段落 ${index + 1}] ${item}`)
          .join("\n\n"),
        location: `共 ${paragraphs.length} 个段落`,
      };
    }
    if (extension === ".pdf") {
      const pages: string[] = [];
      const result = await pdf(buffer, {
        pagerender: async (page) => {
          const text = await page.getTextContent({
            normalizeWhitespace: false,
            disableCombineTextItems: false,
          });
          const pageText = text.items
            .map((item: { str?: string }) => item.str ?? "")
            .join(" ")
            .trim();
          pages.push(pageText);
          return pageText;
        },
      });
      const content = pages
        .map((item, index) => `[第 ${index + 1} 页]\n${item}`)
        .join("\n\n")
        .trim();
      const quality = documentQuality(content, true, result.numpages);
      return {
        status: quality.complete ? "parsed" : "manual_review",
        content,
        location: `共 ${result.numpages} 页${quality.emptyPages.length ? `；第 ${quality.emptyPages.join("、")} 页无可靠文本，请识别或核对原件` : ""}`,
      };
    }
    return {
      status: "manual_review",
      content: null,
      location: "图片暂未进行OCR，请人工确认",
    };
  } catch {
    return { status: "manual_review", content: null, location: null };
  }
}
