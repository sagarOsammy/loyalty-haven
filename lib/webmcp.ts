type ResortConfiguration = {
  alliance?: "star-alliance" | null;
  accor?: boolean;
  motion?: boolean;
  quality?: "cinematic" | "balanced";
};

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

export function validateConfiguration(input: unknown): ResortConfiguration {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected a configuration object");
  const values = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(values)) {
    if (key === "alliance" && (value === null || value === "star-alliance"))
      continue;
    if ((key === "accor" || key === "motion") && typeof value === "boolean")
      continue;
    if (key === "quality" && (value === "cinematic" || value === "balanced"))
      continue;
    throw new Error(`Unsupported resort setting: ${key}`);
  }
  return values as ResortConfiguration;
}

export function registerResortTools(actions: {
  read: () => unknown;
  configure: (input: ResortConfiguration) => void;
}) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  document.documentElement.dataset.webmcp = context?.registerTool
    ? "registering"
    : "unavailable";
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    {
      name: "read_loyalty_resort",
      description:
        "Read the saved balance total, selected resort options, preview asset state and animation progress. Balances are a saved snapshot.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error("Expected an empty object");
        return actions.read();
      },
    },
    {
      name: "configure_loyalty_resort",
      description:
        "Update visible resort controls. Select Star Alliance arrivals, toggle the Accor terrace, pause motion or change detail. Animations may continue after this returns. No saved balances are changed.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          alliance: { enum: ["star-alliance", null] },
          accor: { type: "boolean" },
          motion: { type: "boolean" },
          quality: { enum: ["cinematic", "balanced"] },
        },
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        actions.configure(validateConfiguration(input));
        return actions.read();
      },
    },
  ];
  void Promise.all(
    tools.map(async (tool) =>
      context.registerTool(tool, { signal: lifecycle.signal }),
    ),
  )
    .then(() => {
      if (!lifecycle.signal.aborted)
        document.documentElement.dataset.webmcp = "registered";
    })
    .catch(() => {
      lifecycle.abort();
      document.documentElement.dataset.webmcp = "unavailable";
      console.warn(
        "Resort tools unavailable in this browser. The visible controls remain available.",
      );
    });
  return () => lifecycle.abort();
}
