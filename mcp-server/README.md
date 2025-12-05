# Aptamer MCP Server

## 用途

为 `APTAMERS.jsonl` 提供 MCP 工具：按目标名检索、按 DOI/外部 ID 获取记录、列出目标集合。支持中文查询的规范化处理（如“乳酸”）。

## 运行

1. 安装依赖并构建：

   - 安装 TypeScript
   - 构建：`npm run build`

2. 启动 stdio MCP：`npm run start`

3. 可选 HTTP 调试：`npm run http`（默认端口 `3333`）

环境变量：`APTAMERS_PATH` 指定数据文件路径，默认使用仓库根的 `APTAMERS.jsonl`。

## MCP 请求示例（stdio 每行一个 JSON）

```
{"id":1,"method":"aptamers.search_by_target","params":{"query":"乳酸","limit":20}}
{"id":2,"method":"aptamers.get_by_doi","params":{"doi":"10.1007/s00216-015-9179-z"}}
{"id":3,"method":"aptamers.list_targets","params":{"query":"lac"}}
{"id":4,"method":"aptamers.top_by_pkd","params":{"query":"thrombin","top":3}}
```

## Claude Desktop 集成

在其 MCP 配置中添加本可执行文件（构建产物 `dist/index.js`），传输方式选择 `stdio`，并设置 `APTAMERS_PATH`。

## HTTP 调试

- `/search?q=乳酸&limit=20`
- `/bydoi?doi=10.1007/s00216-015-9179-z`
- `/targets?q=lac`
- `/byid?id=B0YJF8`
