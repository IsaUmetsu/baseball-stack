# baseball-stack

baseball / py_baseball / viewer を Docker でまとめて動かすためのローカル実行環境です。

- **Node.js (TypeScript)**: NPB データの import / 処理
- **Python**: スクレイピング・データ生成
- **MySQL**: データ保存 (ポート: `3307`)
- **Next.js (App Router + Tailwind CSS)**: [新規追加] `debug_base` ビュー表示用Webデータビューア (ポート: `3000`)

本リポジトリは **実行・検証用の統合環境**であり、
アプリ本体は以下のリポジトリで管理しています。

- https://github.com/IsaUmetsu/baseball
- https://github.com/IsaUmetsu/py_baseball

---

## 🚀 クイックスタート・データビューアの起動手順

### 1. 環境変数の設定
プロジェクトルートにある `.env.example` を参考に、環境設定ファイル `.env` を作成または確認します。
すでに `.env` がある場合はそのままで動作します。

```bash
cp .env.example .env
```

### 2. コンテナの起動
以下のコマンドを実行し、データベース、収集スクリプト環境、および Next.js データビューアを一括起動します。

```bash
docker compose up -d --build
```

コンテナ一覧で `baseball-viewer` が `running` になっていることを確認してください。

### 3. ブラウザで確認
コンテナ起動後、Webブラウザで以下のアドレスにアクセスします。

👉 **[http://localhost:3000](http://localhost:3000)**

- 初回アクセス時、MySQLの起動直後はデータベース内のビュー `debug_base` が未ロードのため、接続エラー画面が表示されることがあります。DBのヘルスチェックが通り初期化SQLが読み込まれるまで数十秒待ち、再読み込みを行ってください。
- データが正常に取得されると、選手名、所属球団、打撃/投球結果などで検索やフィルタリング、50件ごとのページネーションが可能なテーブルが表示されます。

### 4. コンテナの停止
```bash
docker compose down
```
