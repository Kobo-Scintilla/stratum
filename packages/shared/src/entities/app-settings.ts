import { Entity, Fields } from "remult";

@Entity("appSettings", {
  allowApiCrud: true,
})
export class AppSettings {
  @Fields.string()
  id!: string; // always '_defaults'

  @Fields.string()
  defaultModelProvider = "opencode-go";

  @Fields.string()
  defaultModelId = "deepseek-v4-flash";

  @Fields.string()
  defaultThinkingLevel = "medium";

  @Fields.string()
  titleSummaryModelProvider = "";

  @Fields.string()
  titleSummaryModelId = "";
}
