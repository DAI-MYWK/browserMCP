import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import * as process from "process";

const SERVER_PATH = path.resolve(
  process.cwd(),
  "..",
  "dist",
  "index.js"
);

let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;

async function getMCPClient() {
  if (mcpClient && mcpTransport) {
    return mcpClient;
  }

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  mcpTransport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env,
  });

  mcpClient = new Client(
    {
      name: "browsermcp-chat-ui",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  await mcpClient.connect(mcpTransport);
  return mcpClient;
}

// MCPツールをOpenAI Function定義に変換
function convertToolsToFunctions(tools: any[]): any[] {
  return tools.map((tool) => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // inputSchemaのpropertiesをOpenAIのfunction定義に変換
    if (tool.inputSchema?.properties) {
      for (const [key, value] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
        properties[key] = {
          type: value.type || "string",
          description: value.description || "",
        };
        if (value.enum) {
          properties[key].enum = value.enum;
        }
      }
    }

    if (tool.inputSchema?.required) {
      required.push(...tool.inputSchema.required);
    }

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      },
    };
  });
}

// ツールを実行
async function executeTool(toolName: string, args: Record<string, any>): Promise<string> {
  try {
    const client = await getMCPClient();
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    let resultText = "";
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach((content: any) => {
        if (content.type === "text") {
          resultText += content.text + "\n";
        }
      });
    }

    return resultText.trim() || "実行が完了しました";
  } catch (error: any) {
    return `エラー: ${error.message}`;
  }
}

export async function POST(request: Request) {
  try {
    const { instruction, conversationHistory } = await request.json();

    if (!instruction) {
      return NextResponse.json(
        { error: "instruction is required" },
        { status: 400 }
      );
    }

    // OpenAI APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("環境変数の確認:");
      console.error("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "設定済み" : "未設定");
      console.error("OPENAI_MODEL:", process.env.OPENAI_MODEL || "未設定");
      console.error("process.env keys:", Object.keys(process.env).filter(k => k.includes("OPENAI")));
      
      return NextResponse.json(
        { 
          error: "OPENAI_API_KEY環境変数が設定されていません",
          hint: "chat-ui/.env.localファイルにOPENAI_API_KEY=sk-...を設定してください。Next.jsサーバーを再起動してください。"
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // MCPツールを取得
    const client = await getMCPClient();
    const toolsResponse = await client.listTools();
    const functions = convertToolsToFunctions(toolsResponse.tools);

    // 会話履歴を構築
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `あなたはブラウザ自動化のアシスタントです。ユーザーの指示に従って、利用可能なツールを使ってブラウザ操作を実行してください。

利用可能なツール:
${toolsResponse.tools.map((t: any) => `- ${t.name}: ${t.description}`).join("\n")}

特にフォーム入力時は、フィールドのラベルが与えられている場合に \`browser_fill_by_label\` を優先して使用し、確実に入力してください。
指示に従って、適切なツールを順次実行してください。各ツールの実行結果を確認しながら、次のステップを決定してください。
タスクが完了したら、最終的な結果をまとめて報告してください。`,
      },
      ...(conversationHistory || []),
      {
        role: "user",
        content: instruction,
      },
    ];

    const maxIterations = 10; // 最大反復回数
    const steps: Array<{ tool: string; args: any; result: string }> = [];

    for (let i = 0; i < maxIterations; i++) {
      // LLMに問い合わせ
      // GPT-5が利用可能な場合は優先、なければ最新のモデルを使用
      const model = process.env.OPENAI_MODEL || "gpt-5";
      const completionOptions: any = {
        model,
        messages,
        tools: functions,
        tool_choice: "auto",
      };
      
      const completion = await openai.chat.completions.create(completionOptions);

      const message = completion.choices[0].message;

      // ツール呼び出しがない場合は完了
      if (!message.tool_calls || message.tool_calls.length === 0) {
        messages.push(message);
        break;
      }

      // ツール呼び出しを実行
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;
        const toolName = toolCall.function.name;

        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = toolCall.function.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {};
        } catch (parseError) {
          console.warn("ツール引数の解析に失敗しました", parseError);
        }

        // ツールを実行
        const result = await executeTool(toolName, toolArgs);
        steps.push({ tool: toolName, args: toolArgs, result });

        // 結果をLLMにフィードバック
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
      }
    }

    // 最終的な応答を取得
    // GPT-5が利用可能な場合は優先、なければ最新のモデルを使用
    const model = process.env.OPENAI_MODEL || "gpt-5";
    const finalCompletionOptions: any = {
      model,
      messages,
    };
    
    const finalCompletion = await openai.chat.completions.create(finalCompletionOptions);

    const finalMessage = finalCompletion.choices[0].message.content || "処理が完了しました";

    return NextResponse.json({
      success: true,
      result: finalMessage,
      steps: steps.map((s) => ({
        tool: s.tool,
        args: s.args,
        result: s.result.substring(0, 200) + (s.result.length > 200 ? "..." : ""),
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

