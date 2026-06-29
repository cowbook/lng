---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
pageClass: lng-home-en
description: Open-source LNG international trade knowledge base with real-time market data, trade guides, research reports, and bilingual content.

hero:
  name: "Lng Cool"
  text: "LNG International Trade Cookbook"
  tagline: Open Source Platform for LNG Trading, Market, Reports & Research

  image:
    src: ../images/lng_global.png
    alt: LNG LOGO

  # actions:
  #   - theme: brand
  #     text: Beginner's Guide
  #     link: /basis
  #   - theme: alt
  #     text: Market
  #     link: /#

features:
  - icon: 🌊
    title: 428 <b>MT</b>
    details: <div class="wave"><div class="wave1"></div><div class="wave2"></div><div class="wave3"></div></div><text>Global LNG imports (35% spot)</text>

  - icon: 📈
    title: 524 <b>MTPA</b>
    details: Liquefaction capacity (incl. 16.5 MTPA FLNG)

  - icon: ⚓
    title: 1,247 <b>MTPA</b>
    details: Regasification capacity (9 new terminals / 9 expansions)

  - icon: 💭
    title: 899 <b>vessels</b>
    details: LNG fleet (+8% y-o-y)

  - icon: ⚗️
    title: +22 <b>MT</b>
    details: Global variation (+28 MT Europe, -11 MT Asia)

  - icon: 💭
    title: 9 <b>FIDs</b>
    details: Liquefaction projects (plus 3 new projects and 1 expansion)

  - icon: 🛥️
    title: +25 <b>MTPA</b>
    details: New regasification capacity in Asia (Taiwan 3rd, India 8th terminal)

  - icon: 🚤
    title: 4 <b>MT</b>
    details: LNG bunkering (+38%, +3 LNGBV)
---



## Research Reports

<div class="report-grid">

  <article class="report-card"><img class="report-cover cover-bordered" src="/images/report-covers/cover-iea-global-energy-review-2026.png" alt="Global Energy Review 2026" /><div class="report-content"><a target="_blank" href="./report/GlobalEnergyReview2026">📑 Global Energy Review 2026</a><p>The IEA's Global Energy Review 2026 assesses the trends that took place in 2025 across the energy sector worldwide, covering major fuels, technologies, and regions.</p><p>It works well as a lead report in the research section because it frames LNG and gas within the broader annual shifts across power, oil, coal, renewables, and global energy demand.</p><a target="_blank" href="https://iea.blob.core.windows.net/assets/ade8ff08-3401-4e0b-9b3b-e8f3988d238e/GlobalEnergyReview2026.pdf">🔗 Read Report</a></div></article>

  <article class="report-card report-ai"><img class="report-cover" src="https://www.datocms-assets.com/146580/1768468979-report-cover-2026.png" alt="The Role of Gas in Powering AI-Driven Energy Demand" /><div class="report-content"><a target="_blank" href="https://www.igu.org/igu-reports/the-role-of-gas-in-powering-ai-driven-energy-demand">📑 The Role of Gas in Powering AI-Driven Energy Demand</a><p>This report highlights that electricity demand growth is accelerating as data centres become the new “industrial load” of the AI economy, with their electricity consumption projected to double to 800-1000 TWh by 2030.</p><p>While renewables may provide about half of data-centre demand by 2030, their variability does not match the flat 24/7 load profile. The report argues for fact-based, transparent long-term planning and explains why gas remains a key source of dispatchable capacity to support AI-driven demand growth.</p><a target="_blank" href="https://www.igu.org/igu-reports/the-role-of-gas-in-powering-ai-driven-energy-demand">🔗 Read Report</a></div></article>

  <article class="report-card report-world"><img class="report-cover" src="/images/image_202507301502.png" alt="2025 LNG Report" /><div class="report-content"><a target="_blank" href="https://www.igu.org/igu-reports/2025-world-lng-report/">📑 2025 World LNG Report</a><p>Global LNG trade grew by 2.4% in 2024 to 410.12 million tonnes, connecting 22 export markets and 48 import markets. The Asia-Pacific region remained the largest exporter, with 138.91 million tonnes in 2024, up 4.1 million tonnes from 2023.</p><a target="_blank" href="https://www.datocms-assets.com/146580/1751026179-igu-world-lng-report-2025-hr_dp_c.pdf">⬇️ Download PDF</a></div></article>

  <article class="report-card report-china"><img class="report-cover cover-bordered" src="/images/home_2509011642.png" alt="China gas report cover" /><div class="report-content"><a target="_blank" href="./report/China2025">📑 China Natural Gas Development Report 2025 (English)</a><p>In 2024, global natural gas consumption reached 4.13 trillion cubic meters, with the growth rate rising from 0.1% last year to 2.5%, mainly due to lower international gas prices, moderate global economic recovery, and extreme summer heat in the Northern Hemisphere.</p><a target="_blank" href="https://www.nea.gov.cn/20250829/a4e2deb9b6444df1a191b9d60c111ffd/20250829a4e2deb9b6444df1a191b9d60c111ffd_43ab87a785d1b64d49b9210dbc15d3781e.pdf">⬇️ Download PDF (Chinese)</a></div></article>

</div>

## Market

See the live dashboard and curves at [Market](/en/market/).



<GithubCounter
  title="GitHub Traffic"
  label="Views (last 14 days)"
/>



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
    display: block;
  }

  .report-content {
    max-width: none;
  }
}
</style>



