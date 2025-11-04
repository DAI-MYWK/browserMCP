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

export async function POST() {
  try {
    // 既に接続されている場合は再利用
    if (client && transport) {
      const tools = await client.listTools();
      return NextResponse.json({
        success: true,
        tools: tools.tools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      });
    }

    // 環境変数をフィルタリング
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // 新しい接続を作成
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

    const tools = await client.listTools();

    return NextResponse.json({
      success: true,
      tools: tools.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
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

