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
import { Type } from "@earendil-works/pi-ai";
import type { ToolDefinition } from "../types.js";

export function getPiCodingTools(cwd: string): ToolDefinition[] {
  // 1. Load Hashline tools by mocking the ExtensionAPI.
  const hashlineTools: any[] = [];
  const mockPi = {
    on() {
      return mockPi;
    },
    off() {
      return mockPi;
    },
    registerTool(tool: any) {
      hashlineTools.push(tool);
      return mockPi;
    },
    events: {
      emit() {},
      on() {
        return mockPi.events;
      },
      off() {
        return mockPi.events;
      },
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

  const grepTool =
    hashlineTools.find((t) => t.name === "grep") ||
    standardTools.find((t) => t.name === "grep");
  const findTool =
    hashlineTools.find((t) => t.name === "find") ||
    standardTools.find((t) => t.name === "find");

  if (!grepTool || !findTool) {
    throw new Error("Failed to find fallback grep or find tool definitions");
  }

  const searchTool = {
    name: "search",
    description:
      "Search for files by name/pattern, or search for text content inside files. Provide query to search inside files, filePattern to find files by name, or both.",
    parameters: Type.Object({
      query: Type.Optional(
        Type.String({
          description:
            "Text query to search for inside files (content search).",
        }),
      ),
      filePattern: Type.Optional(
        Type.String({
          description: "Glob or file name pattern to filter files by name.",
        }),
      ),
      path: Type.Optional(
        Type.String({
          description:
            "Directory path to search. Defaults to current directory.",
        }),
      ),
      ignoreCase: Type.Optional(
        Type.Boolean({
          description: "Case-insensitive content search. Defaults to false.",
        }),
      ),
      literal: Type.Optional(
        Type.Boolean({
          description:
            "Treat query as a literal string instead of regex. Defaults to true.",
        }),
      ),
      limit: Type.Optional(
        Type.Number({
          description: "Max results to return.",
        }),
      ),
    }),
    async execute(
      uuid: string,
      args: any,
      signal: any,
      progress: any,
      context: any,
    ) {
      if (args.query) {
        const grepArgs = {
          pattern: args.query,
          path: args.path,
          glob: args.filePattern,
          ignoreCase: args.ignoreCase,
          literal: args.literal ?? true,
          limit: args.limit,
        };
        return await grepTool.execute(
          uuid,
          grepArgs,
          signal,
          progress,
          context,
        );
      } else if (args.filePattern) {
        const findArgs = {
          pattern: args.filePattern,
          path: args.path,
          limit: args.limit,
        };
        return await findTool.execute(
          uuid,
          findArgs,
          signal,
          progress,
          context,
        );
      } else {
        throw new Error("Either 'query' or 'filePattern' must be provided.");
      }
    },
  };

  const finalTools: any[] = [...hashlineTools];
  for (const stdTool of standardTools) {
    if (!hashlineToolNames.has(stdTool.name)) {
      finalTools.push(stdTool);
    }
  }

  // Filter out ls, grep, find and register unified search tool
  const filteredTools = finalTools.filter(
    (t) => t.name !== "ls" && t.name !== "grep" && t.name !== "find",
  );
  filteredTools.push(searchTool);

  return filteredTools.map((sdkTool: any) => {
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
