/* eslint-disable @typescript-eslint/no-require-imports -- Load the TypeScript app modules after setting the temporary database URL. */
const { loadEnvConfig } = require("@next/env");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const OpenAI = require("openai");

const gateway = process.argv.includes("--gateway") ? require("./gateway-benchmark.json") : null;
const pdfName = gateway?.pdf ?? "long-acceptance.pdf";
const expectedPages = new Map(gateway ? Object.entries(gateway.clauses).map(([id, expected]) => [id, expected.page]) : Array.from({ length: 8 }, (_, index) => [
  `K-0${index + 1}`,
  index + 2,
]));
const expectedImages = gateway?.images ?? [
  "管理员 / 客服 / 只读用户", "P95 2.7 秒", "保留策略：未配置",
  "导出 XLSX", "V1.8", "记录完整",
].map((value, index) => ({ name: `evidence-${index + 1}.png`, value, id: `SIM-IMG-${index + 1}` }));
const expectedMatches = new Map(gateway ? Object.entries(gateway.clauses) : [
  ["K-01", { image: 1, statuses: ["uncertain", "partial"] }],
  ["K-02", { image: null, statuses: ["missing"] }],
  ["K-03", { image: 2, statuses: ["failed"] }],
  ["K-04", { image: 3, statuses: ["failed", "partial"] }],
  ["K-05", { image: 4, statuses: ["failed"] }],
  ["K-06", { image: 6, statuses: ["partial", "uncertain"] }],
  ["K-07", { image: 5, statuses: ["failed"] }],
  ["K-08", { image: null, statuses: ["missing"] }],
]);

const normalize = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/g, "").toUpperCase();
const standardId = (value) => normalize(value).replace(/^K-?(\d{1,2})$/, (_, number) => `K-${number.padStart(2, "0")}`);
const filename = (index) => `evidence-${index}.png`;
const expectedFilename = (expected) => expected.image ? filename(expected.image) : expected.file ?? null;
const expectedLinks = [...expectedMatches.values()].filter(expectedFilename).length;
const score = (correct, total) => `${correct}/${total}（${Math.round(correct * 100 / total)}%）`;

