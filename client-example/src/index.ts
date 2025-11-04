#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import * as process from "process";
import { fileURLToPath } from "url";

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCPサーバーのパス
// クライアントアプリのディレクトリから見た相対パス
const SERVER_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "dist",
  "index.js"
);

async function main() {
  // STDIOトランスポートを作成（コマンド文字列と引数で指定）
  // 環境変数をフィルタリング（undefinedを除外）
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env,
  });

  // クライアントを作成
  const client = new Client(
    {
      name: "browsermcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    // サーバーに接続
    await client.connect(transport);

    console.log("✅ MCPサーバーに接続しました\n");

    // 利用可能なツールを取得
    const tools = await client.listTools();
    console.log("📋 利用可能なツール:");
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // コマンドライン引数からツール名と引数を取得
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.log("使用方法:");
      console.log("  browsermcp-client <tool-name> [arguments...]");
      console.log("\n例:");
      console.log('  browsermcp-client browser_navigate url="https://www.google.com"');
      console.log('  browsermcp-client browser_screenshot fullPage=true');
      process.exit(0);
    }

    const toolName = args[0];
    const toolArgs: Record<string, any> = {};

    // 引数をパース
    // 形式1: key=value (文字列)
    // 形式2: key='{"nested": "value"}' (JSON)
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.includes("=")) {
        const eqIndex = arg.indexOf("=");
        const key = arg.substring(0, eqIndex);
        let value = arg.substring(eqIndex + 1);
        
        // クォートで囲まれている場合は除去
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // 値がJSONとして解析できるか試す
        try {
          toolArgs[key] = JSON.parse(value);
        } catch {
          // JSONでない場合は文字列として扱う
          toolArgs[key] = value;
        }
      }
    }
    
    console.log(`📝 引数:`, JSON.stringify(toolArgs, null, 2));
    console.log();

    console.log(`🔧 ツール "${toolName}" を実行中...\n`);

    // ツールを呼び出し
    const result = await client.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    console.log("📤 結果:");
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach((content: any) => {
        if (content.type === "text") {
          console.log(content.text);
        }
      });
    }

    if (result.isError) {
      console.error("\n❌ エラーが発生しました");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  } finally {
    // クライアントを閉じる（サーバープロセスも自動的に終了）
    await client.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

