
import { ContentText, Language } from './types';

export const CONTENT: Record<Language, ContentText> = {
  en: {
    hero: {
      title: "Aptamers: From the First Discovery to the AI-Driven Era",
      subtitle: [
        "In 1990, the first aptamer emerged through in vitro selection, marking the beginning of programmable molecular recognition.",
        "In 2025, AI-driven literature mining now enables a comprehensive, 20-year integration of sequences, targets and affinities at an unprecedented scale."
      ],
      timeline: [
        { year: "1990", event: "First aptamer" },
        { year: "2004", event: "Aptamer Database" },
        { year: "2014", event: "High-throughput SELEX" },
        { year: "2025", event: "AI extraction era" },
      ]
    },
    mission: {
      title: "A new foundation for aptamer science",
      body: "This database integrates over 12,000 curated records, 4,800+ Affinity-validated sequences, and 1,900+ unique targets mined from 23,000 publications spanning 2005–2025. It is designed to be both scientifically rigorous and AI-ready, supporting sequence analysis, target profiling, affinity benchmarking, and future computational design."
    },
    search: {
      title: "Start Exploring Aptamers",
      placeholder: "Search aptamer sequences, targets, or keywords…",
      buttons: ["Search by Sequence", "Search by Target", "Search by Affinity", "Explore 20-Year Literature"],
      hints: ["Search by Target Name (e.g. Thrombin)", "Search by Sequence (e.g. GGTTGG...)", "Search by Gene Symbol (e.g. VEGF)", "Filter by Affinity Level"]
    },
    stats: {
      items: [
        { value: "23000+", label: "Publications" },
        { value: "1,900+", label: "Unique Targets" },
        { value: "12,500+", label: "Curated Records" },
        { value: "4815", label: "Affinity-validated" },
        { value: "20+ Years", label: "Literature Coverage" },
        { value: "AI + Human", label: "Verification Model" },
      ],
      footer: "We combine LLM-driven extraction with multi-stage human calibration to guarantee data accuracy and reproducibility."
    },
    education: {
      title: "What are aptamers?",
      body: "Aptamers are structured nucleic acids capable of binding specific targets — from small molecules to proteins and cells — with antibody-like precision. Their programmability, synthetic accessibility and stability make them powerful tools in diagnostics, therapeutics and biosensing."
    },
    ai: {
      title: "AI-Ready by Design",
      body: "Every entry is normalized, structured and uniquely indexed, enabling seamless integration with machine learning pipelines and MCP-based LLM agents."
    },
    history: {
      items: [
        { year: "1990", title: "First aptamer discovered" },
        { year: "2004", title: "Early databases emerge" },
        { year: "2010–2020", title: "High-throughput SELEX, aptamer expansion" },
        { year: "2025", title: "LLM-mined, AI-ready aptamer knowledgebase" },
      ]
    },
    report: {
      navLabel: "Report Error",
      pageTitle: "Report a Data Correction",
      pageSubtitle: "AptaNexus combines LLM-driven extraction with human calibration. If you are an original author — or a reader who spotted an error — this channel lets you submit corrections directly to our curation team.",
      steps: [
        { title: "Tell us what is wrong", body: "Choose whether you are correcting a specific database record or reporting a general issue. For a specific record, open it and use the \"Report correction\" button so the fields are pre-filled." },
        { title: "Select the affected fields", body: "Pick the category (target, sequence, affinity, structure, literature, quality) and check the exact fields that are incorrect. The current stored value is shown next to each one." },
        { title: "Provide the correct information", body: "Enter the corrected value for each field and explain the reason, ideally citing the relevant table, figure or section of the original paper." },
        { title: "We review and follow up", body: "Your report is sent to our curation team for manual review. We may reply to your email for clarification, and confirmed corrections are applied to the database. Typical turnaround is 1–2 weeks." },
      ],
      scopeTitle: "What you can report",
      scopeItems: [
        "Incorrect target, gene symbol or external identifier",
        "Wrong or truncated aptamer sequence or name",
        "Incorrect affinity (Kd), pKd or buffer conditions",
        "Errors in secondary structure, dot-bracket or MFE",
        "Wrong article title, journal, year or DOI",
        "Misclassified quality level, or anything else",
      ],
      formHeading: "Submit a correction ticket",
      labels: {
        category: "Problem category",
        whichFields: "Which fields are incorrect?",
        currentValue: "Current value",
        suggestedValue: "Correct value",
        reason: "Reason / evidence",
        reasonPlaceholder: "e.g. Table 2 of the original paper reports Kd = 38 nM, not 380 nM.",
        name: "Your name",
        email: "Your email",
        affiliation: "Affiliation (optional)",
        isAuthor: "I am an original author of this work",
        recordLocator: "Record (DOI / sequence name / target)",
        submit: "Submit report",
        submitting: "Submitting…",
        requiredMark: "*",
      },
      success: { title: "Thank you — report received", body: "Our curation team will review your correction and may follow up by email. Typical turnaround is 1–2 weeks." },
      errorBody: "Submission failed. Please try again in a moment — your entries have been kept.",
      validation: { name: "Please enter your name.", email: "Please enter a valid email address.", reason: "Please describe the issue." },
      cardButton: "Report correction",
      recordSummaryTitle: "Reporting on this record",
    }
  },
  cn: {
    hero: {
      title: "适配体：从首次发现到 AI 驱动时代",
      subtitle: [
        "自 1990 年首个适配体诞生以来，核酸分子识别技术不断拓展新的边界。",
        "如今，AI 主导的文献挖掘使我们得以整合 20 年的序列、靶标与亲和力数据，构建前所未有的知识图谱。"
      ],
      timeline: [
        { year: "1990", event: "首次发现" },
        { year: "2004", event: "早期数据库" },
        { year: "2014", event: "高通量 SELEX" },
        { year: "2025", event: "AI 挖掘时代" },
      ]
    },
    mission: {
      title: "适配体研究的新基础设施",
      body: "数据库整合了 2005–2025 年间 25,000 篇文献中提取的 12000+ 条记录，覆盖 4800+亲和力验证的序列与 1900+ 个独立靶标。我们以最高标准进行清洗与校准，并实现完整的 AI-ready 结构，支持序列检索、靶标探索、亲和力分析与未来的计算设计。"
    },
    search: {
      title: "从序列、靶标或关键字开始探索…",
      placeholder: "输入序列、靶标或关键词…",
      buttons: ["序列检索", "靶标检索", "亲和力检索", "探索 20 年文献"],
      hints: ["按靶标名称搜索 (如 Thrombin)", "按序列搜索 (如 GGTTGG...)", "按基因符号搜索 (如 VEGF)", "按亲和力等级筛选"]
    },
    stats: {
      items: [
        { value: "23000+", label: "收录文献" },
        { value: "1,900+", label: "独立靶标" },
        { value: "12,500+", label: "清洗后数据" },
        { value: "4815", label: "亲和力验证" },
        { value: "20+ 年", label: "文献覆盖" },
        { value: "AI + 人工", label: "双重校准" },
      ],
      footer: "由大模型抽取、经多阶段人工校准，保证数据准确性与可复现性。"
    },
    education: {
      title: "什么是适配体？",
      body: "适配体是具有特异性识别能力的核酸分子，可结合小分子、蛋白甚至细胞等广泛靶标，精确度可媲美抗体。凭借良好的可编程性、合成简便性与高稳定性，适配体在诊断、治疗与生物传感中具有重要潜力。"
    },
    ai: {
      title: "从设计伊始就为 AI 准备",
      body: "所有数据均结构化、规范化并具统一 ID，可直接对接机器学习流程与基于 MCP 的大模型代理。"
    },
    history: {
      items: [
        { year: "1990", title: "首个适配体发现" },
        { year: "2004", title: "早期数据库建立" },
        { year: "2010–2020", title: "高通量 SELEX 技术爆发" },
        { year: "2025", title: "LLM 驱动的智能适配体知识库" },
      ]
    },
    report: {
      navLabel: "报错",
      pageTitle: "提交数据更正",
      pageSubtitle: "AptaNexus 由大模型抽取并经人工校准。如果您是原作者，或在使用中发现了错误，可通过此渠道将更正直接提交给我们的数据审核团队。",
      steps: [
        { title: "说明问题所在", body: "先选择您是要更正某条具体的数据库记录，还是反馈一般性问题。若针对具体记录，请打开该记录并使用 “Report correction” 按钮，相关字段会自动带入。" },
        { title: "选择出错的字段", body: "选择问题类别（靶标、序列、亲和力、结构、文献、质量），并勾选确切出错的字段；每个字段旁会显示当前存储的值。" },
        { title: "填写正确的内容", body: "为每个字段填写正确值，并说明理由，最好引用原文的相应表格、图或章节。" },
        { title: "我们审核并回复", body: "您的报告会发送给数据审核团队进行人工审核。我们可能通过邮件与您联系核实，确认无误的更正将更新到数据库。通常处理周期为 1–2 周。" },
      ],
      scopeTitle: "可报告的内容",
      scopeItems: [
        "靶标、基因符号或外部标识符有误",
        "适配体序列或名称错误、被截断",
        "亲和力（Kd）、pKd 或缓冲条件有误",
        "二级结构、点括号或 MFE 错误",
        "文章标题、期刊、年份或 DOI 错误",
        "质量等级分类错误，或其他任何问题",
      ],
      formHeading: "提交纠错工单",
      labels: {
        category: "问题类别",
        whichFields: "哪些字段有误？",
        currentValue: "当前值",
        suggestedValue: "正确值",
        reason: "理由 / 依据",
        reasonPlaceholder: "例如：原文 Table 2 报告的 Kd 为 38 nM，而非 380 nM。",
        name: "您的姓名",
        email: "您的邮箱",
        affiliation: "单位（选填）",
        isAuthor: "我是这项工作的原作者",
        recordLocator: "记录（DOI / 序列名称 / 靶标）",
        submit: "提交报告",
        submitting: "提交中…",
        requiredMark: "*",
      },
      success: { title: "感谢您——报告已收到", body: "我们的数据审核团队会审核您的更正，并可能通过邮件与您联系。通常处理周期为 1–2 周。" },
      errorBody: "提交失败，请稍后重试——您填写的内容已保留。",
      validation: { name: "请填写您的姓名。", email: "请填写有效的邮箱地址。", reason: "请描述问题。" },
      cardButton: "报错纠正",
      recordSummaryTitle: "正在报告此记录",
    }
  }
};
