# 验真链 AI

面向中小企业项目交付场景的验收证据链智能体。本地工作台支持项目台账、材料上传、条款录入、证据核验、风险处理和预检报告。真实项目和模拟案例分别统计。

> 所有内置数据均为“模拟案例”，仅用于方案设计与概念验证，不代表真实客户、收入、测试成果或用户评价。

## 技术栈

- Next.js 16（App Router）与 TypeScript
- Tailwind CSS 4 与 shadcn/ui
- SQLite、Prisma ORM 6（稳定维护线）
- Zod、Lucide React、Recharts（后续报告阶段使用）

## 本地运行

需要 Node.js 20.9 或更高版本。建议使用 Node.js 24 LTS。

```powershell
npm ci
Copy-Item .env.example .env
if (-not (Test-Path prisma/dev.db)) { New-Item -ItemType File prisma/dev.db | Out-Null }
npm run db:init
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。如果使用 macOS 或 Linux，用 `cp .env.example .env` 复制配置，再用 `touch prisma/dev.db` 准备数据库文件。已有数据库时可以直接运行 `npm run dev`。`db:init` 会重新初始化模拟项目。

生产构建可运行 `npm run build`，构建完成后使用 `npm run start -- --hostname 127.0.0.1 --port 3210`，再打开 [http://127.0.0.1:3210](http://127.0.0.1:3210)。

## Windows 桌面版

从 [GitHub Releases](https://github.com/1840298959-svg/yan-zhen-lian-ai/releases/tag/v0.1.0) 下载 `YanZhenLianAI-v0.1.0-Windows-x64.zip`，完整解压后双击 `验真链 AI.exe`。程序使用本机的 .NET Framework 和 Edge WebView2 运行时，并自带 Node.js。项目数据库与上传材料保存在 `%LOCALAPPDATA%\YanZhenLianAI`。打开内置模拟项目即可体验审查流程。

窗口上方的「AI 设置」用于配置在线模型。使用 Gemini 时，接口地址填写 `https://generativelanguage.googleapis.com/v1beta/openai/`，模型名称填写该账号可用的完整模型 ID（例如 `gemini-3.5-flash-lite`），并填入自己的 API 密钥。

从源码打包需要 PowerShell 7、Node.js 24 x64、已安装的项目依赖、WebView2 SDK 的 NuGet 包和对应 Node.js 版本的许可证。输出路径应为新目录。

```powershell
./desktop/package.ps1 -OutputDirectory ./release -WebViewPackage ./webview2.nupkg -NodeLicense ./node-LICENSE.txt
```

## 常用命令

```bash
npm run db:init     # 生成 Prisma Client、同步数据库并初始化模拟数据
npm run db:seed     # 重置内置模拟项目数据
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint 检查
npm run build       # 生产构建
npm run verify:demo # 验证12条模拟条款、指定风险和缺失证据保护
```

## 环境变量

参考 `.env.example`。有 AI 密钥时，可以从可解析的验收材料提取条款，并对交付文本和图片运行自动核验。密钥只在服务端读取。真实项目在无密钥时可通过“验收条款”录入原文，并从“证据矩阵”的复核面板关联原始材料、页码或截图位置，填写人工结论。内置演示数据只用于模拟项目。

## 当前阶段范围

- 可查看项目列表与统计
- 可新建验收项目，包含服务端 Zod 校验与中文错误提示
- 可进入项目概览
- 内置“客户工单管理系统”模拟项目、12条条款、7项证据和5项风险
- 数据模型已为材料、条款、证据匹配和风险留出结构
- 支持PDF、DOCX、TXT、CSV、PNG、JPG拖拽上传（单文件最大10MB）
- PDF按页、DOCX按段落保留来源位置；TXT和CSV直接读取
- 截图和含扫描页的 PDF 支持视觉转录。模型返回的转录可在材料管理中对照原件核对，确认后保存操作记录
- 上传文件保存在私有 `storage/` 目录，不进入 `public/`
- 支持查看解析原文、删除材料和初始化模拟材料
- 支持从验收基线材料提取结构化条款；配置 `OPENAI_API_KEY` 时调用 OpenAI 兼容接口，否则使用演示模式
- 条款支持人工新增、编辑、删除、批量确认；置信度低于75%自动标记人工确认
- 支持证据矩阵、确定性数字/版本/内容规则检查和风险清单
- 找不到证据时固定输出“缺少证据”，不会根据常识编造材料
- 审查中心显示模型运行批次、输入指纹、失败位置、人工复核进度及待办
- 支持验收预检报告、条款状态统计、证据覆盖率、待补材料清单，以及一键运行模拟案例
- 支持导出 CSV 和浏览器打印为 PDF。CSV 包含条款原文及其位置、证据摘录和人工复核状态
- 报告明确标注“本报告由人工智能辅助生成，仅用于项目验收预检，不替代合同双方的正式验收结论。”
- 全局加载、错误和404状态均提供中文提示
- `verify:demo` 提供可重复运行的核心演示断言

当前版本适合本机单人试用。真实项目的 AI 分析会把参与核验的材料发送到配置的接口。多人正式使用所需的身份认证、权限隔离和审计记录尚未实现。

## 许可证

项目源码采用 [MIT License](LICENSE)。随附第三方依赖保留各自的许可证。