function describeFailure(error) {
  const details = [];
  for (let cause = error; cause && details.length < 4; cause = cause.cause) {
    if (cause.code || cause.status) details.push(String(cause.code ?? cause.status));
    else if (cause.cause) details.push(cause.name ?? "Error");
    else break;
  }
  return details.join(" → ") || error.name || "Error";
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const pdfOnly = process.argv.includes("--pdf-only");
  process.chdir(root);
  loadEnvConfig(root);
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!key || !model || !baseURL ||
      new URL(baseURL).origin !== "https://generativelanguage.googleapis.com" ||
      !new URL(baseURL).pathname.startsWith("/v1beta/openai")) {
    throw new Error("需要有效的 Gemini API 配置");
  }

  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "yan-gemini-"));
  const tempDatabase = path.join(tempDirectory, "benchmark.db");
  let prisma;
  let stage = "初始化";
  let apiStatus;
  let transportError;
  let modelClauses;
  const request = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const target = new URL(typeof url === "string" ? url : url.url ?? url.href);
    if (target.origin !== "https://generativelanguage.googleapis.com") {
      throw new Error("Unexpected API endpoint");
    }
    const start = Date.now();
    try {
      const response = await request(url, options);
      apiStatus = response.status;
      transportError = undefined;
      console.log(`[${stage}] HTTP ${response.status}，${((Date.now() - start) / 1000).toFixed(1)} 秒`);
      if (!response.ok) {
        const body = await response.clone().json().catch(() => null);
        const error = body?.error;
        const message = typeof error?.message === "string"
          ? error.message.replaceAll(key, "[redacted]").replace(/AIza[\w-]+/g, "[redacted]").replace(/\s+/g, " ").slice(0, 300)
          : "";
        if (message) console.log(`  Gemini：${message}`);
      } else if (stage === "PDF 条款提取") {
        const body = await response.clone().json().catch(() => null);
        try {
          const data = JSON.parse(body?.choices?.[0]?.message?.content ?? "null");
          if (Array.isArray(data?.clauses)) (modelClauses ??= []).push(...data.clauses);
        } catch {
          // The application handles invalid model output; the probe only observes it.
        }
      }
      return response;
    } catch (error) {
      transportError = describeFailure(error);
      throw error;
    }
  };

  async function measure(name, run) {
    stage = name;
    apiStatus = undefined;
    transportError = undefined;
    try {
      return await run();
    } catch (error) {
      console.log(`${name}未完成（${transportError ?? (apiStatus ? `HTTP ${apiStatus}` : describeFailure(error))}）。`);
      process.exitCode = 1;
      return null;
    }
  }

  try {
    await fs.copyFile(path.join(root, "prisma", "dev.db"), tempDatabase);
    process.env.DATABASE_URL = `file:${tempDatabase.replaceAll("\\", "/")}`;
    ({ prisma } = require("../src/lib/prisma.ts"));
    const { parseMaterial } = require("../src/lib/materials.ts");
    const { extractClauses } = require("../src/lib/clause-extraction.ts");
    const { runEvidenceMatching } = require("../src/lib/evidence-matching.ts");
    const fixture = gateway?.directory ?? "storage/materials/demo/extended";
    const pdfPath = `${fixture}/${pdfName}`;
    const parsed = await parseMaterial(pdfPath, pdfName);
    if (parsed.status !== "parsed" || !parsed.content) throw new Error("无法读取模拟 PDF");
    const cleaned = parsed.content.replace(/file:\/\/\/[^\s]+/g, "");
    if (/file:\/\/\/|C:\/Users\//i.test(cleaned)) throw new Error("测试材料含本机路径");
    const project = await prisma.project.create({
      data: {
        code: `GEMINI-BENCH-${Date.now()}`, name: gateway?.title ?? "Gemini 模拟验收实测",
        description: "仅模拟数据", acceptanceVersion: gateway?.version ?? "V2.0",
      },
    });
    await prisma.material.create({ data: {
      projectId: project.id, name: pdfName, category: "验收要求书",
      mimeType: "application/pdf", size: (await fs.stat(pdfPath)).size, storagePath: pdfPath,
      parseStatus: parsed.status, sourceLocation: parsed.location, parsedContent: cleaned,
    } });
    const images = [];
    for (const { name } of pdfOnly ? [] : expectedImages) {
      const storagePath = `${fixture}/${name}`;
      const bytes = await fs.readFile(storagePath);
      if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("模拟截图不是 PNG");
      await prisma.material.create({ data: {
        projectId: project.id, name, category: "系统截图", mimeType: "image/png",
        size: bytes.length, storagePath, parseStatus: "manual_review",
      } });
      images.push({ name, bytes });
    }
    if (!pdfOnly) {
      for (const [name, category] of Object.entries(gateway?.documents ?? {})) {
        const storagePath = `${fixture}/${name}`;
        const document = await parseMaterial(storagePath, name);
        if (document.status !== "parsed" || !document.content) throw new Error(`无法读取模拟证据 ${name}`);
        await prisma.material.create({ data: {
          projectId: project.id, name, category, mimeType: "text/plain",
          size: (await fs.stat(storagePath)).size, storagePath,
          parseStatus: document.status, sourceLocation: document.location, parsedContent: document.content,
        } });
      }
    }

    if (gateway) console.log(`独立样本：${gateway.title}`);
    console.log(`模型 ${model} | 模拟 PDF ${parsed.location} | ${pdfOnly ? "仅测条款提取" : `${images.length} 张模拟截图`}`);
    const extraction = await measure("PDF 条款提取", () => extractClauses(project.id));
    if (extraction) {
      console.log(extraction.message);
      const clauses = Array.from(new Map(extraction.clauses.map((clause) => [clause.clauseId, clause])).values());
      const actual = new Map(clauses.map((clause) => [standardId(clause.clauseId), clause]));
      if (modelClauses) {
        console.log(`Gemini 返回 ${modelClauses.length} 条，原文校验保留 ${extraction.clauses.length} 条，按编号去重后 ${clauses.length} 条。`);
        console.log("  模型返回的编号和页码：" + modelClauses.map((clause) =>
          `${JSON.stringify(clause.clauseId)} @ ${JSON.stringify(clause.sourceLocation)}`,
        ).join("，"));
        for (const id of expectedPages.keys()) {
          if (actual.has(id)) continue;
          const candidates = modelClauses.filter((clause) => standardId(clause.clauseId) === id);
          const cause = !candidates.length
            ? "模型未返回这个编号，可能漏提或改写了编号"
            : candidates.some((clause) => clause.sourceFile === pdfName)
              ? "模型返回了编号，摘录未通过原文校验"
              : "模型返回了编号，来源文件名未通过校验";
          console.log(`  ${id} 排查｜${cause}`);
        }
      }
      const recovered = [...expectedPages.keys()].filter((id) => actual.has(id));
      const pageCorrect = recovered.filter((id) => {
        const first = actual.get(id).sourceLocation.match(/\d+/);
        return first && Number(first[0]) === expectedPages.get(id);
      });
      console.log(`条款召回 ${score(recovered.length, expectedPages.size)}，来源页码 ${score(pageCorrect.length, expectedPages.size)}。`);
      for (const [id, page] of expectedPages) {
        console.log(`  ${id} | 标准第 ${page} 页 | ${actual.get(id)?.sourceLocation ?? "未提取"}`);
      }
      const extras = clauses.filter((clause) => !expectedPages.has(standardId(clause.clauseId)));
      if (extras.length) console.log("  额外条款 " + extras.map((clause) => clause.clauseId).join("、"));

      if (!pdfOnly && clauses.length) {
        await prisma.clause.createMany({ data: clauses.map((clause) => ({
          ...clause, projectId: project.id, requiredEvidence: JSON.stringify(clause.requiredEvidence),
        })) });
        const matchResult = await measure("应用证据匹配", () => runEvidenceMatching(project.id));
        if (matchResult) {
          const rows = await prisma.clause.findMany({ where: { projectId: project.id },
            include: { evidenceMatches: { include: { evidence: true } } } });
          const matches = new Map(rows.map((row) => [standardId(row.clauseId), row.evidenceMatches[0] ?? null]));
          let fileCorrect = 0;
          let statusCorrect = 0;
          for (const [id, expected] of expectedMatches) {
            const match = matches.get(id);
            const actualName = match?.evidence.fileName ?? null;
            const expectedName = expectedFilename(expected);
            const status = matches.has(id) ? match?.status ?? "missing" : "未提取";
            if (expectedName && actualName === expectedName) fileCorrect++;
            if (expected.statuses.includes(status)) statusCorrect++;
            const discrepancy = expected.statuses.includes(status) && actualName === expectedName
              ? ""
              : ` | 预期 ${expected.statuses.join("/")}，${expectedName ?? "无关联"}`;
            console.log(`  ${id} | ${status} | ${actualName ?? "无关联"} | ${match?.evidence.sourceLocation ?? "—"} | ${match?.evidence.excerpt ?? "—"}${discrepancy}`);
          }
          console.log(`证据文件关联 ${score(fileCorrect, expectedLinks)}，验收状态 ${score(statusCorrect, expectedMatches.size)}。`);
        }
      }
    } else if (!apiStatus) {
      console.log("未收到 Gemini 的 HTTP 响应。请检查本机网络是否能访问 Gemini API 域名，再重跑。");
      return;
    } else if ([401, 403, 429].includes(apiStatus)) {
      console.log("请检查密钥、项目权限或免费配额，再重跑。");
      return;
    } else if (apiStatus === 404) {
      const modelIds = await measure("查询可用模型", async () => {
        const client = new OpenAI({ apiKey: key, baseURL, maxRetries: 0, timeout: 15_000 });
        const page = await client.models.list();
        return page.data.map(({ id }) => id.replace(/^models\//, ""));
      });
      if (modelIds) {
        const flashModels = modelIds.filter((id) => /^gemini-[\w.-]+-flash(?:-lite)?$/.test(id));
        console.log(`当前配置的模型${modelIds.includes(model) ? "在" : "不在"} API 返回的模型列表中。`);
        console.log(`列表中的 Flash 模型：${flashModels.join("、") || "无"}。`);
      }
      return;
    }

    if (pdfOnly) return;
    const recognition = await measure("截图逐张转录", async () => {
      const client = new OpenAI({ apiKey: key, baseURL, maxRetries: 0, timeout: 120_000 });
      const content = [{ type: "text", text: "依次读取给出的 PNG。逐字转录主卡片中最大号的显示值，以及右下角标明的截图编号。只输出图片上可见的文本。保留文件名对应关系。" }];
      for (const { name, bytes } of images) {
        content.push({ type: "text", text: name });
        content.push({ type: "image_url", image_url: { url: "data:image/png;base64," + bytes.toString("base64") } });
      }
      const completion = await client.chat.completions.create({
        model, temperature: 0, messages: [{ role: "user", content }],
        response_format: { type: "json_schema", json_schema: { name: "screenshot_readback", strict: true, schema: {
          type: "object", required: ["images"], additionalProperties: false,
          properties: { images: { type: "array", items: {
            type: "object", required: ["fileName", "primaryValue", "screenshotId"], additionalProperties: false,
            properties: { fileName: { type: "string" }, primaryValue: { type: "string" }, screenshotId: { type: "string" } },
          } } },
        } } },
      });
      const decoded = JSON.parse(completion.choices[0]?.message.content ?? "null");
      if (!Array.isArray(decoded?.images)) throw new Error("截图响应无有效数组");
      return decoded.images;
    });
    if (recognition) {
      let valueCorrect = 0;
      let labelCorrect = 0;
      for (const { name, value, id } of expectedImages) {
        const observed = recognition.find((entry) => entry.fileName === name);
        const valueOK = normalize(observed?.primaryValue) === normalize(value);
        const labelOK = normalize(observed?.screenshotId) === normalize(id);
        valueCorrect += Number(valueOK);
        labelCorrect += Number(labelOK);
        console.log(`  ${name} | 主字段 ${valueOK ? "✓" : "✗"} ${observed?.primaryValue ?? "—"} | 编号 ${labelOK ? "✓" : "✗"} ${observed?.screenshotId ?? "—"}`);
      }
      console.log(`截图主字段 ${score(valueCorrect, expectedImages.length)}，截图编号 ${score(labelCorrect, expectedImages.length)}。`);
    }
  } finally {
    globalThis.fetch = request;
    await prisma?.$disconnect();
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      await fs.unlink(tempDatabase + suffix).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
    await fs.rmdir(tempDirectory);
  }
}

main().catch((error) => {
  console.error("实测未完成", error instanceof Error ? error.message.replace(/AIza[\w-]+/g, "[redacted]") : "未知错误");
  process.exitCode = 1;
});
