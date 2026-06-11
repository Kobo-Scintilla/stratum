import {
  createReadToolDefinition,
  createWriteToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createBashToolDefinition,
  createLsToolDefinition,
} from "@earendil-works/pi-coding-agent";
import piHashlineReadmapExtension from "pi-hashline-readmap";
import type { ToolDefinition } from "../types.js";

export function getPiCodingTools(cwd: string): ToolDefinition[] {
  // 1. Load Hashline tools by mocking the ExtensionAPI
  const hashlineTools: any[] = [];
  const mockPi = {
    on(event: string, handler: any) {
      // Stub
    },
    registerTool(tool: any) {
      hashlineTools.push(tool);
    },
    events: {
      emit() {},
    },
    exec() {
      return Promise.resolve({ exitCode: 0, stdout: "", stderr: "" });
    },
  };

  try {
    piHashlineReadmapExtension(mockPi as any);
  } catch (err) {
    console.error("Failed to load pi-hashline-readmap:", err);
  }

  // 2. Identify loaded tool names
  const hashlineToolNames = new Set(hashlineTools.map((t) => t.name));

  // 3. Fallback standard tools for anything not covered by hashline
  const standardTools = [
    createReadToolDefinition(cwd),
    createWriteToolDefinition(cwd),
    createEditToolDefinition(cwd),
    createFindToolDefinition(cwd),
    createGrepToolDefinition(cwd),
    createBashToolDefinition(cwd),
    createLsToolDefinition(cwd),
  ];

  const finalTools: any[] = [...hashlineTools];
  for (const stdTool of standardTools) {
    if (!hashlineToolNames.has(stdTool.name)) {
      finalTools.push(stdTool);
    }
  }

  return finalTools.map((sdkTool: any) => {
    return {
      name: sdkTool.name,
      description: sdkTool.description,
      parameters: sdkTool.parameters as any,
      async execute(args: Record<string, unknown>) {
        try {
          const signal = new AbortController().signal;
          const result = await sdkTool.execute(
            crypto.randomUUID(),
            args,
            signal,
            undefined,
            {
              cwd,
              hasUI: false,
              mode: "print",
              isProjectTrusted: () => true,
              isIdle: () => true,
              signal: undefined,
            } as any,
          );

          // Extract the text results from the SDK's ContentBlock array structure
          const textResult = result.content
            .map((c: any) => (c.type === "text" ? c.text : ""))
            .join("\n");

          return { result: textResult, isError: false };
        } catch (err) {
          return { result: String(err), isError: true };
        }
      },
    };
  });
}
