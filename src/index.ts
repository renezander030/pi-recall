/**
 * pi-recall
 *
 * Standalone Pi extension for recall surfaces. The first backend is pi-codegraph:
 * a trusted wrapper around codebase-memory-mcp with its own repo trust gate.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLED_CODEGRAPH = join(__dirname, "..", "vendor", "pi-codegraph", "pi-codegraph");

type RecallMode = "search" | "arch" | "impact" | "schema";

function outputText(res: { stdout?: string; stderr?: string }): string {
  return (res.stdout || res.stderr || "").trim();
}

function codegraphBin(): string {
  if (process.env.PI_RECALL_CODEGRAPH_BIN) return process.env.PI_RECALL_CODEGRAPH_BIN;
  if (process.env.PI_CODEGRAPH_BIN) return process.env.PI_CODEGRAPH_BIN;
  if (existsSync(BUNDLED_CODEGRAPH)) return BUNDLED_CODEGRAPH;
  return "pi-codegraph";
}

function commandArgs(mode: RecallMode, query?: string): string[] {
  switch (mode) {
    case "search":
      if (!query?.trim()) throw new Error("recall search needs a query");
      return ["search", query.trim()];
    case "arch":
      return ["arch"];
    case "impact":
      return ["impact"];
    case "schema":
      return ["schema"];
    default:
      throw new Error(`unknown recall mode: ${mode}`);
  }
}

export default function (pi: ExtensionAPI) {
  async function runCodegraph(
    args: string[],
    cwd: string,
    signal?: AbortSignal,
    timeout = 120000,
  ) {
    const cli = codegraphBin();
    const res = await pi.exec(cli, [...args, "--repo", cwd], { cwd, signal, timeout });
    if (res.code !== 0) {
      throw new Error(outputText(res) || `${cli} exited ${res.code}`);
    }
    return outputText(res) || "(no output)";
  }

  pi.registerCommand("recall-status", {
    description: "Show pi-recall backend status",
    handler: async (_args, ctx) => {
      const cli = codegraphBin();
      try {
        const doctor = await pi.exec(cli, ["doctor", "--human"], { cwd: ctx.cwd, timeout: 30000 });
        const repos = await pi.exec(cli, ["repos", "--human"], { cwd: ctx.cwd, timeout: 30000 });
        ctx.ui.notify(
          `pi-recall status\nbackend: ${cli}\n\n${outputText(doctor)}\n\nTrusted repos\n${outputText(repos) || "(none)"}`,
          doctor.code === 0 ? "info" : "warn",
        );
      } catch (e) {
        ctx.ui.notify(`pi-recall status failed: ${(e as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("recall-trust", {
    description: "Trust the current repo for recall",
    handler: async (args, ctx) => {
      const label = args.trim();
      const trustArgs = ["trust", "--repo", ctx.cwd];
      if (label) trustArgs.push("--label", label);
      try {
        const res = await pi.exec(codegraphBin(), trustArgs, { cwd: ctx.cwd, timeout: 30000 });
        ctx.ui.notify(outputText(res), res.code === 0 ? "info" : "error");
      } catch (e) {
        ctx.ui.notify(`pi-recall trust failed: ${(e as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("recall", {
    description: "Search the trusted recall backend for this project",
    handler: async (args, ctx) => {
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("usage: /recall <query>", "warning");
        return;
      }
      try {
        ctx.ui.notify(await runCodegraph(commandArgs("search", query), ctx.cwd), "info");
      } catch (e) {
        ctx.ui.notify(`pi-recall search failed: ${(e as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("recall-arch", {
    description: "Recall architecture overview",
    handler: async (_args, ctx) => {
      try {
        ctx.ui.notify(await runCodegraph(commandArgs("arch"), ctx.cwd), "info");
      } catch (e) {
        ctx.ui.notify(`pi-recall arch failed: ${(e as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("recall-impact", {
    description: "Recall codegraph blast radius for the current diff",
    handler: async (_args, ctx) => {
      try {
        ctx.ui.notify(await runCodegraph(commandArgs("impact"), ctx.cwd), "info");
      } catch (e) {
        ctx.ui.notify(`pi-recall impact failed: ${(e as Error).message}`, "error");
      }
    },
  });

  pi.registerTool({
    name: "recall_codegraph",
    label: "Recall Codegraph",
    description:
      "Recall derived code knowledge from the current trusted repo through pi-codegraph. " +
      "The repo must already be trusted with /recall-trust or pi-codegraph trust.",
    promptSnippet: "Trusted derived codegraph recall for architecture, blast radius, schema, and semantic search",
    promptGuidelines: [
      "Use recall_codegraph when prior code structure, architecture, semantic matches, or diff blast radius would reduce blind repo searching.",
      "If the tool reports the repo is not trusted, ask the user to run /recall-trust instead of bypassing the gate.",
    ],
    parameters: Type.Object({
      mode: Type.Union([
        Type.Literal("search"),
        Type.Literal("arch"),
        Type.Literal("impact"),
        Type.Literal("schema"),
      ]),
      query: Type.Optional(Type.String({ description: "Required when mode is search" })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const mode = params.mode as RecallMode;
      const text = await runCodegraph(commandArgs(mode, params.query), ctx.cwd, signal);
      return {
        content: [{ type: "text", text }],
        details: { backend: "pi-codegraph", mode, query: params.query ?? null, cwd: ctx.cwd },
      };
    },
  });

  pi.registerCommand("recall-help", {
    description: "Show pi-recall commands",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        [
          "pi-recall commands:",
          "/recall-status",
          "/recall-trust [label]",
          "/recall <query>",
          "/recall-arch",
          "/recall-impact",
        ].join("\n"),
        "info",
      );
    },
  });
}
