import { Entity, Fields } from "remult";

@Entity("chatSessionSettings", {
  allowApiCrud: true,
})
export class ChatSessionSettings {
  @Fields.string()
  id!: string; // sessionId

  @Fields.string()
  modelProvider = "opencode-go";

  @Fields.string()
  modelId = "deepseek-v4-flash";

  /** User override for model context window in tokens. 0 = use model default. */
  @Fields.integer()
  contextWindow = 0;

  @Fields.string()
  thinkingLevel = "medium";

  @Fields.boolean()
  headroomEnabled = true;

  @Fields.boolean()
  headroomCodeAst = true;

  @Fields.string()
  headroomKompressModel = "off";

  @Fields.boolean()
  headroomCcr = true;

  @Fields.string()
  title = "";

  @Fields.boolean()
  pinned = false;
}
