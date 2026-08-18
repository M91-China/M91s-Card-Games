# HappyCard - 网页版欢乐斗地主 & 掼蛋

HappyCard 是一个基于原生 HTML/CSS/JavaScript 的网页版扑克牌游戏项目，包含欢乐斗地主与掼蛋两种玩法。项目以 VSCode 为开发环境，采用前端静态页面结构，覆盖牌型规则、AI 策略、界面渲染、动画音效与本地数据统计等功能，适合用于前端游戏开发学习、原型演示和二次开发。

## 当前版本：阶段10（文档、最终整合、工程交付）

### 项目目标

本项目是一个以“欢乐斗地主 + 掼蛋”为核心的纯前端游戏 Demo，覆盖了以下能力：

- VSCode 工程配置与浏览器调试
- 扑克牌数据结构与发牌渲染
- 斗地主规则引擎（牌型判断、比较、提示）
- 支持叫地主、出牌循环、胜负判定的游戏流程
- 简单 AI 与高级 AI（记牌器、评估、配合、残局搜索）
- 游戏大厅、数据存储、设置与历史记录
- 掼蛋规则与 AI 设计基础
- 测试页与调试入口
- 最终交付文档与部署脚本

### 已交付阶段概览

- 阶段1：项目结构 + VSCode 配置 + 扑克牌类 + 发牌渲染
- 阶段2：斗地主规则引擎（牌型判断、比较、提示）
- 阶段3：斗地主游戏流程（叫地主 + 出牌循环 + 胜负判定）
- 阶段4：简单 AI（合法出牌）
- 阶段5：复杂 AI（记牌器 + 评估 + 策略 + 配合 + 残局搜索）
- 阶段6：UI 美化 + 动画系统 + 音效
- 阶段7：大厅 + 数据统计 + 成就系统
- 阶段8：掼蛋模式（规则 + AI + 界面）
- 阶段9：测试页面 + 调试模式 + 性能优化
- 阶段10：文档整理 + README + 最终整合 + Pages 部署配置

### 当前已实现内容

- ✅ 项目根目录与 VS Code 工作区配置
- ✅ Chrome / Edge 双浏览器调试配置
- ✅ Live Server / Prettier / ESLint / 扩展推荐配置
- ✅ 核心数据结构：Card、Deck、Hand、EventBus
- ✅ 斗地主规则引擎：牌型判断、比较、提示
- ✅ 游戏流程：发牌、叫分、出牌、胜负判定
- ✅ AI 组件：DoudizhuAI、GuandanAI、CardCounter、HandEvaluator
- ✅ UI 组件：Renderer、CardRenderer、Animation、UIManager
- ✅ 本地存储和统计管理
- ✅ 测试页面：规则测试、AI 测试、统计测试
- ✅ 调试模式 `?debug=1`
- ✅ 文档集合与最终整合说明
- ✅ GitHub Pages 部署工作流模板

### 仍需完善的部分

- ⏳ 真实“对标欢乐斗地主”的全量牌型细节仍需继续调优
- ⏳ 掼蛋下游配合与升级逻辑还属于架构化基础版本
- ⏳ UI 动画与音效可继续做更细腻的多端视觉优化
- ⏳ 需要把真实赛事数据和更细粒度的 AI 测试继续补齐

> 这份工程已经具备“可运行静态演示”的基础，而非商业化完整产品代码；它适用于教育、原型、演示和二次开发。

## 运行方式

### 方式一：VSCode Live Server（推荐）

1. 用 VSCode 打开整个项目目录
2. 安装推荐扩展（若提示）
3. 在 [src/index.html](src/index.html) 上右键 → Open with Live Server
4. 浏览器会自动打开：`http://127.0.0.1:5500/src/index.html`

### 方式二：命令行

```bash
cd happy-card-games
npm install
npm run dev
```

随后打开：`http://localhost:5500/src/index.html`

### 方式三：直接打开

也可以直接双击 [src/index.html](src/index.html) 打开，但建议优先使用 Live Server，以避免本地文件访问限制。

## 调试与测试

### 启动调试

- 在 VSCode 中按 `F5`
- 使用 `Chrome` 或 `Edge` 配置启动
- 默认打开：`http://localhost:5500/src/index.html`
- 支持断点调试、sourceMap、浏览器控制台日志

### 调试模式

在 URL 后附加：

```text
?debug=1
```

可开启调试模式，输出 AI 分析、牌型判断、记牌器数据和时间戳日志。

### 测试页

- [tests/test-rules.html](tests/test-rules.html)：规则测试页
- [tests/test-ai.html](tests/test-ai.html)：AI 测试页
- [tests/test-stats.html](tests/test-stats.html)：统计页

### 运行测试

在 VSCode 里打开任意测试页，使用 Live Server 预览即可；或者直接在浏览器中打开对应 HTML 文件测试。

## 目录结构

```text
happy-card-games/
├── .vscode/
│   ├── settings.json
│   ├── launch.json
│   ├── extensions.json
│   └── tasks.json
├── .github/
│   └── workflows/
│       └── pages.yml
├── docs/
│   ├── 斗地主规则.md
│   ├── 掼蛋规则.md
│   ├── AI设计文档.md
│   └── 开发日志.md
├── src/
│   ├── index.html
│   ├── doudizhu.html
│   ├── guandan.html
│   ├── challenge.html
│   ├── replay.html
│   ├── manifest.json
│   ├── sw.js
│   ├── css/
│   ├── js/
│   └── assets/
├── tests/
│   ├── test-rules.html
│   ├── test-ai.html
│   └── test-stats.html
├── README.md
├── CHANGELOG.md
├── .prettierrc
├── .gitignore
├── package.json
└── LICENSE (如需补充)
```

## 技术栈

- 原生 JavaScript（ES6+）
- HTML5 + CSS3
- Web Audio API
- localStorage
- VSCode Live Server
- Github Pages 部署兼容

## 关键说明

1. 这是一个纯前端、无依赖的卡牌游戏 Demo。
2. 整体适合在浏览器中直接体验，也适合继续扩展成完整产品。
3. 所有游戏状态均可通过 JavaScript 控制，便于调试和测试。
4. 项目采用模块化结构，便于新增规则、AI 和 UI。

## 交付状态

- 文档：已完成
- 代码整合：已完成
- 工程配置：已完成
- 最终说明：已完成

如果需要下一步增强，可以继续扩展为：

- 更完整的斗地主对战网络版
- 真实多人房间与云存档
- 更强 AI 与训练脚本
- 更丰富的动画和音频资源
- 更完善的掼蛋功能闭环

