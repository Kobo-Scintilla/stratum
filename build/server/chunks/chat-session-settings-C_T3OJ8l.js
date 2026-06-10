import { _ as __decorate, E as Entity } from './chat-message-CwAUUCQ1.js';
import { q as Fields } from './IdEntity-Le34BexZ.js';

//#region src/lib/shared/entities/active-stream.ts
var ActiveStream = class ActiveStream {
	id;
	sessionId = "default";
	prompt = "";
	text = "";
	isGenerating = true;
	createdAt = /* @__PURE__ */ new Date();
	toolCalls = [];
	segments = [];
};
__decorate([Fields.id()], ActiveStream.prototype, "id", void 0);
__decorate([Fields.string()], ActiveStream.prototype, "sessionId", void 0);
__decorate([Fields.string()], ActiveStream.prototype, "prompt", void 0);
__decorate([Fields.string()], ActiveStream.prototype, "text", void 0);
__decorate([Fields.boolean()], ActiveStream.prototype, "isGenerating", void 0);
__decorate([Fields.date()], ActiveStream.prototype, "createdAt", void 0);
__decorate([Fields.json()], ActiveStream.prototype, "toolCalls", void 0);
__decorate([Fields.json()], ActiveStream.prototype, "segments", void 0);
ActiveStream = __decorate([Entity("activeStreams", { allowApiCrud: true })], ActiveStream);
//#endregion
//#region src/lib/shared/entities/provider-setting.ts
var ProviderSetting = class ProviderSetting {
	id;
	apiKey = "";
	enabled = true;
	baseUrl;
	apiType;
	models;
};
__decorate([Fields.string()], ProviderSetting.prototype, "id", void 0);
__decorate([Fields.string()], ProviderSetting.prototype, "apiKey", void 0);
__decorate([Fields.boolean()], ProviderSetting.prototype, "enabled", void 0);
__decorate([Fields.string({ allowNull: true })], ProviderSetting.prototype, "baseUrl", void 0);
__decorate([Fields.string({ allowNull: true })], ProviderSetting.prototype, "apiType", void 0);
__decorate([Fields.string({ allowNull: true })], ProviderSetting.prototype, "models", void 0);
ProviderSetting = __decorate([Entity("providerSettings", { allowApiCrud: true })], ProviderSetting);
//#endregion
//#region src/lib/shared/entities/chat-session-settings.ts
var ChatSessionSettings = class ChatSessionSettings {
	id;
	modelProvider = "opencode-go";
	modelId = "deepseek-v4-flash";
	contextWindow = 20;
};
__decorate([Fields.string()], ChatSessionSettings.prototype, "id", void 0);
__decorate([Fields.string()], ChatSessionSettings.prototype, "modelProvider", void 0);
__decorate([Fields.string()], ChatSessionSettings.prototype, "modelId", void 0);
__decorate([Fields.integer()], ChatSessionSettings.prototype, "contextWindow", void 0);
ChatSessionSettings = __decorate([Entity("chatSessionSettings", { allowApiCrud: true })], ChatSessionSettings);

export { ActiveStream as A, ChatSessionSettings as C, ProviderSetting as P };
//# sourceMappingURL=chat-session-settings-C_T3OJ8l.js.map
