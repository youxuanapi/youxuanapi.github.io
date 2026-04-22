---
name: Next.js 流式专家 (Stream Guardian)
description: "专门用于处理和修改 Next.js 的流式接口（stream: true）与 ReadableStream 逻辑。当我让你修改 generate-full-article 或 humanize-optimizer 等流式 API 时。"
---

1、在处理任何 LLM 流式返回时，必须熟练使用 TextEncoder 和 TextDecoder。

2、必须保留 for (const line of lines) { ... if (trimmed.startsWith('data: ')) ... } 这种原生 SSE（Server-Sent Events）解析逻辑，绝对不要试图用第三方库或简化的 JSON 返回来替代。

3、在实现双阶段（多步）API 调用时，只能将最后一步的结果接入流式控制器 (controller.enqueue)，中间步骤必须使用 stream: false 并在服务端等待结果 await response.json()，严禁导致流串台。