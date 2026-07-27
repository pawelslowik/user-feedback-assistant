import promptfoo from 'promptfoo';
import type { ApiProvider, ProviderOptions, ProviderResponse } from 'promptfoo';
import { classifyFeedback } from '../src/lib/agent/agent.js'

export default class ClassifyFeedbackProvider implements ApiProvider {
  protected providerId: string;
  public config: any;

  constructor(options: ProviderOptions) {
    this.providerId = options.id || 'classify-feedback-provider';
    this.config = options.config;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string): Promise<ProviderResponse> {
    const classification = await classifyFeedback(prompt);

    const ret: ProviderResponse = {
      output: classification
    };
    return ret;
  }
}