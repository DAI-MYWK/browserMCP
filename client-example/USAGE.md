# クライアントアプリの使い方

クライアントアプリからBrowser MCP Serverに指示を出す方法を説明します。

## セットアップ

```bash
cd client-example
npm install
npm run build
```

## 基本的な使い方

### 1. 利用可能なツールを確認

```bash
npm run dev
# または
npm start
```

### 2. URLに移動

```bash
npm run dev browser_navigate url="https://www.google.com"
```

### 3. スクリーンショットを取得

```bash
npm run dev browser_screenshot fullPage=true path="screenshot.png"
```

### 4. 要素をクリック

```bash
npm run dev browser_click selector="button[type='submit']"
```

### 5. フォームに入力

```bash
npm run dev browser_fill selector="input[name='email']" text="test@example.com"
```

### 6. テキストを取得

```bash
npm run dev browser_get_text selector="h1"
```

### 7. JavaScriptを実行

```bash
npm run dev browser_evaluate script="document.title"
```

## 実践例

### Googleフォームを開く

```bash
npm run dev browser_navigate url="https://forms.google.com"
```

### Airレジの予約フォームを入力

```bash
npm run dev airregi_reserve_form formData='{"lastNameKatakana":"アオゾラ","firstNameKatakana":"タロウ","lastName":"青空","firstName":"太郎","phone":"0312345678","email":"taro@example.com","prefecture":"KeyTOKYOTO"}'
```

**注意**: JSON文字列はシングルクォートで囲み、プロパティはダブルクォートで囲みます。

### 複数の操作を連続で実行

```bash
# 1. URLに移動
npm run dev browser_navigate url="https://www.google.com"

# 2. スクリーンショットを取得
npm run dev browser_screenshot path="google.png"

# 3. 検索ボックスに入力
npm run dev browser_fill selector="textarea[name='q']" text="Playwright"

# 4. 検索ボタンをクリック
npm run dev browser_click selector="input[type='submit']"
```

## 引数の指定方法

### 文字列値

```bash
npm run dev browser_fill selector="input[name='email']" text="test@example.com"
```

### 数値値

```bash
npm run dev browser_wait selector=".loading" timeout=5000
```

### 真偽値

```bash
npm run dev browser_screenshot fullPage=true
```

### JSONオブジェクト

```bash
npm run dev airregi_reserve_form formData='{"lastName":"田中","firstName":"太郎"}'
```

## トラブルシューティング

### エラー: サーバーが見つからない

サーバーパスが正しいか確認してください。`client-example/src/index.ts`の`SERVER_PATH`を確認してください。

### エラー: ツールが見つからない

ツール名が正しいか確認してください。利用可能なツール一覧を表示するには：

```bash
npm run dev
```

### エラー: 引数のパースエラー

JSON文字列は正しくエスケープされているか確認してください。シングルクォートで囲み、内部のダブルクォートはエスケープする必要はありません。

```bash
# 正しい例
npm run dev airregi_reserve_form formData='{"key":"value"}'

# 間違った例
npm run dev airregi_reserve_form formData="{\"key\":\"value\"}"
```

## スクリプトとして使用

シェルスクリプトで複数の操作を自動化できます：

```bash
#!/bin/bash
cd /path/to/client-example

# Googleに移動
npm run dev browser_navigate url="https://www.google.com"

# スクリーンショット取得
npm run dev browser_screenshot path="screenshot.png"

# 検索
npm run dev browser_fill selector="textarea[name='q']" text="Playwright"
npm run dev browser_click selector="input[type='submit']"
```

