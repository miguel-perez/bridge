export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  autoFrame: {
    enabled: boolean;
    batchSize: number;
    threshold: number;
  };
  autoWeave: {
    enabled: boolean;
    threshold: number;
  };
}

export interface ReviewConfig {
  requireReview: boolean;
}

export interface IntegrationConfig {
  openai: OpenAIConfig;
  review: ReviewConfig;
}

// Default configuration
const defaultConfig: IntegrationConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    autoFrame: {
      enabled: true,
      batchSize: 10,
      threshold: 5,
    },
    autoWeave: {
      enabled: true,
      threshold: 10,
    },
  },
  review: {
    requireReview: true,
  },
};

let currentConfig = { ...defaultConfig };

export function getConfig(): IntegrationConfig {
  return currentConfig;
}

export function updateConfig(updates: Partial<IntegrationConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

export function setOpenAIConfig(config: Partial<OpenAIConfig>): void {
  currentConfig.openai = { ...currentConfig.openai, ...config };
}

export function setReviewConfig(config: Partial<ReviewConfig>): void {
  currentConfig.review = { ...currentConfig.review, ...config };
} 