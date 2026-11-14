import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "storage", "demo", "extended");
await mkdir(out, { recursive: true });

const sections = [
  ["项目背景与范围", "客户工单管理系统用于受理、分派、跟踪和关闭客户服务请求。本文档为模拟验收要求书，所有名称、数据、版本号和测试结论均为概念验证数据。系统部署于企业内网，验收对象包含管理后台、客服工作台、只读查询端和数据导出模块。"],
  ["角色与权限", "关键要求 K-01：系统必须提供管理员、客服、只读用户三类角色。管理员可以管理用户和配置，客服可以创建和处理工单，只读用户仅可查询和查看统计，不得修改数据。证据要求：三类账号登录截图、权限矩阵和操作日志。"],
  ["工单生命周期", "关键要求 K-02：工单必须支持新建、处理中、待客户回复、已解决、已关闭五种状态。状态变化需要记录操作者、时间、前后状态和备注。证据要求：流程测试报告和审计日志。"],
  ["查询与筛选", "关键要求 K-03：用户可以按工单编号、客户名称、优先级、负责人和状态组合查询，查询结果支持分页。标准数据集下，查询 P95 响应时间不得超过 2.0 秒。证据要求：性能日志和查询截图。"],
  ["备份与恢复", "关键要求 K-04：系统每日凌晨 02:00 自动备份，备份数据至少保留 180 天；每月应执行一次恢复演练。证据要求：备份任务配置、备份日志、恢复演练记录。"],
  ["导出与接口", "关键要求 K-05：工单明细必须支持 CSV 导出，字段包括编号、标题、状态、负责人、创建时间和关闭时间。导出文件应使用 UTF-8 编码。证据要求：CSV 原文件和导出操作截图。"],
  ["安全与审计", "关键要求 K-06：登录连续失败五次后锁定账号十五分钟；管理员操作必须写入不可篡改审计日志。证据要求：安全测试报告和审计日志。"],
  ["版本与交付", "关键要求 K-07：本次验收目标版本为 V2.0。发布包、部署清单、用户手册和测试报告中的版本号必须一致。证据要求：发布包清单、测试报告封面、用户手册首页。"],
  ["兼容性与培训", "关键要求 K-08：Chrome 和 Edge 最新稳定版应支持主要流程。项目组应完成管理员和客服培训，并提交签到表与培训材料。证据要求：兼容性报告、培训记录和培训课件。"],
  ["验收判定规则", "当一项要求没有绑定原始证据时，结论必须为缺少证据；当数字、日期或版本不一致时，应优先以原始日志和文件内容进行规则比较。任何模拟数据都必须标注模拟案例，并由人工完成最终确认。"],
];

const longHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:"Microsoft YaHei",Arial,sans-serif;margin:42px;color:#172033;line-height:1.8}section{page-break-after:always;min-height:900px}h1{color:#123b66;border-bottom:2px solid #1c8a88;padding-bottom:12px}h2{color:#123b66}.note{background:#eef8f7;border-left:4px solid #1c8a88;padding:12px 16px}.meta{color:#64748b;font-size:13px}li{margin:10px 0}</style></head><body>${sections.map(([title, text], i) => `<section><h1>验收要求书扩展测试（模拟）</h1><p class="meta">客户工单管理系统 · 第 ${i + 1} / ${sections.length} 页 · SIM-LONG-001</p>${i === 0 ? '<div class="note">本文件专门用于验证长文档关键点提取能力，全部内容为模拟案例。</div>' : ''}<h2>${title}</h2><p>${text}</p><h2>验证提示</h2><p>请在材料解析后检查原文位置、关键编号、数字阈值、版本号和所需证据是否被保留。此处增加的背景段落用于模拟真实项目文档中的非关键内容。</p><p>本页末尾重复说明：该材料不代表真实客户、真实收入或真实验收结果。</p></section>`).join('')}</body></html>`;
await writeFile(path.join(out, "long-acceptance.html"), longHtml, "utf8");

const colors = ["#0f4c81", "#146c94", "#176b87", "#2f5597", "#285943", "#805b10"];
const labels = ["角色权限矩阵", "查询性能监控", "备份任务配置", "CSV导出菜单", "版本信息", "审计日志"];
for (let i = 0; i < labels.length; i += 1) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{margin:0;background:#eef2f7;font-family:"Microsoft YaHei",Arial,sans-serif}.window{width:1200px;height:760px;margin:30px auto;background:#fff;border:1px solid #cbd5e1;box-shadow:0 10px 28px #94a3b855}.bar{height:58px;background:${colors[i]};color:#fff;padding:0 28px;display:flex;align-items:center;justify-content:space-between;font-size:21px}.main{padding:38px}.tag{display:inline-block;background:#e7f5f3;color:#12635e;padding:8px 14px;border-radius:4px}.value{font-size:42px;font-weight:700;color:#172033;margin:28px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{border:1px solid #d7e1ea;border-radius:6px;padding:22px;font-size:18px}.muted{color:#64748b;font-size:15px}</style></head><body><div class="window"><div class="bar"><span>客户工单管理系统</span><span>模拟证据 E-${String(i + 20).padStart(3, "0")}</span></div><div class="main"><span class="tag">模拟案例 · ${labels[i]}</span><div class="value">${i === 0 ? "管理员 / 客服 / 只读用户" : i === 1 ? "P95 2.7 秒" : i === 2 ? "保留策略：未配置" : i === 3 ? "导出 XLSX" : i === 4 ? "V1.8" : "记录完整"}</div><div class="grid"><div class="card"><b>系统状态</b><p>本截图用于验收证据链测试，不是真实生产系统。</p><span class="muted">来源：模拟演示环境</span></div><div class="card"><b>检查备注</b><p>${i === 0 ? "已发现两类角色，第三类角色需要人工复核。" : i === 1 ? "超过验收要求的 2.0 秒阈值。" : i === 2 ? "未发现每日备份和180天保留证据。" : i === 3 ? "与要求的 CSV 格式不一致。" : i === 4 ? "与目标版本 V2.0 不一致。" : "日志字段可追溯。"}</p><span class="muted">截图编号：SIM-IMG-${i + 1}</span></div></div></div></div></body></html>`;
  await writeFile(path.join(out, `evidence-${i + 1}.html`), html, "utf8");
}
console.log(`已生成 ${sections.length} 页长文档和 ${labels.length} 份截图 HTML：${out}`);
