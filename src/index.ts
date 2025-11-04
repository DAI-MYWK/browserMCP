#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .envファイルを読み込む
dotenv.config();

// ブラウザ管理クラス
class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private defaultPageId = "default";
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    // 既に初期化中または初期化済みの場合は待機
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    if (this.isInitialized && this.browser && this.context) {
      return;
    }

    // 既存のブラウザインスタンスがあればクリーンアップ
    if (this.browser) {
      await this.close();
    }

    // 初期化を開始
    this.initializationPromise = this._doInitialize();
    await this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    // デフォルトはヘッドフルモード（ブラウザを表示）
    // 環境変数で"true"が明示的に設定された場合のみヘッドレスモード
    const headless = process.env.BROWSER_HEADLESS === "true";
    const browserType = (process.env.BROWSER_TYPE || "chromium") as "chromium" | "firefox" | "webkit";
    
    const launchOptions: any = {
      headless,
      // MacのDockに表示されないようにする
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        // MacでDockに表示されないようにする
        "--disable-features=ChromeWhatsNewUI",
        // バックグラウンドで実行（ヘッドフルモードでもDockに表示されにくくする）
        "--background-mode",
      ],
    };

    // 認証情報がある場合は設定
    if (process.env.AUTH_USER && process.env.AUTH_PASS) {
      launchOptions.httpCredentials = {
        username: process.env.AUTH_USER,
        password: process.env.AUTH_PASS,
      };
    }

    // ユーザーデータディレクトリの設定
    const userDataDir = process.env.USER_DATA_DIR;
    if (userDataDir) {
      launchOptions.userDataDir = userDataDir;
    }

    // ブラウザ起動（既に起動している場合は再利用）
    if (this.browser && !this.browser.isConnected()) {
      // 既存のブラウザが切断されている場合は閉じる
      try {
        await this.browser.close();
      } catch (e) {
        // エラーは無視
      }
      this.browser = null;
    }

    if (!this.browser) {
      if (browserType === "chromium") {
        this.browser = await chromium.launch(launchOptions);
      } else if (browserType === "firefox") {
        const { firefox } = await import("playwright");
        this.browser = await firefox.launch(launchOptions);
      } else if (browserType === "webkit") {
        const { webkit } = await import("playwright");
        this.browser = await webkit.launch(launchOptions);
      }
    }

    // コンテキスト作成
    const contextOptions: any = {
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    };

    // 保存された認証状態があれば読み込む
    const storageStatePath = path.join(process.cwd(), ".auth-state.json");
    if (fs.existsSync(storageStatePath)) {
      contextOptions.storageState = storageStatePath;
    }

    // 既存のコンテキストがある場合は再利用（タブとして追加するため）
    if (!this.context || this.context.browser() !== this.browser) {
      // 既存のコンテキストを閉じる
      if (this.context) {
        try {
          await this.context.close();
        } catch (e) {
          // エラーは無視
        }
      }
      this.context = await this.browser!.newContext(contextOptions);
    }
    
    // 既存のページがあれば閉じる（ただし、デフォルトページは残す）
    for (const [pageId, page] of this.pages.entries()) {
      if (pageId === this.defaultPageId) {
        // デフォルトページは残す
        continue;
      }
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (e) {
        // ページが既に閉じられている場合は無視
      }
    }
    
    // デフォルトページがない場合のみ作成
    if (!this.pages.has(this.defaultPageId)) {
      const defaultPage = await this.context.newPage();
      const welcomeHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Browser MCP Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          h1 { margin: 0 0 1rem 0; }
          p { margin: 0.5rem 0; opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌐 Browser MCP Server</h1>
          <p>ブラウザ自動化サーバーが起動しました</p>
          <p>Claude Desktopから操作を開始できます</p>
        </div>
      </body>
      </html>
      `;
      await defaultPage.setContent(welcomeHtml);
      this.pages.set(this.defaultPageId, defaultPage);
    }
    
    this.isInitialized = true;
  }

  async getPage(pageId?: string): Promise<Page> {
    // 初期化が完了するまで待機
    if (!this.isInitialized) {
      await this.initialize();
    }

    const id = pageId || this.defaultPageId;
    let page = this.pages.get(id);
    
    // ページが存在しない場合、自動的に作成
    if (!page) {
      if (!this.context) {
        // 初期化を再試行
        await this.initialize();
        if (!this.context) {
          throw new Error("Browser context not initialized. Please wait for initialization.");
        }
      }
      // デフォルトページの場合は再作成
      if (id === this.defaultPageId) {
        page = await this.context.newPage();
        const welcomeHtml = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Browser MCP Server</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                backdrop-filter: blur(10px);
              }
              h1 { margin: 0 0 1rem 0; }
              p { margin: 0.5rem 0; opacity: 0.9; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🌐 Browser MCP Server</h1>
              <p>ブラウザ自動化サーバーが起動しました</p>
              <p>Claude Desktopから操作を開始できます</p>
            </div>
          </body>
          </html>
        `;
        await page.setContent(welcomeHtml);
        this.pages.set(this.defaultPageId, page);
      } else {
        // 他のページIDの場合は新規作成
        page = await this.context.newPage();
        this.pages.set(id, page);
      }
    }
    
    return page;
  }

  async createPage(pageId?: string): Promise<string> {
    // 初期化が完了するまで待機
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.context) {
      throw new Error("Browser context not initialized");
    }
    const id = pageId || `page-${Date.now()}`;
    
    // 既存のコンテキスト内で新しいページ（タブ）を作成
    // これにより、同じブラウザウィンドウ内にタブとして追加される
    const page = await this.context.newPage();
    this.pages.set(id, page);
    return id;
  }

  async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (page) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (e) {
        // エラーは無視
      }
      this.pages.delete(pageId);
    }
    
    // すべてのページが閉じられた場合でも、ブラウザは開いたままにする
    // （デフォルトページは残す）
    if (this.pages.size === 0 && this.context) {
      // デフォルトページを再作成
      const defaultPage = await this.context.newPage();
      const welcomeHtml = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Browser MCP Server</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 1rem 0; }
            p { margin: 0.5rem 0; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🌐 Browser MCP Server</h1>
            <p>ブラウザ自動化サーバーが起動しました</p>
            <p>Claude Desktopから操作を開始できます</p>
          </div>
        </body>
        </html>
      `;
      await defaultPage.setContent(welcomeHtml);
      this.pages.set(this.defaultPageId, defaultPage);
    }
  }

  async saveAuthState(): Promise<void> {
    if (!this.context) {
      throw new Error("Browser context not initialized");
    }
    const storageStatePath = path.join(process.cwd(), ".auth-state.json");
    await this.context.storageState({ path: storageStatePath });
  }

  async close(): Promise<void> {
    // すべてのページを閉じる
    for (const [pageId, page] of this.pages.entries()) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (e) {
        // エラーは無視
      }
    }
    this.pages.clear();

    // コンテキストを閉じる
    if (this.context) {
      try {
        await this.context.close();
      } catch (e) {
        // エラーは無視
      }
      this.context = null;
    }

    // ブラウザを閉じる
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // エラーは無視
      }
      this.browser = null;
    }

    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

const browserManager = new BrowserManager();

// MCPサーバーの作成
const server = new Server(
  {
    name: "browser-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "browser_navigate",
        description: "指定したURLに移動します。Googleフォームやkintoneなどのページを開く際に使用します。",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "移動先のURL",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
            waitUntil: {
              type: "string",
              enum: ["load", "domcontentloaded", "networkidle", "commit"],
              description: "待機条件（デフォルト: load）",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "browser_click",
        description: "ページ上の要素をクリックします。セレクタまたはテキストで要素を指定できます。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSSセレクタまたはテキスト（テキストの場合は自動で要素を検索）",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
            timeout: {
              type: "number",
              description: "タイムアウト（ミリ秒、デフォルト: 30000）",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "browser_fill",
        description: "入力フィールドにテキストを入力します。フォーム入力に使用します。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSSセレクタ",
            },
            text: {
              type: "string",
              description: "入力するテキスト",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["selector", "text"],
        },
      },
      {
        name: "browser_fill_by_label",
        description: "ラベルやプレースホルダーのテキストから入力フィールドを特定して値を入力します。",
        inputSchema: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description: "入力欄のラベル・プレースホルダー・aria-labelなどに含まれるテキスト",
            },
            value: {
              type: "string",
              description: "入力する値",
            },
            exact: {
              type: "boolean",
              description: "trueの場合はラベルを完全一致で検索（デフォルトは部分一致）",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["label", "value"],
        },
      },
      {
        name: "browser_select",
        description: "セレクトボックスやドロップダウンからオプションを選択します。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSSセレクタ",
            },
            value: {
              type: "string",
              description: "選択する値（value属性またはラベル）",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["selector", "value"],
        },
      },
      {
        name: "browser_screenshot",
        description: "ページのスクリーンショットを取得します。デバッグや確認に使用します。",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
            fullPage: {
              type: "boolean",
              description: "全ページをキャプチャするか（デフォルト: false）",
            },
            path: {
              type: "string",
              description: "保存先のパス（省略時はbase64で返す）",
            },
          },
        },
      },
      {
        name: "browser_evaluate",
        description: "ページ上でJavaScriptを実行します。DOM操作やデータ取得に使用します。",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "実行するJavaScriptコード",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["script"],
        },
      },
      {
        name: "browser_wait",
        description: "指定した条件が満たされるまで待機します。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "表示を待つ要素のCSSセレクタ",
            },
            timeout: {
              type: "number",
              description: "タイムアウト（ミリ秒、デフォルト: 30000）",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "browser_get_text",
        description: "要素のテキスト内容を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSSセレクタ",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "browser_save_auth",
        description: "現在の認証状態を保存します。次回以降のログインをスキップできます。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "browser_create_page",
        description: "新しいページ（タブ）を作成します。",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "ページID（省略時は自動生成）",
            },
          },
        },
      },
      {
        name: "browser_close_page",
        description: "指定したページを閉じます。",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "閉じるページID",
            },
          },
          required: ["pageId"],
        },
      },
      {
        name: "browser_fill_textarea",
        description: "テキストエリアにテキストを入力します。",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSSセレクタ",
            },
            text: {
              type: "string",
              description: "入力するテキスト",
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["selector", "text"],
        },
      },
      {
        name: "airregi_reserve_form",
        description: "Airレジのオンライン導入相談予約フォームを自動入力します。指定したフォームデータでフォームを埋めます。",
        inputSchema: {
          type: "object",
          properties: {
            formData: {
              type: "object",
              description: "フォーム入力データ",
              properties: {
                lastNameKatakana: {
                  type: "string",
                  description: "フリガナ（セイ）例: アオゾラ",
                },
                firstNameKatakana: {
                  type: "string",
                  description: "フリガナ（メイ）例: タロウ",
                },
                lastName: {
                  type: "string",
                  description: "名前（姓）例: 青空",
                },
                firstName: {
                  type: "string",
                  description: "名前（名）例: 太郎",
                },
                phone: {
                  type: "string",
                  description: "電話番号（ハイフンなし）例: 0312345678",
                },
                email: {
                  type: "string",
                  description: "メールアドレス例: taro@example.com",
                },
                emailConfirm: {
                  type: "string",
                  description: "メールアドレス（確認用）",
                },
                prefecture: {
                  type: "string",
                  description: "都道府県のvalue値（例: KeyTOKYOTO）",
                },
                remarks: {
                  type: "string",
                  description: "備考欄",
                },
              },
            },
            pageId: {
              type: "string",
              description: "使用するページID（省略時はデフォルトページ）",
            },
          },
          required: ["formData"],
        },
      },
    ],
  };
});

// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "browser_navigate": {
        const { url, pageId, waitUntil = "load" } = args as {
          url: string;
          pageId?: string;
          waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
        };
        const page = await browserManager.getPage(pageId);
        await page.goto(url, { waitUntil });
        return {
          content: [
            {
              type: "text",
              text: `URL ${url} に移動しました`,
            },
          ],
        };
      }

      case "browser_click": {
        const { selector, pageId, timeout = 30000 } = args as {
          selector: string;
          pageId?: string;
          timeout?: number;
        };
        const page = await browserManager.getPage(pageId);
        
        // テキストベースの検索を試みる
        let element = page.locator(selector).first();
        try {
          await element.waitFor({ timeout: 1000 });
        } catch {
          // セレクタが見つからない場合、テキストで検索
          element = page.getByText(selector).first();
        }
        
        await element.click({ timeout });
        return {
          content: [
            {
              type: "text",
              text: `要素 "${selector}" をクリックしました`,
            },
          ],
        };
      }

      case "browser_fill": {
        const { selector, text, pageId } = args as {
          selector: string;
          text: string;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        await page.fill(selector, text);
        return {
          content: [
            {
              type: "text",
              text: `要素 "${selector}" に "${text}" を入力しました`,
            },
          ],
        };
      }

      case "browser_fill_by_label": {
        const { label, value, exact = false, pageId } = args as {
          label: string;
          value: string;
          exact?: boolean;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);

        const normalizedLabel = label.trim();
        let target = page.getByLabel(normalizedLabel, { exact });

        if (await target.count()) {
          target = target.first();
        } else {
          // プレースホルダーやaria-labelで検索
          const escaped = normalizedLabel.replace(/["'\\]/g, "").replace(/[\[\]]/g, "");
          target = page.locator(
            `input[placeholder*="${escaped}"]`,
          );
          if (await target.count() === 0) {
            target = page.locator(
              `textarea[placeholder*="${escaped}"]`
            );
          }
          if (await target.count() === 0) {
            target = page.locator(
              `[aria-label*="${escaped}"]`
            );
          }
          if (await target.count() === 0) {
            target = page.locator(
              `[name*="${escaped}"]`
            );
          }
          if (await target.count() === 0) {
            throw new Error(`ラベル/プレースホルダー "${label}" に一致する入力欄が見つかりませんでした`);
          }
          target = target.first();
        }

        const elementHandle = await target.elementHandle();
        if (!elementHandle) {
          throw new Error(`ラベル "${label}" に一致する要素を取得できませんでした`);
        }

        const tagName = (await elementHandle.evaluate((el) => el.tagName)).toLowerCase();

        if (tagName === "select") {
          // 選択肢のlabel優先で選択、valueが一致しない場合はテキスト一致を試す
          const optionSelected = await target.selectOption({ label: value }).catch(async () => {
            const result = await target.selectOption({ value });
            return result;
          });
          if (!optionSelected || optionSelected.length === 0) {
            throw new Error(`select要素に "${value}" を選択できませんでした`);
          }
        } else {
          await target.fill(value);
        }

        return {
          content: [
            {
              type: "text",
              text: `ラベル "${label}" のフィールドに "${value}" を入力しました`,
            },
          ],
        };
      }

      case "browser_select": {
        const { selector, value, pageId } = args as {
          selector: string;
          value: string;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        await page.selectOption(selector, value);
        return {
          content: [
            {
              type: "text",
              text: `要素 "${selector}" で "${value}" を選択しました`,
            },
          ],
        };
      }

      case "browser_screenshot": {
        const { pageId, fullPage = false, path: screenshotPath } = args as {
          pageId?: string;
          fullPage?: boolean;
          path?: string;
        };
        const page = await browserManager.getPage(pageId);
        const buffer = await page.screenshot({ fullPage, path: screenshotPath });
        
        if (screenshotPath) {
          return {
            content: [
              {
                type: "text",
                text: `スクリーンショットを ${screenshotPath} に保存しました`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `スクリーンショットを取得しました（base64: ${buffer.toString("base64").substring(0, 100)}...）`,
              },
            ],
          };
        }
      }

      case "browser_evaluate": {
        const { script, pageId } = args as {
          script: string;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        const result = await page.evaluate(script);
        return {
          content: [
            {
              type: "text",
              text: `実行結果: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "browser_wait": {
        const { selector, timeout = 30000, pageId } = args as {
          selector: string;
          timeout?: number;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        await page.waitForSelector(selector, { timeout });
        return {
          content: [
            {
              type: "text",
              text: `要素 "${selector}" の表示を確認しました`,
            },
          ],
        };
      }

      case "browser_get_text": {
        const { selector, pageId } = args as {
          selector: string;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        const text = await page.locator(selector).first().textContent();
        return {
          content: [
            {
              type: "text",
              text: text || "(テキストが見つかりませんでした)",
            },
          ],
        };
      }

      case "browser_save_auth": {
        await browserManager.saveAuthState();
        return {
          content: [
            {
              type: "text",
              text: "認証状態を保存しました",
            },
          ],
        };
      }

      case "browser_create_page": {
        const { pageId } = args as { pageId?: string };
        const newPageId = await browserManager.createPage(pageId);
        return {
          content: [
            {
              type: "text",
              text: `新しいページ "${newPageId}" を作成しました`,
            },
          ],
        };
      }

      case "browser_close_page": {
        const { pageId } = args as { pageId: string };
        await browserManager.closePage(pageId);
        return {
          content: [
            {
              type: "text",
              text: `ページ "${pageId}" を閉じました`,
            },
          ],
        };
      }

      case "browser_fill_textarea": {
        const { selector, text, pageId } = args as {
          selector: string;
          text: string;
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        await page.fill(selector, text);
        return {
          content: [
            {
              type: "text",
              text: `テキストエリア "${selector}" に "${text}" を入力しました`,
            },
          ],
        };
      }

      case "airregi_reserve_form": {
        const { formData, pageId } = args as {
          formData: {
            lastNameKatakana?: string;
            firstNameKatakana?: string;
            lastName?: string;
            firstName?: string;
            phone?: string;
            email?: string;
            emailConfirm?: string;
            prefecture?: string;
            remarks?: string;
          };
          pageId?: string;
        };
        const page = await browserManager.getPage(pageId);
        const results: string[] = [];

        // フォームフィールドに入力
        if (formData.lastNameKatakana) {
          await page.fill('input[name="lastNmKn"]', formData.lastNameKatakana);
          results.push(`フリガナ（セイ）: ${formData.lastNameKatakana}`);
        }

        if (formData.firstNameKatakana) {
          await page.fill('input[name="firstNmKn"]', formData.firstNameKatakana);
          results.push(`フリガナ（メイ）: ${formData.firstNameKatakana}`);
        }

        if (formData.lastName) {
          await page.fill('input[name="lastNm"]', formData.lastName);
          results.push(`名前（姓）: ${formData.lastName}`);
        }

        if (formData.firstName) {
          await page.fill('input[name="firstNm"]', formData.firstName);
          results.push(`名前（名）: ${formData.firstName}`);
        }

        if (formData.phone) {
          await page.fill('input[name="tel1"]', formData.phone);
          results.push(`電話番号: ${formData.phone}`);
        }

        if (formData.email) {
          await page.fill('input[name="mailAddress1"]', formData.email);
          results.push(`メールアドレス: ${formData.email}`);
        }

        if (formData.emailConfirm) {
          await page.fill('input[name="mailAddress1ForCnfrm"]', formData.emailConfirm);
          results.push(`メールアドレス（確認用）: ${formData.emailConfirm}`);
        } else if (formData.email) {
          // 確認用が指定されていない場合は、メールアドレスと同じ値を入力
          await page.fill('input[name="mailAddress1ForCnfrm"]', formData.email);
          results.push(`メールアドレス（確認用）: ${formData.email}（自動入力）`);
        }

        if (formData.prefecture) {
          await page.selectOption('select[name="prefCd"]', formData.prefecture);
          results.push(`都道府県: ${formData.prefecture}`);
        }

        if (formData.remarks) {
          await page.fill('textarea[name="exItem01"]', formData.remarks);
          results.push(`備考欄: ${formData.remarks}`);
        }

        return {
          content: [
            {
              type: "text",
              text: `フォーム入力が完了しました:\n${results.join("\n")}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `エラー: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // ブラウザを初期化
  await browserManager.initialize();
  
  console.error("Browser MCP Server started");
  
  // 終了時のクリーンアップ
  process.on("SIGINT", async () => {
    await browserManager.close();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await browserManager.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

