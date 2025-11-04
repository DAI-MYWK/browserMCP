"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Tool {
  name: string;
  description: string;
}

interface Task {
  id: string;
  title: string;
  detail?: string;
  status: "pending" | "completed";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const taskProgressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, tasks]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectToServer = async () => {
    try {
      const response = await fetch("/api/connect", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setAvailableTools(data.tools || []);
        setIsConnected(true);
        setMessages([
          {
            role: "assistant",
            content: "✅ MCPサーバーに接続しました。ブラウザ操作の指示をどうぞ。",
            timestamp: new Date(),
          },
        ]);
      } else {
        alert("接続エラー: " + data.error);
      }
    } catch (error: any) {
      alert("接続エラー: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConnected) return;

    // タスク進捗のタイマーをリセット
    taskProgressTimers.current.forEach((timer) => clearTimeout(timer));
    taskProgressTimers.current = [];
    setTasks([]);

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // 会話履歴を構築（OpenAI形式に変換）
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));

      // LLMエージェントを使用してマルチターン処理
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instruction: currentInput,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // タスク進捗を構築
        if (data.steps && Array.isArray(data.steps)) {
          const baseTasks: Task[] = data.steps.map((step: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            title: formatTaskTitle(step),
            detail: step.result,
            status: "pending",
          }));
          setTasks(baseTasks);

          baseTasks.forEach((_, index) => {
            const timer = setTimeout(() => {
              setTasks((prev) =>
                prev.map((task, taskIndex) =>
                  taskIndex === index ? { ...task, status: "completed" } : task
                )
              );
            }, (index + 1) * 400);
            taskProgressTimers.current.push(timer);
          });
        }

        // 実行ステップをチャットにも追記
        let content = data.result;
        if (data.steps && data.steps.length > 0) {
          content += "\n\n実行ステップ:\n";
          data.steps.forEach((step: any, index: number) => {
            content += `${index + 1}. ${step.tool}(${JSON.stringify(step.args)})\n`;
            content += `   → ${step.result}\n`;
          });
        }

        const assistantMessage: Message = {
          role: "assistant",
          content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "エラーが発生しました");
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: "エラー: " + error.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTool = async (toolName: string, args: Record<string, any>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toolName, arguments: args }),
      });

      const data = await response.json();
      return data.result || data.error;
    } catch (error: any) {
      return "エラー: " + error.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">🌐 Browser MCP Chat</h1>
          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                isConnected
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            >
              {isConnected ? "🟢 接続中" : "⚪ 未接続"}
            </div>
            {!isConnected && (
              <button
                onClick={connectToServer}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                サーバーに接続
              </button>
            )}
          </div>
        </div>
      </header>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {tasks.length > 0 && (
            <div className="bg-white border border-purple-100 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🗂️</span>
                <h2 className="text-lg font-semibold text-gray-800">タスク進捗</h2>
              </div>
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 mt-1 h-5 w-5 rounded-full flex items-center justify-center border-2 ${
                        task.status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 text-transparent"
                      }`}
                    >
                      ✔
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 whitespace-pre-wrap">
                        {task.title}
                      </p>
                      {task.detail && (
                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                          {task.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-xl mb-4">ブラウザ操作の指示を入力してください</p>
              <p className="text-sm">
                例: 「Googleにアクセスして」「スクリーンショットを取得して」
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-800 shadow"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user"
                      ? "text-purple-100"
                      : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="text-gray-600">実行中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isConnected
                  ? "ブラウザ操作の指示を入力..."
                  : "まず「サーバーに接続」をクリックしてください"
              }
              disabled={!isConnected || isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!isConnected || isLoading || !input.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              送信
            </button>
          </div>
        </form>
      </div>

      {/* ツール一覧（サイドバー） */}
      {isConnected && availableTools.length > 0 && (
        <div className="fixed right-4 top-20 w-64 bg-white rounded-lg shadow-lg p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h2 className="font-bold text-gray-800 mb-2">利用可能なツール</h2>
          <div className="space-y-2">
            {availableTools.map((tool) => (
              <div
                key={tool.name}
                className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="font-semibold text-purple-600">{tool.name}</div>
                <div className="text-gray-600 mt-1">{tool.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTaskTitle(step: any): string {
  if (!step) return "";
  const tool = step.tool as string;
  const args = step.args || {};

  switch (tool) {
    case "browser_navigate":
      return `URLへ移動: ${args.url ?? ""}`;
    case "browser_click":
      return `クリック: ${args.selector ?? args.text ?? "セレクタ未指定"}`;
    case "browser_fill":
      return `入力: ${args.selector ?? "セレクタ未指定"} ← ${args.text ?? ""}`;
    case "browser_fill_by_label":
      return `入力: ${args.label ?? "フィールド"} ← ${args.value ?? ""}`;
    case "browser_select":
      return `選択: ${args.selector ?? ""} ← ${args.value ?? ""}`;
    case "browser_fill_textarea":
      return `テキスト入力: ${args.selector ?? ""}`;
    case "browser_screenshot":
      return "スクリーンショットを取得";
    default:
      return `${tool}`;
  }
}
