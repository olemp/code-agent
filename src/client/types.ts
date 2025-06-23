export interface ICodexResult {
  text: string;
  tokenUsage?: {
    total?: number;
    prompt?: number;
    completion?: number;
  };
}
