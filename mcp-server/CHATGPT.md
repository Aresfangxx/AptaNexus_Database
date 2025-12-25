# 为 ChatGPT 配置 AptaNexus API

本指南说明如何让 ChatGPT 访问 AptaNexus Aptamer 数据库。

## 方案对比

| 方案 | 优点 | 缺点 | 难度 |
|------|------|------|------|
| **方案1: 静态文件访问** | 简单，无需服务器 | 功能有限，ChatGPT 需自行解析 | ⭐ 简单 |
| **方案2: GPT Actions** | 功能完整，用户体验好 | 需要部署 API 服务器 | ⭐⭐⭐ 中等 |
| **方案3: Function Calling** | 灵活，可定制 | 需要编写代码 | ⭐⭐⭐⭐ 复杂 |

## 方案1: 静态文件访问（最简单）

ChatGPT 可以直接访问公开的 JSONL 文件：

```
https://www.aptanexus.com/APTAMERS.jsonl
```

### 使用方法

直接告诉 ChatGPT：

```
请从 https://www.aptanexus.com/APTAMERS.jsonl 加载数据，
然后帮我搜索针对 thrombin 的 aptamers，要求亲和力高于 10nM
```

### 局限性
- ⚠️ ChatGPT 需要下载完整文件（可能较慢）
- ⚠️ 没有搜索、过滤等高级功能
- ⚠️ 每次查询都需要重新加载数据

---

## 方案2: GPT Actions（推荐）

通过 GPT Actions 提供结构化的 API 访问。

### 步骤1: 部署 API 服务器

你需要将 HTTP API 服务器部署到公网。有以下选择：

#### 选项 A: 使用 Vercel Serverless（推荐）

1. 在项目根目录创建 `api/` 文件夹
2. 将 HTTP 服务器改造为 Vercel Serverless Functions
3. 部署到 Vercel

#### 选项 B: 使用传统服务器

1. 租一台 VPS（如 DigitalOcean, AWS EC2）
2. 安装 Node.js
3. 运行 HTTP 服务器：
```bash
cd mcp-server
npm install
npm run build
PORT=80 node dist/src/http.js
```

#### 选项 C: 使用 Railway/Render（最简单）

1. 注册 [Railway](https://railway.app/) 或 [Render](https://render.com/)
2. 连接 GitHub 仓库
3. 设置构建命令：`cd mcp-server && npm install && npm run build`
4. 设置启动命令：`cd mcp-server && node dist/src/http.js`
5. 部署！

### 步骤2: 配置 GPT Action

1. 打开 ChatGPT → **Explore GPTs** → **Create a GPT**

2. 在 **Configure** 标签页，点击 **Add Actions**

3. 导入 OpenAPI 规范：
   - 点击 **Import from URL** 或 **Manual**
   - 如果你已经部署了 API，使用：`https://api.aptanexus.com/openapi.yaml`
   - 或者复制 `openapi.yaml` 的内容粘贴进去

4. 修改 Server URL 为你的 API 地址：
```yaml
servers:
  - url: https://your-api-domain.com
```

5. **Authentication**: 选择 **None**（公开 API）

6. **Privacy Policy**: 使用 `https://www.aptanexus.com/privacy`（需要创建隐私政策页面）

### 步骤3: 配置 GPT 说明

在 **Instructions** 框中添加：

```
You are an expert in aptamer research and bioinformatics.
You have access to the AptaNexus database containing 12,000+
curated aptamer records.

When users ask about aptamers:
1. Use the search API to find relevant aptamers
2. Filter by affinity (pKd), confidence level, or publication year
3. Provide detailed information including sequence, affinity,
   target information, and publication details
4. Explain the significance of pKd values (higher = better binding)
5. Distinguish between confidence levels (P > A > B > C)

Available actions:
- searchAptamers: Search by target name
- getTopAptamers: Get best aptamers for a target
- getAptamersByDoi: Find aptamers from a specific paper
- getAptamerById: Look up by external ID
- listTargets: Browse all available targets
```

### 步骤4: 测试

在 **Preview** 面板测试：

```
Find the top 5 aptamers for thrombin with the highest affinity
```

---

## 方案3: Function Calling（高级）

使用 OpenAI API 的 Function Calling 功能。

### 示例代码

```python
import openai

openai.api_key = "your-api-key"

functions = [
    {
        "name": "search_aptamers",
        "description": "Search for aptamers by target name",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Target name (e.g., 'thrombin', 'VEGF')"
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of results",
                    "default": 10
                }
            },
            "required": ["query"]
        }
    }
]

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Find aptamers for thrombin"}
    ],
    functions=functions,
    function_call="auto"
)
```

---

## API 端点说明

部署后，你的 API 将提供以下端点：

| 端点 | 参数 | 示例 |
|------|------|------|
| `/search` | `q`, `limit`, `offset` | `/search?q=thrombin&limit=10` |
| `/top` | `q`, `n` | `/top?q=thrombin&n=5` |
| `/bydoi` | `doi` | `/bydoi?doi=10.1021/ja00000000` |
| `/byid` | `id` | `/byid?id=B0YJF8` |
| `/targets` | `q` (optional) | `/targets?q=thrombin` |

---

## 常见问题

### Q: 我没有服务器，能用 ChatGPT 吗？

**A**: 可以！使用**方案1**（静态文件访问）即可，虽然功能有限但无需任何部署。

### Q: 部署 API 需要多少钱？

**A**:
- Railway 免费套餐：$5/月（包含 500 小时运行时间）
- Render 免费套餐：完全免费（但有性能限制）
- Vercel 免费套餐：完全免费（Serverless）

### Q: API 需要身份验证吗？

**A**: 当前版本是公开 API，不需要身份验证。如果流量过大，可以考虑添加 API Key。

### Q: 如何更新数据？

**A**: 数据从 `https://www.aptanexus.com/APTAMERS.jsonl` 加载。更新网站的 JSONL 文件后，重启 API 服务器即可。

---

## 下一步

1. **测试静态访问**：先用方案1测试 ChatGPT 是否能访问你的数据
2. **选择部署平台**：推荐 Railway 或 Render（免费且简单）
3. **部署 API**：按照上述步骤部署
4. **创建 GPT**：配置 GPT Actions
5. **分享给用户**：发布你的 Custom GPT

---

## 需要帮助？

- GitHub Issues: https://github.com/Aresfangxx/Aptamer-Database/issues
- 网站: https://www.aptanexus.com
