# SlideCraft AI

使用 Anna AI 生成演示大纲和正文，编辑内容、切换主题，并导出可编辑的 PowerPoint。

- 支持中文和英文、5–15 页、七种页面布局和三种主题。
- 支持大纲调整、逐页正文与备注编辑、预览和 PPTX 下载。
- 默认提供 Mock 示例；真实生成通过 Anna 宿主 SDK 调用，记录消费并防止重复请求。

## 本地运行

需要 Node.js 24+。Anna 验证命令另需安装 `@anna-ai/cli@0.1.64`。

```sh
npm ci
npm run dev
```

本地独立浏览器可体验 Mock 流程；真实 AI 与宿主文件保存需在 Anna staging 已安装的应用中使用。

## 检查

```sh
npm test
npm run build
npm run check
```

浏览器测试：先执行 `npx playwright install chromium`，再运行 `npm run test:e2e`。Windows 会优先使用已安装的 Chrome，也可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`。

## 技术栈

React、TypeScript、Vite、Zod、Zustand、PptxGenJS。AI 负责语义内容，程序负责确定性布局；预览与 PPTX 共用场景模型。

## Anna App

- App name：**SlideCraft AI**
- slug：**slidecraft-ai**
- 开发者标识：**@powerpointapp**
- 平台：[Anna staging](https://staging.anna.partners)
- 1.0.0 已提交审核，正式可用状态以平台为准。

请勿提交 API key、PAT 或本地登录信息。
