# AptaNexus — Claude Code 项目说明

## 项目概述

AptaNexus 是一个适配体（Aptamer）数据库网站，包含 12,500+ 条记录、1,900+ 种靶标。
核心功能：搜索适体、查看详情、AI 对话助手（chatbox）。

## 架构

```
前端 (React + Vite + TypeScript)   ← Vercel 部署
    ↕ fetch /chat (SSE 流式)
后端 MCP Server (Node.js + TypeScript)  ← Render 部署
    ├── /chat     AI 对话端点（DeepSeek + tool-use 循环）
    ├── /sse      MCP 协议端点（供 Claude Desktop / Cherry Studio 等客户端挂载）
    └── /search /top /bydoi 等  REST API
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `components/FloatingChatbox.tsx` | 悬浮 AI 聊天框，支持展开模式和 toolStatus 状态显示 |
| `mcp-server/src/http-sse.ts` | 后端核心：/chat 端点、DeepSeek tool-use 循环、MCP SSE |
| `mcp-server/src/search.ts` | 数据库搜索逻辑（searchByTarget、topByPkd 等） |
| `mcp-server/src/normalize.ts` | 文本标准化 + 同义词扩展（中文靠 LLM 翻译，不在这里处理） |
| `public/APTAMERS.jsonl` | 主数据库文件（已在 git 中） |
| `public/SecStr/` | 适体二级结构 SVG 图（已在 git 中） |

## MCP 工具清单

后端向 DeepSeek 暴露 6 个工具：

- `search_by_target` — 按靶标名搜索适体
- `top_by_pkd` — 按亲和力排名
- `get_by_doi` — 按 DOI 查文献中的适体
- `list_targets` — 列出所有靶标
- `get_by_external_id` — 按外部 ID 查适体
- `fetch_abstract` — 通过 DOI 从 CrossRef/PubMed 获取论文摘要（CrossRef 优先，PubMed 兜底）

## Chatbox 工作流程

```
用户提问
  → DeepSeek 调用数据库工具（序列/Kd/DOI 来自数据库，无幻觉）
  → 若涉及应用场景/实验细节 → 自动调用 fetch_abstract
  → 前端显示 toolStatus 状态（"Searching database…" / "Fetching paper by DOI…"）
  → 流式输出最终回答
```

设计原则：**严格模式**——数据库和摘要无法覆盖的问题，明确告知用户"暂无该信息"，不用模型自身知识填充。

## 部署信息

- **前端**：Vercel（连接 GitHub 自动部署）
- **后端**：Render（`mcp-server/` 目录，`render.yaml` 已配置）
- **环境变量**：`DEEPSEEK_API_KEY` 在 Render 后台配置，本地开发放 `mcp-server/.env`

## 本地开发

```bash
# 前端
npm install
npm run dev

# 后端
cd mcp-server
npm install
DEEPSEEK_API_KEY=your_key node dist/src/http-sse.js
```

## 注意事项

- 中文查询由 DeepSeek 自动翻译为英文后调用工具，`normalize.ts` 的同义词表仅做辅助
- `fetch_abstract` 调用耗时约 1-3 秒，前端有专门的 toolStatus 动画提示
- Render 免费版无流量时会休眠，首次请求需 10-30 秒唤醒
- `public/APTAMERS.jsonl` 很大，git push 时注意网络
