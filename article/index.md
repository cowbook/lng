# 文章与资讯

<script setup>
import newsDigest from '../.vitepress/data/news-digest.json'
import wechatWatchlist from '../.vitepress/data/wechat-watchlist.json'
</script>

这里统一汇总公众号文章、行业新闻、资讯与学术内容。

## 微信公众号半自动采集面板

<WechatDigestPanel />

## 微信公众号每日采集清单

数据更新时间: {{ wechatWatchlist.updatedAt }}

<ul>
	<li v-for="account in wechatWatchlist.accounts" :key="account">{{ account }}</li>
</ul>

## 每日行业新闻（自动采集）

数据更新时间: {{ newsDigest.updatedAt }}

<ul>
	<li v-for="item in newsDigest.news" :key="item.link">
		<a :href="item.link" target="_blank" rel="noreferrer">{{ item.title }}</a>
		<span>（{{ item.publishedAt || '无日期' }}）</span>
	</li>
</ul>

## 每日学术文章（自动采集）

<ul>
	<li v-for="item in newsDigest.academic" :key="item.link">
		<a :href="item.link" target="_blank" rel="noreferrer">{{ item.title }}</a>
		<span>（{{ item.publishedAt || '无日期' }}）</span>
	</li>
</ul>

## 快速补录命令

```bash
npm run wechat:add -- --account="天然气咨询" --title="标题" --link="https://mp.weixin.qq.com/..." --type="news" --publishedAt="2026-03-23"
```