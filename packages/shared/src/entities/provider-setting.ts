import { Entity, Fields } from "remult";

@Entity("providerSettings", {
  allowApiCrud: true,
})
export class ProviderSetting {
  @Fields.string()
  id!: string; // e.g., 'openai-responses' or custom provider id

  @Fields.string()
  apiKey = ""; // encrypted value

  @Fields.boolean()
  enabled = true;

  @Fields.string({ allowNull: true })
  baseUrl?: string = undefined; // for custom providers

  @Fields.string({ allowNull: true })
  apiType?: string = undefined; // 'openai-completions' | 'openai-responses' | 'anthropic-messages'

  @Fields.string({ allowNull: true })
  models?: string = undefined; // comma-separated model IDs for custom providers
}
