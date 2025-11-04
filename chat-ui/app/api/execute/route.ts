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

// 簡単な自然言語パーサー
function parseInstruction(instruction: string): { toolName: string; args: Record<string, any> } | null {
  const lower = instruction.toLowerCase();

  // URLに移動
  const urlMatch = instruction.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch || lower.includes("アクセス") || lower.includes("開く") || lower.includes("移動")) {
    return {
      toolName: "browser_navigate",
      args: { url: urlMatch ? urlMatch[1] : extractUrl(instruction) },
    };
  }

  // スクリーンショット
  if (lower.includes("スクリーンショット") || lower.includes("キャプチャ")) {
    return {
      toolName: "browser_screenshot",
      args: { fullPage: lower.includes("全") || lower.includes("full") },
    };
  }

  // クリック
  if (lower.includes("クリック")) {
    const selectorMatch = instruction.match(/["']([^"']+)["']/);
    return {
      toolName: "browser_click",
      args: { selector: selectorMatch ? selectorMatch[1] : extractSelector(instruction) },
    };
  }

  // 入力
  if (lower.includes("入力") || lower.includes("入力して")) {
    const parts = instruction.split(/\s+/);
    const textMatch = instruction.match(/["']([^"']+)["']/);
    return {
      toolName: "browser_fill",
      args: {
        selector: extractSelector(instruction),
        text: textMatch ? textMatch[1] : parts[parts.length - 1],
      },
    };
  }

  return null;
}

function extractUrl(text: string): string {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
  return urlMatch ? urlMatch[1] : "";
}

function extractSelector(text: string): string {
  // 簡単なセレクタ抽出（実際にはもっと複雑な処理が必要）
  const selectorMatch = text.match(/selector[=:]\s*["']([^"']+)["']/i);
  if (selectorMatch) return selectorMatch[1];
  
  // ボタンやリンクのテキストから推測
  const buttonMatch = text.match(/["']([^"']+)["']/);
  return buttonMatch ? buttonMatch[1] : "button";
}

export async function POST(request: Request) {
  try {
    const { instruction } = await request.json();

    if (!instruction) {
      return NextResponse.json(
        { error: "instruction is required" },
        { status: 400 }
      );
    }

    const parsed = parseInstruction(instruction);
    if (!parsed) {
      return NextResponse.json({
        result: "すみません、その指示を理解できませんでした。\n具体的なツール名と引数を指定してください。\n例: 「https://www.google.com にアクセス」",
      });
    }

    const mcpClient = await getClient();
    const result = await mcpClient.callTool({
      name: parsed.toolName,
      arguments: parsed.args,
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

