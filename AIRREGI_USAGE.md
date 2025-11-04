# Airレジ オンライン導入相談予約の自動化ガイド

このガイドでは、Airレジのオンライン導入相談予約フォームを自動入力する方法を説明します。

## 操作手順

以下の手順で、Airレジの予約フォームを自動入力できます。

### ステップ1: ページを開く

```
https://airregi.jp/jp/start_support/online_consultation/?ref=airregi_navi にアクセスしてください
```

### ステップ2〜6: 予約日時を選択

以下のセレクタを順番にクリックして、予約日時を選択します：

```
1. #onlineConsultation_contents_reserve > div > ul > li:nth-child(1) > a > img.spNone をクリック
2. #js-scheduleTblWrapHourUnit > table > tbody > tr > td:nth-child(3) > div > ul > li:nth-child(2) > ul > li > div をクリック
3. #js-sectionPopup > div > div.sectionMainActionHourUnit > table > tbody > tr > td:nth-child(1) > button をクリック
4. #js-sectionPopup > div > div:nth-child(5) > button をクリック
5. #menuDetailForm > section > div > div > button.btn.is-primary をクリック
```

### ステップ7: フォーム自動入力

専用ツール `airregi_reserve_form` を使用してフォームを自動入力します。

## 使用例

### Claude Desktopでの指示例

以下のようにClaudeに指示してください：

```
Airレジのオンライン導入相談予約を進めてください。
手順は以下の通りです：

1. https://airregi.jp/jp/start_support/online_consultation/?ref=airregi_navi にアクセス
2. #onlineConsultation_contents_reserve > div > ul > li:nth-child(1) > a > img.spNone をクリック
3. #js-scheduleTblWrapHourUnit > table > tbody > tr > td:nth-child(3) > div > ul > li:nth-child(2) > ul > li > div をクリック
4. #js-sectionPopup > div > div.sectionMainActionHourUnit > table > tbody > tr > td:nth-child(1) > button をクリック
5. #js-sectionPopup > div > div:nth-child(5) > button をクリック
6. #menuDetailForm > section > div > div > button.btn.is-primary をクリック
7. フォームに入力してください：
   - フリガナ（セイ）: アオゾラ
   - フリガナ（メイ）: タロウ
   - 名前（姓）: 青空
   - 名前（名）: 太郎
   - 電話番号: 0312345678
   - メールアドレス: taro@example.com
   - 都道府県: 東京都（KeyTOKYOTO）
   - 備考欄: テスト予約です
```

### フォームデータの詳細

`airregi_reserve_form` ツールを使用する際のフォームデータ例：

```json
{
  "formData": {
    "lastNameKatakana": "アオゾラ",
    "firstNameKatakana": "タロウ",
    "lastName": "青空",
    "firstName": "太郎",
    "phone": "0312345678",
    "email": "taro@example.com",
    "emailConfirm": "taro@example.com",
    "prefecture": "KeyTOKYOTO",
    "remarks": "テスト予約です。AirIDは持っていません。業種は飲食店です。"
  }
}
```

### 都道府県の値一覧

都道府県を選択する際は、以下のvalue値を使用してください：

- 北海道: `KeyHOKKAIDO`
- 青森県: `KeyAOMORIKEN`
- 岩手県: `KeyIWATEKEN`
- 宮城県: `KeyMIYAGIKEN`
- 秋田県: `KeyAKITAKEN`
- 山形県: `KeyYAMAGATAKEN`
- 福島県: `KeyFUKUSHIMAKEN`
- 栃木県: `KeyTOCHIGIKEN`
- 群馬県: `KeyGUNMAKEN`
- 茨城県: `KeyIBARAKIKEN`
- 埼玉県: `KeySAITAMAKEN`
- 千葉県: `KeyCHIBAKEN`
- **東京都**: `KeyTOKYOTO`
- 神奈川県: `KeyKANAGAWAKEN`
- 山梨県: `KeyYAMANASHIKEN`
- 長野県: `KeyNAGANOKEN`
- 新潟県: `KeyNIIGATAKEN`
- 富山県: `KeyTOYAMAKEN`
- 石川県: `KeyISHIKAWAKEN`
- 福井県: `KeyFUKUIKEN`
- 静岡県: `KeySHIZUOKAKEN`
- 岐阜県: `KeyGIFUKEN`
- 愛知県: `KeyAICHIKEN`
- 三重県: `KeyMIEKEN`
- 滋賀県: `KeySHIGAKEN`
- 京都府: `KeyKYOTOFU`
- 大阪府: `KeyOSAKAFU`
- 兵庫県: `KeyHYOGOKEN`
- 奈良県: `KeyNARAKEN`
- 和歌山県: `KeyWAKAYAMAKEN`
- 鳥取県: `KeyTOTTORIKEN`
- 島根県: `KeySHIMANEKEN`
- 岡山県: `KeyOKAYAMAKEN`
- 広島県: `KeyHIROSHIMAKEN`
- 山口県: `KeyYAMAGUCHIKEN`
- 徳島県: `KeyTOKUSHIMAKEN`
- 香川県: `KeyKAGAWAKEN`
- 愛媛県: `KeyEHIMEKEN`
- 高知県: `KeyKOCHIKEN`
- 福岡県: `KeyFUKUOKAKEN`
- 佐賀県: `KeySAGAKEN`
- 長崎県: `KeyNAGASAKIKEN`
- 熊本県: `KeyKUMAMOTOKEN`
- 大分県: `KeyOITAKEN`
- 宮崎県: `KeyMIYAZAKIKEN`
- 鹿児島県: `KeyKAGOSHIMAKEN`
- 沖縄県: `KeyOKINAWAKEN`

## 注意事項

1. **要素の待機**: 各クリック操作の前に、要素が表示されるまで待機するため、必要に応じて `browser_wait` ツールを使用してください。

2. **セレクタの変更**: サイトのHTMLが変更された場合、セレクタが無効になる可能性があります。その場合は、ブラウザの開発者ツールでセレクタを確認してください。

3. **フォーム送信**: このガイドではフォーム入力までを説明しています。実際の送信は手動で行うか、別途実装が必要です。

4. **デバッグ**: 問題が発生した場合は、`browser_screenshot` ツールで各ステップのスクリーンショットを取得して確認してください。

## トラブルシューティング

### 要素が見つからない

- ページの読み込みが完了するまで待機してください
- `browser_wait` ツールで要素の表示を待機してください
- セレクタが正しいか確認してください

### フォーム入力が反映されない

- フォームが表示されているか確認してください
- 入力フィールドが有効になっているか確認してください
- スクリーンショットで現在の状態を確認してください

