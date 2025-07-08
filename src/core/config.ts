// No imports needed; config is built from environment variables only

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
}

export interface IntegrationConfig {
  openai: OpenAIConfig;
}

// Default configuration
const defaultConfig: IntegrationConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
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



export const config = {
  bridgeFilePath: process.env.BRIDGE_FILE_PATH,
}; 