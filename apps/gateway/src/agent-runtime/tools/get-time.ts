import { Type } from "@earendil-works/pi-ai";
import type { ToolDefinition } from "../types.js";

export const getTimeTool: ToolDefinition = {
  name: "get_time",
  description: "Get the current date and time in a specific timezone",
  parameters: Type.Object({
    timezone: Type.Optional(
      Type.String({
        description:
          "IANA timezone string (e.g. America/New_York, Europe/London, Asia/Tokyo). Defaults to UTC.",
      }),
    ),
  }),
  async execute(args: Record<string, unknown>) {
    const tz = typeof args.timezone === "string" ? args.timezone : "UTC";
    try {
      const now = new Date();
      const formatted = now.toLocaleString("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      });
      return { result: formatted, isError: false };
    } catch {
      return { result: `Invalid timezone: ${tz}`, isError: true };
    }
  },
};
