# Aptamer MCP Server

为 Claude Desktop 提供 MCP (Model Context Protocol) 工具，查询 12,000+ 条 aptamer 记录。数据从云端自动加载，无需本地存储。

## 快速开始 (推荐)

**无需下载代码！** 直接使用 `npx` 运行：

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "aptamer-db": {
      "command": "npx",
      "args": ["-y", "aptamer-mcp-server"]
    }
  }
}
```

完成！重启 Claude Desktop 即可使用。数据将自动从官方源加载。

## 可用工具

MCP 服务器提供以下工具：

- `search_by_target` - 按目标分子名称搜索 aptamers（支持中文，如"乳酸"）
- `get_by_doi` - 通过 DOI 获取文献的 aptamers
- `list_targets` - 列出所有目标分子及其 aptamer 数量
- `get_by_external_id` - 通过外部 ID（如 Aptagen ID）查询
- `top_by_pkd` - 获取特定目标的最高亲和力 aptamers

## 本地开发

如果你想从源码运行或修改代码：

1. 克隆仓库并安装依赖：
```bash
git clone https://github.com/Aresfangxx/Aptamer-Database.git
cd Aptamer-Database/mcp-server
npm install
npm run build
```

2. 启动 stdio MCP：`npm run start`

3. 可选 HTTP 调试：`npm run http`（默认端口 `3333`）

## 数据源

MCP 服务器从在线 URL 加载数据：

### 默认数据源

不设置环境变量时，自动从官方网站加载：
```
https://www.aptanexus.com/APTAMERS.jsonl
```

### 自定义数据源（可选）

如果你部署了自己的数据副本，可以指定自定义 URL：

```json
{
  "mcpServers": {
    "aptamer-db": {
      "command": "npx",
      "args": ["-y", "aptamer-mcp-server"],
      "env": {
        "APTAMERS_URL": "https://your-custom-deployment.com/APTAMERS.jsonl"
      }
    }
  }
}
```

## MCP 请求示例（stdio 每行一个 JSON）

```
{"id":1,"method":"aptamers.search_by_target","params":{"query":"乳酸","limit":20}}
{"id":2,"method":"aptamers.get_by_doi","params":{"doi":"10.1007/s00216-015-9179-z"}}
{"id":3,"method":"aptamers.list_targets","params":{"query":"lac"}}
{"id":4,"method":"aptamers.top_by_pkd","params":{"query":"thrombin","top":3}}
```

## 优势

- ✅ **零配置**: 无需指定数据源，自动从云端加载
- ✅ **无需本地存储**: 数据文件在云端（11,735 条记录）
- ✅ **自动更新**: 数据更新时无需重新安装
- ✅ **网络优化**: 60 秒超时 + 自动重试 3 次
- ✅ **稳定可靠**: 部署在 Vercel CDN，全球加速

## HTTP 调试

启动 HTTP 服务器用于测试：
```bash
npm run http
```

可用端点：
- `/search?q=乳酸&limit=20`
- `/bydoi?doi=10.1007/s00216-015-9179-z`
- `/targets?q=lac`
- `/byid?id=B0YJF8`
- `/top?q=thrombin&n=3`

## 发布到 npm

如果你要发布新版本：

1. 登录 npm（首次）：
```bash
npm login
```

2. 更新版本号：
```bash
npm version patch  # 0.1.0 -> 0.1.1
# 或
npm version minor  # 0.1.0 -> 0.2.0
# 或
npm version major  # 0.1.0 -> 1.0.0
```

3. 发布：
```bash
npm publish
```

发布后，用户就可以通过 `npx aptamer-mcp-server` 使用最新版本。

## 版本历史

### v0.1.3 (Latest)
- 🚀 **简化**: 移除本地文件支持，只保留云端加载
- ✅ **零配置**: 默认从 Vercel 加载数据，无需配置环境变量
- 📦 **更小**: 包体积从 24.0kB 减少到 ~20kB
- 🎯 **更专注**: 专注于云端数据访问，避免路径配置问题

### v0.1.2
- 🐛 **修复**: 排除测试文件，解决 npx 安装后的 ENOENT 错误
- ✅ **包体积优化**: 从 24.5kB 减少到 24.0kB

### v0.1.1
- ✅ **网络优化**: 增加超时时间从 10s 到 60s
- ✅ **自动重试**: 网络失败时自动重试 3 次（间隔 2s/4s/6s）
- ✅ **更好的错误提示**: 提供详细的故障排查建议
- ✅ **稳定性提升**: 解决防火墙/代理环境下的连接问题

### v0.1.0
- 初始版本
- 支持本地文件和在线 URL 数据源
- 5 个 MCP 工具（search_by_target, get_by_doi, list_targets, get_by_external_id, top_by_pkd）

## License

MIT
