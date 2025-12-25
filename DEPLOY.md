# 🚀 部署 API 到公网（5分钟教程）

## 选项 1: Render（推荐 - 完全免费）

### 步骤 1: 注册 Render
1. 访问 https://render.com
2. 点击 **Get Started**
3. 用 GitHub 账号登录

### 步骤 2: 部署
1. 点击 **New +** → **Web Service**
2. 选择你的 GitHub 仓库：`Aptamer-Database`
3. Render 会自动检测到 `render.yaml` 配置
4. 点击 **Apply** 使用配置
5. 点击 **Create Web Service**

### 步骤 3: 等待部署完成（2-3分钟）
- Render 会自动安装依赖、构建项目
- 部署完成后，你会得到一个 URL：`https://aptanexus-api.onrender.com`

### 步骤 4: 测试 API
访问：`https://aptanexus-api.onrender.com/search?q=thrombin&limit=5`

✅ 如果返回 JSON 数据，说明部署成功！

---

## 选项 2: Railway（免费 $5 额度/月）

### 步骤 1: 注册 Railway
1. 访问 https://railway.app
2. 用 GitHub 账号登录

### 步骤 2: 部署
1. 点击 **New Project** → **Deploy from GitHub repo**
2. 选择 `Aptamer-Database` 仓库
3. 点击 **Add variables**，添加：
   - `PORT` = `3333`
4. 在 **Settings** 中配置：
   - **Build Command**: `cd mcp-server && npm install && npm run build`
   - **Start Command**: `cd mcp-server && node dist/src/http.js`
5. 点击 **Deploy**

### 步骤 3: 获取公网 URL
1. 在 **Settings** → **Networking** 中
2. 点击 **Generate Domain**
3. 你会得到类似：`aptanexus-api.up.railway.app`

---

## 配置 ChatGPT Actions

部署完成后，在 ChatGPT 中：

### 步骤 1: 创建 GPT
1. 打开 ChatGPT
2. 点击左侧 **Explore GPTs**
3. 点击 **Create**

### 步骤 2: 配置 Actions
1. 在 **Configure** 标签页，找到 **Actions**
2. 点击 **Create new action**
3. 有两种方式导入 OpenAPI：

#### 方式 A: 从 URL 导入（推荐）
- 在 **Import from URL** 输入：
  ```
  https://raw.githubusercontent.com/Aresfangxx/Aptamer-Database/main/mcp-server/openapi.yaml
  ```

#### 方式 B: 手动粘贴
- 复制 `mcp-server/openapi.yaml` 的全部内容
- 粘贴到编辑框中

### 步骤 3: 修改服务器 URL
在 OpenAPI 配置中，找到 `servers:` 部分，修改为你的实际 URL：

```yaml
servers:
  - url: https://aptanexus-api.onrender.com
    description: Production API
```

### 步骤 4: 配置 GPT 说明
在 **Instructions** 框中输入：

```
You are an expert assistant for the AptaNexus aptamer database.
You have access to 12,000+ curated aptamer records through API actions.

When users ask about aptamers:
1. Use search API to find relevant aptamers by target name
2. Use top API to get the best aptamers (highest affinity)
3. Explain pKd values (higher = better binding affinity)
4. Explain confidence levels: P (High) > A (Verified) > B/C (Lower)
5. Provide sequence, affinity, and publication details

Always be helpful and explain technical terms when needed.
```

### 步骤 5: 测试
在右侧 **Preview** 面板测试：

```
Find the top 5 aptamers for thrombin with the highest affinity
```

---

## 常见问题

### Q: Render 部署失败怎么办？
**A**: 检查 Logs，常见问题：
- Node 版本不对：确保使用 Node 18+
- 找不到文件：确保 `render.yaml` 在根目录

### Q: API 响应很慢？
**A**: Render 免费版会在无流量时休眠，第一次请求需要 10-30 秒唤醒。可以：
- 升级到付费版（$7/月）
- 或者使用 Railway

### Q: 需要配置 HTTPS 吗？
**A**: 不需要！Render 和 Railway 自动提供 HTTPS。

### Q: 如何更新 API？
**A**: 只需 `git push` 到 GitHub，Render/Railway 会自动重新部署。

---

## 下一步

1. ✅ 部署 API（Render/Railway）
2. ✅ 测试 API 端点
3. ✅ 在 ChatGPT 中配置 Actions
4. ✅ 分享你的 GPT！

## 需要帮助？

如果遇到问题：
1. 查看部署日志（Render/Railway 控制台）
2. 在 GitHub 提 Issue
3. 访问 https://www.aptanexus.com
