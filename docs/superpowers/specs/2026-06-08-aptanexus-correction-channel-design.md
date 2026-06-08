# AptaNexus 作者纠错渠道 —— 设计方案

- 日期:2026-06-08 (HKT)
- 状态:已通过用户评审,待生成实施计划
- 背景:Reviewer 2 第 5 条要求平台为原适配体作者提供明确的纠错渠道(邮箱*或*表单);现稿承诺了渠道但平台尚未实现。本设计实现该渠道。

## 1. 目标与范围

为 AptaNexus 网站新增一个面向**原作者(及一般用户)**的数据纠错提交渠道:

- 导航栏新增「Report Error / 报错」入口,指向纠错页 `/report`。
- `/report` 页上半为纠错流程说明,下半为通用工单表单。
- 每条适配体**详情页**新增「Report correction」按钮,打开同一套表单并预填该记录上下文,支持按卡片字段逐项纠错。
- 提交后经后端 `/report` 端点,用 Resend HTTP API 发送结构化邮件到团队邮箱,供**人工审核**(无后台/数据库)。

### 明确决策(用户确认)

1. 卡片纠错按钮**只放在详情页 `AptamerDetailPage.tsx`**;聚合预览卡 `TargetCard.tsx` 字段不全,本期不加。
2. reporter 的 **name + email 必填**(便于回信作者,也用于防刷)。
3. 对外**只暴露表单,不公开任何联系邮箱**;失败时不做 mailto 降级,改为「稍后重试」并保留已填内容。

## 2. 总体流程

```
导航栏 Report Error ──► /report
                        ├─ 上半:纠错流程说明(适用人群/可报哪些错/审核与回复周期/数据来源透明度)
                        └─ 下半:通用工单表单 ─┐
                                               ├──► POST /report ──► Resend ──► 团队邮箱(人工审核)
详情页 Report correction 按钮 ─ 预填记录上下文 ─┘
```

两个入口**共用** `ReportForm` 组件与后端 `/report` 端点;区别仅在卡片入口带 `internal_id` + 记录快照、默认展开「按字段纠错」。

## 3. 前端结构

### 3.1 导航栏

`App.tsx` 两处导航(`HomePage` 与 `InnerPageLayout`)各加一个 `Report Error / 报错` 链接(`<Link to="/report">`),文案随 `lang` 切换,样式沿用现有导航项。

### 3.2 新路由与页面

- 新增路由 `/report`,经 `InnerPageLayout` 渲染(与其它内页一致)。
- 新组件 `components/ReportPage.tsx`:
  - **上半「流程说明」**:面向原作者的纠错指引——适用人群、可报哪些错(字段层级)、审核与回复周期、数据来源透明度声明。**不展示任何联系邮箱。**
  - **下半「工单入口」**:渲染共享 `ReportForm`,`mode="general"`。

### 3.3 共享表单组件 `components/ReportForm.tsx`

受控表单,负责字段渲染、校验、提交、成功/失败状态。两种 `mode`:

- `general` —— 通用工单;reporter 自填记录定位信息(DOI / sequence name / target)。
- `record` —— 绑定一条 `AptamerRecord`;顶部显示只读记录摘要,并提供「哪个字段有问题」勾选器。

提交状态:`idle | submitting | success | error`。`submitting` 时禁用提交按钮防重复;`success` 显示确认信息 + 预计回复周期;`error` 显示「提交失败,请稍后重试」并**保留已填内容**。

### 3.4 卡片入口

`AptamerDetailPage.tsx`(单条详情页,信息最全)新增低调的「⚐ Report correction」按钮 → 打开 `ReportForm` 弹窗(modal),`mode="record"` 并传入当前 `record`。

## 4. 「按字段纠错」选择器(对齐卡片 schema)

按详情页已有分区将 `AptamerRecord` 字段分组,reporter 勾选问题字段后逐项填写「建议正确值」:

| 分组 | 可报字段 |
|------|----------|
| Target | target_name / target_type / gene_symbol / external_id |
| Sequence | aptamer_sequence / sequence_id(名称) |
| Affinity | affinity(Kd) / pKd / buffer_condition |
| Secondary structure | secstr_dotbracket / mfe / 结构图 |
| Literature | article_title / journal / year / doi |
| Quality | level |
| Other | 自由描述 |

每个被勾选字段生成一行:`字段 | 当前值(record 模式自动带入) | 建议正确值(reporter 填写)`。

