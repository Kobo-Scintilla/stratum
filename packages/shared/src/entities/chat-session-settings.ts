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

  @Fields.integer()
  contextWindow = 20;

  @Fields.string()
  thinkingLevel = "medium";

  @Fields.boolean()
  headroomEnabled = false;

  @Fields.string()
  title = "";

  @Fields.boolean()
  pinned = false;
}
