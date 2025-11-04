#!/bin/bash

# 開いているChromium/Chromeプロセスを確認して閉じるスクリプト

echo "開いているブラウザプロセスを確認中..."

# PlaywrightのChromiumプロセスを検索
PLAYWRIGHT_PIDS=$(ps aux | grep -i "chromium\|chrome" | grep -i "playwright\|browsermcp" | grep -v grep | awk '{print $2}')

if [ -z "$PLAYWRIGHT_PIDS" ]; then
  echo "開いているブラウザプロセスは見つかりませんでした。"
else
  echo "以下のプロセスが見つかりました:"
  ps aux | grep -i "chromium\|chrome" | grep -i "playwright\|browsermcp" | grep -v grep
  
  read -p "これらのプロセスを終了しますか？ (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$PLAYWRIGHT_PIDS" | xargs kill -9
    echo "プロセスを終了しました。"
  else
    echo "キャンセルしました。"
  fi
fi

