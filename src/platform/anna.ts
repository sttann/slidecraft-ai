// Anna host SDK contracts. No credentials are stored in this module.
export interface LlmReply {
  role: string;
  content: { type: string; text: string };
  stopReason: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  _meta?: { quotaConsumed?: number };
}
export interface AnnaHost {
  llm: {
    catalog(args?: Record<string, never>): Promise<{ quota: { remainingCU: number } }>;
    complete(args: {
      messages: { role: 'user' | 'system'; content: { type: 'text'; text: string } }[];
      maxTokens: number; thinking: boolean; temperature: number;
    }, opts?: { timeoutMs: number }): Promise<LlmReply>;
  };
  files: {
    upload_init(args: { path: string; content_type: string; size: number; ttl_seconds: number }): Promise<{ put_url: string; headers: Record<string, string> }>;
    upload_finalize(args: { path: string; size: number }): Promise<unknown>;
    download(args: { path: string; filename: string }): Promise<{ ok: boolean }>;
  };
}

let connection: Promise<AnnaHost | null> | undefined;
export function connectAnna(): Promise<AnnaHost | null> {
  if (connection) return connection;
  connection = (async () => {
    if (window.parent === window) return null;
    const sdkPath = '/static/anna-apps/_sdk/latest/index.js';
    const sdk = await import(/* @vite-ignore */ sdkPath) as { AnnaAppRuntime: { connect(): Promise<AnnaHost> } };
    return sdk.AnnaAppRuntime.connect();
  })();
  return connection;
}

export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|余额|额度/i.test(message)) return `额度检查未通过。${message}`;
  if (/timeout|timed out/i.test(message)) return 'Anna 请求超时，可能仍在计费。请先查看额度记录，再决定是否重试。';
  if (/not.granted|403|permission|forbidden/i.test(message)) return 'Anna 尚未授予应用访问权限，请检查应用安装和开发者状态。';
  if (/fetch|network|csp/i.test(message)) return '网络或宿主文件权限限制导致操作失败，请检查连接后重试。';
  if (/JSON|expected|invalid|截断/i.test(message)) return 'AI 返回格式不符合要求，已保留当前内容，没有自动重试。';
  return message;
}
