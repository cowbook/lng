---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
pageClass: lng-home
description: LNG国际贸易知识库，提供实时行情、贸易基础手册、产业链深度报告与中英双语内容。

hero:
  name: "Lng Cool"
  text: "LNG国际贸易烹饪手册"
  tagline: 开源LNG贸易、行情、报告与研究工具

  image:
    src: ./images/lng_global.png
    alt: LNG LOGO

 
features:
  - icon: 🌊
    title: 4.1 <b>亿吨</b>
    details: <div class="wave"><div class="wave1"></div><div class="wave2"></div><div class="wave3"></div></div><text>2024年全球LNG贸易 </text>

  - icon: 📈
    title: 11.9 <b>$/mmBtu</b>
    details: 2024年JKM平均价格

  - icon: ⚓
    title: 4.94 <b>亿吨/年</b>
    details: 液化能力（年）

  - icon: 💭
    title: 10.6 <b>亿吨/年</b>
    details: 气化能力（年）

  - icon: ⚗️
    title: 11.2 <b>亿吨/年</b>
    details: 报建液化能力

  - icon: 💭
    title: 2.1 <b>亿吨/年</b>
    details: 海上气化能力

  - icon: 🛥️
    title: 742 <b>条</b>
    details: LNG运输船

  - icon: 🚤
    title: 56 <b>条</b>
    details: LNG动力船
---

## 研究报告

<div class="report-grid">


  <article class="report-card report-ai"><img class="report-cover" src="https://www.datocms-assets.com/146580/1768468979-report-cover-2026.png" alt="The Role of Gas in Powering AI-Driven Energy Demand" /><div class="report-content"><a target="_blank" href="https://www.igu.org/igu-reports/the-role-of-gas-in-powering-ai-driven-energy-demand">📑 气电助力AI能源需求</a><p>该报告指出，AI 经济驱动下数据中心正在成为新的“工业负荷”，其用电量预计到 2030 年将翻倍至 800-1000 TWh。尽管可再生能源预计可覆盖约一半数据中心用电，但其波动性与数据中心 24/7 平稳负荷并不匹配，系统仍需更多可调度电源能力。</p><p>报告强调长期能源规划应基于事实、透明且符合电力基础设施现实约束，并论证天然气在支撑 AI 驱动电力需求增长中的关键作用。</p><a target="_blank" href="https://www.igu.org/igu-reports/the-role-of-gas-in-powering-ai-driven-energy-demand">🔗 查看报告</a></div></article>

  <article class="report-card report-world"><img class="report-cover" src="/images/image_202507301502.png" alt="2025 LNG Report" /><div class="report-content report-content-world"><a target="_blank" href="https://www.igu.org/igu-reports/2025-world-lng-report/">📑 2025 World LNG Report</a><p>全球液化天然气（LNG）贸易在 2024 年增长了 2.4%，达到 4.1124 亿吨，连接了 22 个出口市场和 48 个进口市场。亚太地区仍是最大的出口区域，2024 年出口量为 1.3891 亿吨，比 2023 年增加了 410 万吨。</p><p>欧洲 LNG 进口大幅下降，同比减少 2122 万吨，降至 1.0007 亿吨，主要原因是年初高库存、需求疲软以及管道气供应稳定。然而，亚洲 LNG 需求回升，中国和印度现货 LNG 进口同比大幅增长，受热浪、基础设施扩建和发电对天然气依赖增强等因素推动。</p><a target="_blank" href="https://www.datocms-assets.com/146580/1751026179-igu-world-lng-report-2025-hr_dp_c.pdf">⬇️ Download PDF</a></div></article>

  <article class="report-card report-china"><img class="report-cover cover-bordered" src="/images/home_2509011642.png" alt="中国天然气发展报告 2025" /><div class="report-content"><a target="_blank" href="./report/China2025">📑 中国天然气发展报告 2025</a><p>2024 年，世界天然气消费量 4.13 万亿立方米，同比增速由上年的 0.1% 提升至 2.5%，主要受国际气价下跌、全球经济温和复苏、北半球夏季极端高温等因素影响。</p><p>欧洲实现近三年以来的首次正增长，全年消费量 4687 亿立方米，同比增长 1.4%，主要是由于气价下跌刺激工业用气回升，但经济疲弱、风光核电出力增加抑制气电需求。北美地区全年天然气消费量 1.1 万亿立方米，同比增长 1.3%。其中，美国消费量 9022 亿立方米，同比增长 1.3%，主要是发电用气增长带动。</p><a target="_blank" href="https://www.nea.gov.cn/20250829/a4e2deb9b6444df1a191b9d60c111ffd/20250829a4e2deb9b6444df1a191b9d60c111ffd_43ab87a785d1b64d49b9210dbc15d3781e.pdf">⬇️ Download PDF</a></div></article>

</div>

<style>
.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.report-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.report-cover {
  width: 132px;
  border-radius: 10px;
  display: block;
}

.cover-bordered {
  border: 1px #eee solid;
}

.report-content {
  flex: 1;
  min-width: 0;
}

.report-content-world {
  max-width: none;
}

.report-content a {
  text-decoration: none;
}

.report-content p {
  margin: 10px 0;
}

@media (max-width: 768px) {
  .report-grid {
    grid-template-columns: 1fr;
  }

  .report-card {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .report-content {
    width: 100%;
    margin: 0;
  }

  .report-cover {
    width: 100%;
    max-width: 220px;
  }

  .report-content,
  .report-content-world {
    max-width: none;
  }
}
</style>

## 市场行情
