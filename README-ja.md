# VSCode Sandwich

VSCode Sandwichは、人気のあるVimプラグイン[vim-sandwich](https://github.com/machakann/vim-sandwich)にインスパイアされたVisual Studio Code拡張機能です。引用符（シングルクォート `'`、ダブルクォート `"`、バッククォート `` ` ``）、括弧（丸括弧 `()`、中括弧 `{}`、大括弧 `[]`、山括弧 `<>`）、HTML/XMLタグなどの囲み文字を追加、削除、置換するための操作を提供します。

## 概要

この拡張機能はvim-sandwichのコアコンセプトをVSCode環境に適応させたものです。完全な移植や完全互換の実装を目指したものではなく、VSCodeネイティブなテキスト囲み操作アプローチを提供します。

## 機能

- テキストオブジェクトへの**囲み文字の追加**
  - 複数の選択モード:
    - `_`: 行全体
    - `s`: 現在の選択範囲
    - `it`: HTML/XMLタグの内側
    - `at`: HTML/XMLタグの周り（タグを含む）
    - `st`: 自己閉じタグ
- テキストオブジェクトからの**囲み文字の削除**
- 囲み文字の**別の囲み文字への置換**

## 使い方

この拡張機能はコマンドベースのワークフローを使用します：

1. 拡張機能をトリガーする（デフォルト: macOSでは `Cmd-k + s`、Windows/Linuxでは `Ctrl-k + s`）
2. 操作を選択する: `a`（追加）、`d`（削除）、または `r`（置換）
3. 対象範囲を選択する（追加操作の場合）
4. 囲み文字の種類を選択する


## インストール

```
1. VS Codeを開く
2. 拡張機能に移動する（Cmd+Shift+X / Ctrl+Shift+X）
3. "VSCode Sandwich"を検索する
4. インストールする
```

## 設定

この拡張機能はVS Code設定を通じて設定できます：

```json
"vscodeSandwich.enterToConfirm": false,
"vscodeSandwich.highlightColor": "rgba(255, 255, 0, 0.3)"
```

### 設定オプション

#### `vscodeSandwich.enterToConfirm`

各選択を確定するためにEnterキーを押す必要があるか、キーを押した瞬間に応答するかを制御します：

- `false`（デフォルト）：Enterキーを待たずに、キーを押した瞬間に拡張機能が即座に応答します。これにより、より速いワークフローが可能になりますが、間違ったキーを押した場合に誤選択が発生する可能性があります。
- `true`：操作（a/d/r）や範囲タイプを選択した後、Enterキーを押して確定し、次のステップに進む必要があります。これは誤選択を防ぐため、より安全です。

例えば、`enterToConfirm: true`の場合、ワークフローは次のようになります：
1. `Cmd-k + s`を押す
2. `a`を押してから`Enter`を押す
3. `s`を押してから`Enter`を押す
4. `"`を押してから`Enter`を押す

`enterToConfirm: false`の場合、ワークフローは次のようになります：
1. `Cmd-k + s`を押す
2. `a`を押す（即座に次のステップに進む）
3. `s`を押す（即座に次のステップに進む）
4. `"`を押す（即座に操作が適用される）

#### `vscodeSandwich.highlightColor`

選択範囲のハイライト表示に使用される色を設定します。デフォルトは`"rgba(255, 255, 0, 0.3)"`（半透明の黄色）です。

## ライセンス

[MIT](LICENSE)

## 拡張機能の公開方法

以下の手順で拡張機能を公開できます：
1. Azure DevOps(https://dev.azure.com/{Your_Organization})にアクセスしてPAT（Personal Access Token）を取得します。
2. `package.json`内のバージョンを更新します。
3. 以下のコマンドを実行してパッケージを作成します（依存関係を含めない）：
   ```
   vsce package <version> --no-dependencies
   ```
4. 以下のコマンドを実行して拡張機能を公開します（依存関係を含めない）：
   ```
   vsce publish <version> --no-dependencies
   ```