## 5. 提交载荷与后端

### 5.1 POST `/report`

加入 `mcp-server/src/http-sse.ts` 现有 REST 分发(纯 `http.createServer` 风格,与 `/search` `/top` 等并列)。

请求体:

```jsonc
{
  "mode": "record" | "general",
  "record": { "internal_id": "...", "sequence_id": "...", "target_name": "...", "doi": "..." }, // 可空
  "category": "Affinity",
  "corrections": [ { "field": "pKd", "current": "8.2", "suggested": "7.6" } ],
  "reason": "原文 Table 2 报告的是 ...",          // 必填
  "reporter": { "name": "...", "email": "...", "affiliation": "...", "isOriginalAuthor": true },
  "lang": "en" | "cn",
  "pageUrl": "https://.../aptamer/xxx",
  "_hp": ""                                        // 蜜罐;非空即静默丢弃
}
```

### 5.2 后端处理

1. 解析并校验:`reporter.name`、`reporter.email`、`reason` 必填;email 格式校验;`mode` 合法。
2. 反垃圾:蜜罐 `_hp` 非空 → 返回 `{ ok: true }` 但不发信(静默丢弃);轻量**内存限流**(同 IP N 次/小时)。
3. 用 **Resend HTTP API** 发结构化邮件:
   - `to`: `REPORT_TO_EMAIL`
   - `from`: `REPORT_FROM_EMAIL`
   - `reply_to`: reporter email(团队可直接回信作者)
   - `subject`: `[AptaNexus 纠错] {category} – {target_name || mode}`
   - 正文:全部字段 + 逐项 current→suggested + 记录链接 `pageUrl`。
4. 成功 → `{ ok: true }`;校验失败 → 400 + 明确错误;发信失败/未配置 → 500 + 明确错误。

### 5.3 新增环境变量

Render 后台配置,本地放 `mcp-server/.env`(与 `ARK_API_KEY` 同机制):

- `RESEND_API_KEY` —— Resend 密钥
- `REPORT_TO_EMAIL` —— 团队收件箱
- `REPORT_FROM_EMAIL` —— 发件地址(Resend 验证过的域名或其 onboarding 域名)

## 6. 双语

- 所有文案进 `constants.ts` 的 `CONTENT[lang]`,新增 `report` 段。
- `types.ts` 的 `ContentText` 接口新增 `report` 字段(沿用现有 `Language` 机制)。

## 7. 错误处理与降级

- 邮件未配置 / 发送失败 → 后端返回明确错误码;前端显示「提交失败,请稍后重试」并保留已填内容(不暴露邮箱)。
- 提交中禁用按钮防重复;成功后显示确认信息 + 预计回复周期。
- CORS:沿用 `http-sse.ts` 现有 `Access-Control-Allow-*` 头(已允许 POST)。

## 8. 测试

- 后端:`/report` 校验(缺字段 / 坏 email / 蜜罐命中 / 限流)、payload→邮件字段映射;mock Resend 调用,不真发信。
- 前端:`ReportForm` 必填校验、record 模式预填、成功/失败 UI 切换。
- 实施前先确认项目是否已有测试框架;若无则建最小可行配置。

## 9. 暂不做(YAGNI)

- 不做后台管理页 / 数据库(审核在邮箱内完成,符合所选方案)。
- 不做账号 / 登录、不做 captcha(蜜罐 + 限流足够当前流量级别)。
- 不做附件上传。
- 不在聚合预览卡 `TargetCard.tsx` 上加按钮(详情页已覆盖)。

## 10. 涉及文件清单

| 文件 | 改动 |
|------|------|
| `App.tsx` | 两处导航加 Report Error 链接;新增 `/report` 路由 |
| `components/ReportPage.tsx` | 新建:纠错页(说明 + 通用工单) |
| `components/ReportForm.tsx` | 新建:共享表单(general / record 两模式) |
| `components/AptamerDetailPage.tsx` | 加「Report correction」按钮 + modal |
| `constants.ts` | 新增 `report` 双语文案 |
| `types.ts` | `ContentText` 加 `report` 字段 |
| `mcp-server/src/http-sse.ts` | 新增 `POST /report` 端点 + Resend 发信 |
| `mcp-server/.env` / `render.yaml` | 新增 RESEND_API_KEY / REPORT_TO_EMAIL / REPORT_FROM_EMAIL |
| 测试文件 | `/report` 后端测试 + `ReportForm` 前端测试 |
