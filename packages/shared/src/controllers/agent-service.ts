import { BackendMethod, remult } from "remult";

export class AgentService {
  @BackendMethod({ allowed: true, transactional: false })
  static async ask(
    prompt: string,
    sessionId: string = "default",
  ): Promise<string> {
    throw new Error("Not implemented client-side");
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
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async deleteSession(sessionId: string): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async renameSession(sessionId: string, title: string): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async togglePinSession(sessionId: string): Promise<boolean> {
    throw new Error("Not implemented client-side");
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
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getProvidersInfo(): Promise<
    Array<{
      id: string;
      envKeys: string[];
      models: string[];
      isCustom: boolean;
    }>
  > {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getConfiguredProviders(): Promise<
    Array<{ id: string; enabled: boolean; hasKey: boolean }>
  > {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async saveProviderKey(id: string, apiKey: string): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async saveCustomProvider(
    id: string,
    apiKey: string,
    baseUrl: string,
    apiType: string,
  ): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async deleteProviderKey(id: string): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async addProvider(id: string): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async toggleProvider(id: string, enabled: boolean): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async clearHistory(): Promise<void> {
    throw new Error("Not implemented client-side");
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getProviderApiKeys(): Promise<
    Array<{ id: string; apiKey: string }>
  > {
    throw new Error("Not implemented client-side");
  }
}
