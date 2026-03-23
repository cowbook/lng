# 对话记录与重要信息

## 项目目标
- 完善LNG.cool网站
- 增加访问流量
- 提供中英文双语的LNG贸易基础、产业链知识、行业资讯、实时行情、在线研究工具

## 核心需求
1. **双语支持**: 中文和英文内容
2. **主要栏目**:
   - 基础知识 (basis/)
   - 行业报告 (report/)
   - 交易信息 (trade/)
   - 英文版本 (en/)
   - 文章/研究 (essay/)
   - 实时行情 (terminal/)
   - 头部内容 (top/)

## 重要配置
- 框架: Vue 3 + VitePress
- 包管理: npm（项目中保留 pnpm 锁文件用于 CI）
- 开发命令: npm run docs:dev
- 数据更新命令: npm run update:data
- 部署方式: GitHub Pages + GitHub Actions 每日自动部署

## 待讨论确认
- [ ] 流量优化策略：SEO、内容更新频率、用户体验优化
- [ ] 内容管理：编辑流程、更新周期
- [ ] 分析工具：当前使用的数据分析工具

## 进行中的任务
- [x] 项目结构分析完成
- [x] 系统配置文档完成
- [x] 发布流程文档完成
- [x] FRED 四项价格接入（Brent/KJM/TTF/Henry Hub）
- [x] 每日自动部署流程接入
- [ ] 微信公众号文章自动化抓取能力增强

## 相关命令
```bash
# 依赖安装
npm install

# 开发启动
npm run docs:dev

# 构建
npm run docs:build

# 部署到GitHub Pages
git push origin main  # 自动触发GitHub Actions部署
```

## 团队信息
- **项目所有者**: Mark Zuang
- **负责人邮箱**: markzuang0208@gmail.com
- **GitHub账户**: cowbook
- **仓库URL**: https://github.com/cowbook/lng

## 数据源需求
1. **实时行情数据（FRED）**:
   - Brent: DCOILBRENTEU
   - JKM回退代理: PNGASJPUSDM
   - TTF回退代理: PNGASEUUSDM
   - Henry Hub: DHHNGSP
2. **实时行情主源（已落地）**:
   - JKM主源: Barchart 公共页面（NYMEX JKM 活跃近月合约）
   - TTF主源: Barchart 公共页面（ENDEX Dutch TTF Gas 活跃近月合约）
   - JKM回退链路: Barchart -> NASDAQ Data Link -> FRED代理
   - TTF回退链路: Barchart -> FRED代理
2. **微信公众号目标账号**:
   - 天然气咨询、金联创天然气、skypiea、天然气市场笔记
   - LNG行业信息、华气能源猎头、ICIS安迅思、振邦天然气LNG新能源
3. **每日内容要求**: 每天收集有价值新闻与学术文章
4. **手动补充**: Mark 会持续人工补充



# 所有对话日志记在下面

## 所有AI与Mark交流记录

### 2026-03-23 10:50

完成 JKM/TTF 主源切换到可访问公开源，保留回退链路，完成本地与构建验证，并记录 FRED 日期滞后原因
- 已完成 JKM 名称与来源修正：从日本进口价代理表述改为 JKM 东北亚基准价
- 已完成 TTF 名称与来源修正：从欧洲气价代理表述改为 TTF 欧洲气价基准
- 已实现 JKM 与 TTF 的可程序化公开源抓取，并保留稳定回退机制
- 已完成本地更新与构建验证，市场页可正常展示新数据
- 已定位 FRED 日期偏前原因为上游发布节奏，不是脚本故障
- 已在 GitHub Actions 配置 NASDAQ_DATA_LINK_API_KEY，当前网络环境下该接口存在 403 风险，系统可自动回退

### 2026-03-24 07:14

本次会话已按用户要求保存到 aiwork 目录并准备发布。
- 对话保存：在 `aiwork/memory.md` 追加会话摘要与执行结果。
- 状态确认：检测到用户撤销了首页 `index.md` 的上一轮改动，保留当前文件现状不强制覆盖。
- 发布动作：将当前工作区改动（排除 `.DS_Store`）提交到 `main` 并推送到 GitHub。
- 部署说明：推送 `main` 后由 GitHub Actions 自动触发站点发布流程。





