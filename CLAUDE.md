# AptaNexus — Claude Code 项目说明

## 项目概述

AptaNexus 是一个适配体（Aptamer）数据库网站，包含 12,500+ 条记录、1,900+ 种靶标。
核心功能：搜索适体、查看详情、AI 对话助手（chatbox）。

## 架构

```
前端 (React + Vite + TypeScript)   ← Vercel 部署
    ↕ fetch /chat (SSE 流式)
后端 MCP Server (Node.js + TypeScript)  ← Render 部署
    ├── /chat     AI 对话端点（Doubao / 火山方舟 + tool-use 循环）
    ├── /mcp      MCP 协议端点（Streamable HTTP，供 Claude Desktop / Cherry Studio 等客户端挂载）
    └── /search /top /bydoi 等  REST API
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `components/FloatingChatbox.tsx` | 悬浮 AI 聊天框，支持展开模式和 toolStatus 状态显示 |
| `components/ReportPage.tsx` | 纠错页（`/report`）：纠错流程说明 + 通用工单表单 |
| `components/ReportForm.tsx` | 共享纠错表单（general/record 两模式），供 ReportPage 与详情页 modal 复用 |
| `components/reportSchema.ts` | 纠错纯逻辑单一事实源：字段分组、payload 类型、`clientValidate`、`API_BASE`（含 vitest 测试） |
| `mcp-server/src/report.ts` | 后端纠错处理：校验 + 构造邮件 + Resend 发信 + 蜜罐 + 内存限流（`handleReport`） |
| `mcp-server/src/http-sse.ts` | 后端核心：/chat 端点、Doubao tool-use 循环、/mcp（Streamable HTTP）、REST、/report |
| `mcp-server/src/tools.ts` | **工具单一事实源**：工具定义 + executeTool + fetchAbstract，stdio/HTTP MCP 与 /chat 三处共用 |
| `mcp-server/src/mcp.ts` | createMcpServer 工厂：从 tools.ts 装配 MCP Server，供 stdio 与 /mcp 共用 |
| `mcp-server/src/index.ts` | stdio MCP 入口（npm 包 bin，Claude Desktop 本地挂载用） |
| `mcp-server/src/search.ts` | 数据库搜索逻辑（searchByTarget、topByPkd 等） |
| `mcp-server/src/normalize.ts` | 文本标准化 + 同义词扩展（中文靠 LLM 翻译，不在这里处理） |
| `public/APTAMERS.jsonl` | 主数据库文件（已在 git 中） |
| `public/SecStr/` | 适体二级结构 SVG 图（已在 git 中） |

## MCP 工具清单

后端向对话 LLM（Doubao）和 MCP 客户端暴露同一套 6 个工具（统一定义在 `src/tools.ts`）：

- `search_by_target` — 按靶标名搜索适体
- `top_by_pkd` — 按亲和力排名
- `get_by_doi` — 按 DOI 查文献中的适体
- `list_targets` — 列出所有靶标
- `get_by_external_id` — 按外部 ID 查适体
- `fetch_abstract` — 通过 DOI 从 CrossRef/PubMed 获取论文摘要（CrossRef 优先，PubMed 兜底）

## Chatbox 工作流程

```
用户提问
  → LLM 调用数据库工具（序列/Kd/DOI 来自数据库，无幻觉）
  → 若涉及应用场景/实验细节 → 自动调用 fetch_abstract
  → 前端显示 toolStatus 状态（"Searching database…" / "Fetching paper by DOI…"）
  → 流式输出最终回答
```

设计原则：**严格模式**——数据库和摘要无法覆盖的问题，明确告知用户"暂无该信息"，不用模型自身知识填充。

## 作者纠错渠道（/report）

供原作者/读者提交数据更正，反馈到团队邮箱供人工审核（无后台/数据库）：

```
导航栏 Report Error → /report（上半：纠错流程说明；下半：通用工单）
详情页 ⚐ Report correction 按钮 → modal（预填记录，按 AptamerRecord 字段逐项纠错）
  → POST /report → Resend HTTP API → 团队邮箱（reply_to=报告人，团队可直接回信）
```

- 必填：reporter name + email、reason；email 格式校验。
- 反垃圾：蜜罐字段 `_hp` + 同 IP 限流（5 次/小时，内存级）。
- 对外只暴露表单，不公开联系邮箱；提交失败保留已填内容并提示重试。
- 文案双语，统一在 `constants.ts` 的 `CONTENT[lang].report`。

## 部署信息

- **前端**：Vercel（连接 GitHub 自动部署）
- **后端**：Render（`mcp-server/` 目录，`render.yaml` 已配置）
- **环境变量**：`ARK_API_KEY`（火山方舟 / Doubao）在 Render 后台配置，本地开发放 `mcp-server/.env`
  - 纠错邮件还需 `RESEND_API_KEY`、`REPORT_TO_EMAIL`、`REPORT_FROM_EMAIL`（见 `mcp-server/.env.example`）；未配置时 `/report` 返回 `email not configured`，前端提示提交失败

## 本地开发

```bash
# 前端
npm install
npm run dev

# 后端
cd mcp-server
npm install && npm run build
ARK_API_KEY=your_key node dist/src/http-sse.js
# MCP 客户端可挂载 http://localhost:3333/mcp（Streamable HTTP）
```

## 注意事项

- 中文查询由对话 LLM 自动翻译为英文后调用工具，`normalize.ts` 仅做大小写/去重音的轻量归一
- `fetch_abstract` 调用耗时约 1-3 秒，前端有专门的 toolStatus 动画提示
- Render 免费版无流量时会休眠，首次请求需 10-30 秒唤醒
- `public/APTAMERS.jsonl` 很大，git push 时注意网络

---

## 相关文件

| 文件 | 关系说明 |
|------|--------|
| [[AptaNexus_Database/README|README]] | 项目概览 |
| [[AptaNexus_Database/docs/architecture-notes|architecture-notes]] | 架构设计详解 |
| [[AptaNexus_Database/DEPLOY|DEPLOY]] | 部署指南 |
