import { BackendMethod, remult } from "remult";
const CLIENT_ONLY_MESSAGE = "Not implemented client-side";

function clientOnly(methodName: string): never {
  throw new Error(
    `${methodName} is only implemented by the gateway backend (${CLIENT_ONLY_MESSAGE})`,
  );
}

export class AgentService {
  @BackendMethod({ allowed: true, transactional: false })
  static async ask(
    prompt: string,
    sessionId: string = "default",
  ): Promise<string> {
    return clientOnly("ask");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async listSessions(): Promise<
    Array<{
      sessionId: string;
      lastMessage: string;
      title?: string;
      pinned?: boolean;
      createdAt: Date | string;
      messageCount: number;
    }>
  > {
    return clientOnly("listSessions");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async deleteSession(sessionId: string): Promise<void> {
    return clientOnly("deleteSession");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async renameSession(sessionId: string, title: string): Promise<void> {
    return clientOnly("renameSession");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async togglePinSession(sessionId: string): Promise<boolean> {
    return clientOnly("togglePinSession");
  }

  @BackendMethod({ allowed: true })
  static async recoverMessages(sessionIds: string[]): Promise<
    Array<{
      id: string;
      sessionId: string;
      role: string;
      content: string;
      createdAt: Date;
    }>
  > {
    return clientOnly("recoverMessages");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getProvidersInfo(): Promise<
    Array<{
      id: string;
      envKeys: string[];
      models: Array<{ id: string; contextWindow: number }>;
      isCustom: boolean;
    }>
  > {
    return clientOnly("getProvidersInfo");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getConfiguredProviders(): Promise<
    Array<{ id: string; enabled: boolean; hasKey: boolean }>
  > {
    return clientOnly("getConfiguredProviders");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async saveProviderKey(id: string, apiKey: string): Promise<void> {
    return clientOnly("saveProviderKey");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async saveCustomProvider(
    id: string,
    apiKey: string,
    baseUrl: string,
    apiType: string,
  ): Promise<void> {
    return clientOnly("saveCustomProvider");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async deleteProviderKey(id: string): Promise<void> {
    return clientOnly("deleteProviderKey");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async addProvider(id: string): Promise<void> {
    return clientOnly("addProvider");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async toggleProvider(id: string, enabled: boolean): Promise<void> {
    return clientOnly("toggleProvider");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async clearHistory(): Promise<void> {
    return clientOnly("clearHistory");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getProviderApiKeys(): Promise<
    Array<{ id: string; apiKey: string }>
  > {
    return clientOnly("getProviderApiKeys");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async checkHeadroomFeatures(): Promise<{
    codeInstalled: boolean;
    mlInstalled: boolean;
  }> {
    return clientOnly("checkHeadroomFeatures");
  }
}
