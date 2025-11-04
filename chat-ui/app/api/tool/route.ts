import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import * as process from "process";

// プロジェクトルートからの相対パス
const SERVER_PATH = path.resolve(
  process.cwd(),
  "..",
  "dist",
  "index.js"
);

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

async function getClient() {
  if (client && transport) {
    return client;
  }

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env,
  });

  client = new Client(
    {
      name: "browsermcp-chat-ui",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  return client;
}

export async function POST(request: Request) {
  try {
    const { toolName, arguments: args } = await request.json();

    if (!toolName) {
      return NextResponse.json(
        { error: "toolName is required" },
        { status: 400 }
      );
    }

    const mcpClient = await getClient();
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: args || {},
    });

    let resultText = "";
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach((content: any) => {
        if (content.type === "text") {
          resultText += content.text + "\n";
        }
      });
    }

    return NextResponse.json({
      success: !result.isError,
      result: resultText.trim() || "実行が完了しました",
      isError: result.isError,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

