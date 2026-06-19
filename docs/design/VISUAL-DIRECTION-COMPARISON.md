# HyperSolid 视觉方向对比（A 当前 / B 备选 / 基线 通用默认）

> 方法：frontend-design。基线列是"要规避的对象"（该技能点名的 AI 默认套路），用于反衬 A/B 的辨识度。

## 三个方向一句话
- **A · Electrum Terminal（当前方案）**：深海墨蓝 + 银金 electrum 的精密仪器；冷静、可信、把液态市场凝固成固态控制台。
- **B · Daylight Ledger（备选）**：冷调"纸面"明亮主题 + 石油墨蓝；像一张会呼吸的现代账簿，反差化（市面几乎全是深色），极致可读/无障碍。
- **基线 · Generic Neon Dark（要避免）**：近黑底 + 霓虹绿/红，Inter 一把梭，发光卡片——和每个 CEX 一模一样、零识别度。

## 并排对比

| 维度 | A · Electrum Terminal（当前） | B · Daylight Ledger（备选） | 基线 · Generic Neon（避免） |
|---|---|---|---|
| 主题/气质 | 冷静、精密、贵金属信任感 | 明亮、清晰、账簿般可信 | 夜店霓虹、千篇一律 |
| 背景 | Abyss `#0A1217` 深海墨蓝(非纯黑) | Bond `#EEF1F3` 冷纸白 | `#0B0B0E` 近黑 |
| 表面 | Trench `#0F1A20` | Card `#FFFFFF` / Sub `#E4E9EC` | `#15151A` |
| 结构线 | Reef `#20303A` 发丝 | Rule `#CBD5D8` 账簿基线 | 发光描边 |
| 品牌强调色 | Electrum `#E8C98F` 银金 | Petrol `#0E5A6B` 石油墨蓝 | 霓虹绿 `#00FF9D`（=上涨绿，撞色）|
| 涨/跌(语义) | Jade `#34C98B` / Ember `#FF5C63` | Pine `#1E7F5C` / Brick `#C0492F`(印刷感) | 霓虹绿/霓虹红 |
| 品牌色 vs 语义色 | **分离**(银金≠绿)，杜绝撞色 | **分离**(墨蓝≠绿) | **混同**(品牌=上涨绿) |
| 字体 | Space Grotesk + Geist Mono(数字主角) + Geist Sans | 同字族族，黑底→白底反相 | Inter 全场 |
| Signature | Phase Pulse 相变脉冲(agent 心跳:液态流动/固态实线) | Ledger Baseline 账簿基线 + 成交手戳 | 无(大数字+渐变) |
| 动效 | 脉冲呼吸 + 数字闪动 + 机械抽屉 | 极克制:基线对齐 + 翻页 | 到处发光/弹跳 |
| 长时段护眼 | 强(深色 OLED) | 强(高对比白天) | 中(纯黑+霓虹易疲劳) |
| 上架辨识度 | 高 | 高(且与众不同) | 低 |
| 适合 | crypto-native 夜猫子 + 重 agent 自动化 | 重可读/无障碍、想"不像每个交易所"的用户 | —(反面教材) |
| 主要风险 | 深色+金可能"不够 crypto" | 明亮在"严肃交易=深色"惯性下显轻 | 无识别、与赛道同质 |

## Markets 列表三版线框对照

A · Electrum（深海墨蓝 / 银金脉冲）
```
≈ electrum pulse ≈ (agent active)
HyperSolid                 ◷ Testnet
BTC-PERP   62,481.5  ▲ +2.14%   ← 等宽数字, 变动位闪银金
ETH-PERP    3,002.18 ▼ -0.86%
```

B · Daylight Ledger（冷纸白 / 墨蓝 / 账簿基线）
```
─ ledger baseline ───────────────
HyperSolid                 ◷ Testnet
BTC-PERP   62,481.5   ▲ +2.14%
··········(faint baseline grid)···
ETH-PERP    3,002.18  ▼ -0.86%
```

基线 · Generic Neon（避免）
```
[near-black + glow]
BTC/USDT  62,481.5  +2.14%   ← 霓虹绿=品牌=上涨, 撞色
ETH/USDT   3,002.18 -0.86%   ← Inter, 发光卡片, 无个性
```

## 推荐
- **主推 A（Electrum Terminal）**：与产品名"HyperSolid"张力、"离线 agent 守护资产"的叙事最契合，且深色满足长时段交易的功能需求。
- **B 作为强力差异化备选**：若你想在满屏深色交易所里"反差出圈"、或更重无障碍/白天可读，B 是站得住脚的另一条路。
- 也可 **A 为默认主题、B 为内置浅色主题**——两者品牌色都与涨跌语义分离，体系自洽，可共存。

---

## 真实渲染（高保真截图）
通过真实 HTML/CSS + 无头 Chrome 渲染（非 Stitch；本环境未配置 Stitch MCP，仅有 figma MCP）：
- `docs/design/renders/A.png` — A · Electrum Terminal（深色），含 Markets / Market Detail / Agent 三屏
- `docs/design/renders/B.png` — B · Daylight Ledger（浅色），含同样三屏
- 源文件：`docs/design/renders/A.html` `B.html`，生成器 `docs/design/renders/build.js`（改 token 即可重渲）
- 重渲命令：`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --force-device-scale-factor=2 --window-size=1240,940 --screenshot=A.png file://.../A.html`

---

## C · Oscilloscope（经 skill 工具正式调用 frontend-design 新增）
- 概念：市场=精密仪器上永不熄灭的琥珀荧光波形；贴合"离线 agent 24/7 读信号"。
- Signature：The Phosphor Trace —— 每屏顶部发光琥珀波形即 agent 心跳，三屏振幅递增（Agent 屏最活跃）。
- Token：暖墨黑 #0C0A07 / 荧光琥珀 #FFB454 / 高亮 #FFD9A0 / 暖羊皮纸字 #F3ECDD；涨跌仅薄荷 #6FE0C0 / 珊瑚 #FF7A6B。
- 字体：Space Mono(展示) + JetBrains Mono(数字) + Inter Tight(UI)；图表/面板方格纸网格。
- 刻意规避默认②：暖墨黑+琥珀 CRT 仪器语汇，非冷霓虹绿；胆量集中于荧光这一处。
- 渲染：docs/design/renders/C.png（Markets/Detail/Agent 三屏），源码 C.html + build-c.js。

## 三方向总览
- A · Electrum Terminal：深海墨蓝 + 银金，沉稳贵金属信任。
- B · Daylight Ledger：冷纸白 + 墨蓝，明亮账簿/无障碍，宜作浅色主题。
- C · Oscilloscope：暖墨黑 + 琥珀荧光示波器，最大胆、最具记忆点。
