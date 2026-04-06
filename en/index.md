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

  actions:
    - theme: brand
      text: Beginner's Guide
      link: /basis
    - theme: alt
      text: Market
      link: /#

features:
  - icon: 🌊
    title: 410.12 <b>MT</b>
    details: <div class="wave"><div class="wave1"></div><div class="wave2"></div><div class="wave3"></div></div><text>24 Global LNG Trade</text>

  - icon: 📈
    title: 11.9 <b>$/mmBtu</b>
    details: 2024 JKM Price

  - icon: ⚓
    title: 494 <b>MT/year</b>
    details: Liquefaction Capacity

  - icon: 💭
    title: 1,060 <b>MT/year</b>
    details: Regasification Capacity

  - icon: ⚗️
    title: 1,120 <b>MT/year</b>
    details: Planned Liquefaction

  - icon: 💭
    title: 210 <b>MT/year</b>
    details: Offshore Regasification

  - icon: 🛥️
    title: 742 <b>vessels</b>
    details: LNG Carriers

  - icon: 🚤
    title: 56 <b>vessels</b>
    details: LNG-fueled Ships
---

## Research Reports

<div class="report-card report-world">
  <div class="report-media-left">
    <img src="/images/image_202507301502.png" alt="2025 LNG Report" />
  </div>

  <div class="report-content">
    <a target="_blank" href="https://www.igu.org/igu-reports/2025-world-lng-report/">📑 2025 World LNG Report</a>

    <p>
      Global LNG trade grew by 2.4% in 2024 to 410.12 million tonnes, connecting 22 export markets and 48 import markets. The Asia-Pacific region remained the largest exporter, with 138.91 million tonnes in 2024, up 4.1 million tonnes from 2023.
    </p>

    <a target="_blank" href="https://www.datocms-assets.com/146580/1751026179-igu-world-lng-report-2025-hr_dp_c.pdf">⬇️ Download PDF</a>
  </div>

  <div class="report-media-right">
    <img src="/images/image_202507301509.png" alt="2025 World LNG Report chart" />
  </div>
</div>

<div class="report-card report-china">
  <div class="report-media-left">
    <img src="/images/home_2509011642.png" alt="China gas report cover" class="cover-bordered" />
  </div>

  <div class="report-content">
    <a target="_blank" href="./report/China2025">📑 China Natural Gas Development Report 2025 (English)</a>

    <p>
      In 2024, global natural gas consumption reached 4.13 trillion cubic meters, with the growth rate rising from 0.1% last year to 2.5%, mainly due to lower international gas prices, moderate global economic recovery, and extreme summer heat in the Northern Hemisphere.
    </p>

    <a target="_blank" href="https://www.nea.gov.cn/20250829/a4e2deb9b6444df1a191b9d60c111ffd/20250829a4e2deb9b6444df1a191b9d60c111ffd_43ab87a785d1b64d49b9210dbc15d3781e.pdf">⬇️ Download PDF (Chinese)</a>
  </div>

  <div class="report-media-right">
    <img src="/images/home_2509011646.png" alt="China gas report chart" class="china-chart" />
  </div>
</div>

<style>
.report-card {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 22px;
}

.report-card:first-of-type {
  margin-top: 0;
}

.report-media-left img {
  width: 180px;
  border-radius: 10px;
  display: block;
}

.report-media-left .cover-bordered {
  border: 1px #eee solid;
}

.report-content {
  max-width: 500px;
}

.report-content a {
  text-decoration: none;
}

.report-content p {
  margin: 10px 0;
}

.report-media-right {
  margin-left: auto;
  flex-basis: 510px;
}

.report-world .report-media-right {
  margin-top: -70px;
}

.report-media-right img {
  width: 500px;
  display: block;
}

.report-china .report-media-right {
  margin-top: 30px;
}

.report-china .china-chart {
  width: 300px;
  margin-left: auto;
  margin-top: 30px;
}

@media (max-width: 768px) {
  .report-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .report-media-left,
  .report-content,
  .report-media-right {
    width: 100%;
    margin: 0;
    flex-basis: auto;
  }

  .report-media-left img {
    width: 100%;
    max-width: 220px;
  }

  .report-content {
    max-width: none;
  }

  .report-world .report-media-right,
  .report-china .report-media-right,
  .report-china .china-chart {
    margin-top: 0;
    margin-left: 0;
  }

  .report-media-right img,
  .report-china .china-chart {
    width: 100%;
    max-width: 520px;
  }
}
</style>

##

