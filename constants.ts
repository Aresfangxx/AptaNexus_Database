
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
      body: "This database integrates over 17,000 curated records, 6769 Affinity-validated sequences, and 2,300+ unique targets mined from 23,000 publications spanning 2005–2025. It is designed to be both scientifically rigorous and AI-ready, supporting sequence analysis, target profiling, affinity benchmarking, and future computational design."
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
        { value: "2361", label: "Unique Targets" },
        { value: "17,563", label: "Curated Records" },
        { value: "6769", label: "Affinity-validated" },
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
      body: "数据库整合了 2005–2025 年间 25,000 篇文献中提取的 18,000+ 条记录，覆盖 14,000+ 序列与 2,383 个独立靶标。我们以最高标准进行清洗与校准，并实现完整的 AI-ready 结构，支持序列检索、靶标探索、亲和力分析与未来的计算设计。"
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
        { value: "2361", label: "独立靶标" },
        { value: "17,563", label: "清洗后数据" },
        { value: "6769", label: "亲和力验证" },
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
    }
  }
};
