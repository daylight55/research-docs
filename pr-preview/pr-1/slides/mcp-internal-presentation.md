---
marp: true
theme: mcp-modern
paginate: true
size: 16:9
title: MCPを開発現場でどう使うべきか
navTitle: MCP internal presentation
description: 社内発表向けMCP解説、要所のQ&A、JSON-RPC payload、CLI/ブラウザ比較、MCPサーバー構築、Remote MCP、開発向けMCP調査
kind: slides
order: 10
footer: "MCP internal presentation"
---
<!--
_class: lead
-->

# MCPを開発現場でどう使うべきか

CLI、ブラウザ操作、API、MCPを比較しながら、既存APIをMCP server化する実装設計まで整理する。

2026-06-07

---

<!--
_class: compact ch00
-->

<p class="chapter-label">00 / 全体像</p>

## 本日の流れ

1. 基本概念: Host / Client / Server / Tool / Transport
2. 比較と判断軸: CLI / Browser / API / MCPの使い分け
3. MCP server構築: 既存APIをagent向けadapterにする
4. Remote MCPと複数Agent設定: Claude接続、project/user/org管理
5. Protocol / Auth / JSON-RPC: 接続フローとtool callの中身
6. AWSケーススタディ: AgentCore Gateway / IdentityでRemote MCPを運用する
7. 開発ワークフロー: WebMCP、Playwright、Chrome DevTools、Serena
8. ガバナンスと導入: 争点、ロードマップ、社内ルール

基本概念から順番に積み上げ、疑問が出やすい箇所だけQ&Aで補足する。

---

<!--
_class: section ch01
-->

<p class="kicker">Chapter 01</p>

# 基本概念

MCPを構成する言葉と責務を揃える

---

<!--
_class: compact ch01
-->

<p class="chapter-label">01 / 基本概念</p>

## まず押さえる用語

| 用語 | 何を指すか | この発表での見方 |
|---|---|---|
| Agent | LLMを使って作業を進める実行主体 | 判断し、toolを選ぶ側 |
| Host | Claude / Cursor / VS Codeなどの実行環境 | MCP接続と承認を管理する側 |
| MCP Client | Host内でserverと通信する部品 | JSON-RPCを送受信する側 |
| MCP Server | 外部機能をtool/resourceとして公開する部品 | 既存APIをagent向けに整える側 |

最初に分けるべきは「賢いmodel」ではなく、**modelを囲む実行境界**。

---

<!--
_class: compact ch01
-->

<p class="chapter-label">01 / 基本概念</p>

## MCPとは？

Model Context Protocol。AI agentが外部のdata / action / workflowを使うための標準protocol。

- 何を公開するか: tool、resource、prompt
- どう説明するか: name、description、input schema、output schema
- どう運ぶか: stdio、Streamable HTTPなどのtransport
- どう守るか: auth、scope、approval、audit、rate limit

MCPは「LLMを賢くする技術」ではなく、**LLMが安全に外部世界へ出るための接続契約**。

---

<!--
_class: compact ch01
-->

<p class="chapter-label">01 / 基本概念</p>

## Host / Client / Serverとは？

<img class="diagram" src="diagrams/mcp-architecture.svg" alt="MCP Host Client Server architecture" />

- Host: user、model、tool承認、接続設定をまとめる
- Client: MCP protocolを話す通信部品
- Server: agent向けに機能を宣言して実行する
- Backend: 既存のSaaS、API、DB、社内system

MCP serverはbackendそのものではなく、**agent向けadapter**として設計する。

---

<!--
_class: compact ch01
-->

<p class="chapter-label">01 / 基本概念</p>

## Tool / Resource / Promptとは？

| 種類 | 役割 | 例 |
|---|---|---|
| Tool | agentが実行できるaction | `search_items`, `create_issue`, `deploy_stack` |
| Resource | agentが読めるcontext/data | file、log、ticket、schema、document |
| Prompt | 再利用できる指示template | incident調査手順、PR review手順 |

開発で最初に使うのは多くの場合tool。

ただし良いMCP serverは、actionだけでなく**判断材料となるresource**も一緒に設計する。

---

<!--
_class: compact ch01
-->

<p class="chapter-label">01 / 基本概念</p>

## Protocol / Transportとは？

- Protocol: どんなmessageを、どんな順序でやり取りするか
- Transport: そのmessageをどう運ぶか
- JSON-RPC: MCP messageの基本的なenvelope
- Auth: 誰が、どのscopeで、どのserver/toolを使えるか

```text
MCP protocol message
  initialize -> tools/list -> tools/call

Transport
  stdio: local processのstdin/stdout
  Streamable HTTP: remote endpoint over HTTPS
```

後半のJSON-RPCやRemote MCPは、この用語の上に乗る。

---

<!--
_class: section ch02
-->

<p class="kicker">Chapter 02</p>

# 比較と判断軸

CLI、Browser、API、MCPを使い分ける

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## なぜMCPが必要なのか

AIエージェントが外部システムを安全に使うための標準インターフェースを作る。

- 外部システム: GitHub、AWS、Sentry、DB、社内API、ブラウザ、Docs
- できること: context取得、tool実行、workflowの再利用
- 重要点: tool名、description、schema、auth、transport、approvalをプロトコルで扱う

MCPは「AIに便利ツールを足す」ではなく、**agent-nativeなAPI境界**。

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## CLI / Browser / MCPの違い

| 方式 | agentが見るもの | 強い場面 | 弱い場面 |
|---|---|---|---|
| CLI | command + stdout/stderr | local test、build、git、devops | flags/env/output量に依存 |
| Browser | UI、DOM、screenshot、DevTools | visual QA、live UI、session依存 | layout/selector/loadingに依存 |
| MCP | tool/resource schema + structured result | repeatableなAPI/data/action | server設計と運用が必要 |

判断軸は「人間向けインターフェースか、agent向け契約か」。

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## Q. CLIで叩けばよくない？

**A. CLIは今でも強い。ただしagentには余計な推測と出力が多い。**

- command syntax、flags、profile、region、envをagentが推測する
- stdout/stderrは人間向けで、ログやstack traceが巨大になりやすい
- エラー原因の切り分けに追加commandが増える
- 出力を絞るには`jq`、`grep`、`--json`などを毎回設計する必要がある

CLIはlocal executionに最適。外部サービスの反復操作はMCPの方が安定しやすい。

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## Q. ブラウザ操作で十分では？

**A. UIそのものを見るなら必須。データ取得や操作の主経路にすると不安定。**

- page遷移、modal、loading、viewport、selector変更に弱い
- screenshotやaccessibility treeはcontextを消費しやすい
- UIから意図を推測するため、操作ミスや待機ミスが起きやすい
- ただしvisual QA、console/network、performance、実ブラウザ再現には強い

ブラウザ操作は「UIの検証」、MCPは「宣言された機能の実行」と分ける。

---

<!--
_class: dense ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## Token効率で見る違い

厳密値はclient/model/result次第。ここでは同一タスクの代表的なcontext消費として見る。

| タスク | CLI | Browser | MCP |
|---|---:|---:|---:|
| PR状態 + 失敗CIログ確認 | 3k-20k | 5k-30k | 800-4k |
| 最新docs検索 | 2k-15k | 5k-25k | 500-3k |
| issue/PR作成 | 1k-8k | 5k-20k | 500-2k |
| UI console/network調査 | 3k-20k | 4k-25k | 1k-8k |
| 運用データ照会 | 2k-30k | 5k-30k | 800-5k |

MCPはtool search、schema、pagination、structured resultでcontextを小さくできる。

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## MCPがフローを安定させる理由

agentが低レベル操作を推測せず、宣言済みcapabilityを呼べるから。

- `tools/list`: 何ができるかを発見する
- `inputSchema`: 必要な引数と型がわかる
- `description`: いつ使うべきか、制約は何かがわかる
- `structuredContent`: 返り値を機械的に扱える
- host UI: sensitive tool callを承認フローに載せられる

「画面を見て推測」や「CLI flagsを思い出す」から「定義済みtoolを呼ぶ」へ移る。

---

<!--
_class: dense ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## CI調査で見る利用フロー

```text
CLI:
  gh pr view --json statusCheckRollup
  gh run list --branch <branch>
  gh run view <run-id> --log-failed
  grep / jq / sedで絞り込み

Browser:
  PR pageを開く -> Checksを探す -> failing checkを開く
  log UIで検索 -> tabや表示状態を調整

MCP:
  github.get_pull_request(number)
  github.list_check_runs(ref)
  github.get_failed_check_log(run_id, max_lines=200)
```

MCPの価値は、サービス側が「agentに必要な粒度」でtoolを切れること。

---

<!--
_class: compact ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## Q. MCPが向かない場面は？

- local build/test、package scripts、任意shell調査
- UIの見た目、layout、accessibility、performance確認
- 一度だけのadhoc作業でserver化する価値が薄いもの
- 信頼できるMCP serverがないサービス
- 広すぎる権限や雑なdescriptionで、agent-safeではないserver

MCPは万能ではない。**反復的なservice/data/action境界**を標準化するもの。

---

<!--
_class: dense ch02
-->

<p class="chapter-label">02 / 比較と判断軸</p>

## サービス提供者視点のMCP

| 提供面 | 主な利用者 | agent適性 | provider control |
|---|---|---|---|
| Browser UI | 人間 | 低-中 | 見た目は制御、machine契約は弱い |
| CLI | 開発者/運用者 | 中 | 便利だが出力・権限が広がりやすい |
| REST/OpenAPI | アプリ | 中-高 | 契約は強いがagent用説明が不足しがち |
| MCP | AI client/agent | 高 | scope、audit、consent、output capを設計できる |

provider視点では、MCPは「agent向けproduct surface」。

---

<!--
_class: section ch03
-->

<p class="kicker">Chapter 03</p>

# MCP server構築

既存APIをagent向けadapterにする

---

<!--
_class: compact ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## 既存APIをMCP化する基本設計

API本体を書き換えず、adapter layerを追加する。

```text
app/
  api/
    main.py              # existing FastAPI app
    routers/
      inventory.py       # operation_id, tags, response_model
  domain/
    inventory_service.py # business logic
  mcp/
    server.py            # MCP adapter
    route_policy.py      # expose / exclude policy
    descriptions.py      # model-facing descriptions
```

OpenAPIを契約として使い、MCPでは公開面を絞る。

---

<!--
_class: compact ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## 既存APIをMCP化する流れ

<img class="diagram" src="diagrams/mcp-api-adapter-flow.svg" alt="Existing API to MCP adapter flow" />

既存APIをsource of truthにし、MCP serverは公開範囲、description、schema、出力制限を担うadapterにする。

---

<!--
_class: dense ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## FastAPI + OpenAPIの実装例

```python
# app/mcp/server.py
import httpx
from fastmcp import FastMCP
from app.api.main import app as fastapi_app
from app.config import settings
from app.mcp.route_policy import route_map_fn

openapi_spec = fastapi_app.openapi()

api_client = httpx.AsyncClient(
    base_url="http://127.0.0.1:9000",
    timeout=30.0,
    headers={"Authorization": f"Bearer {settings.api_token}"},
)

mcp = FastMCP.from_openapi(
    openapi_spec=openapi_spec,
    client=api_client,
    name="Inventory MCP",
    route_map_fn=route_map_fn,
)
```

---

<!--
_class: dense ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## Q. OpenAPIをそのまま出してよい？

**A. 原則は出し過ぎない。route policyでagent-safeな面だけ公開する。**

```python
from fastmcp.server.providers.openapi import MCPType
from fastmcp.utilities.openapi import HTTPRoute

BLOCKED_TAGS = {"internal", "admin", "debug"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

def route_map_fn(route: HTTPRoute, default_type: MCPType) -> MCPType | None:
    if set(route.tags or []).intersection(BLOCKED_TAGS):
        return MCPType.EXCLUDE
    if route.path.startswith(("/admin", "/debug", "/internal")):
        return MCPType.EXCLUDE
    if route.method in WRITE_METHODS:
        return MCPType.TOOL
    if route.method == "GET" and "catalog" in (route.tags or []):
        return MCPType.RESOURCE_TEMPLATE
    return MCPType.TOOL
```

---

<!--
_class: compact ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## Q. descriptionは何を書くべき？

**A. agentが誤用しないための実行契約を書く。**

- 何をするtoolか
- いつ使うべきか、いつ使うべきでないか
- 副作用があるか
- 実行前にユーザー確認が必要か
- 必須引数の意味、IDの取得元
- 返り値の見方、失敗時の次アクション

良いdescriptionは説明文ではなく、**agentの行動制約**。

---

<!--
_class: dense ch03
-->

<p class="chapter-label">03 / MCP server構築</p>

## Q. 良いdescriptionの例は？

```python
@router.post(
    "/{item_id}/reserve",
    operation_id="reserve_inventory_item",
    summary="Reserve inventory for an item",
    description=(
        "Reserve stock for a known inventory item. "
        "This changes inventory state. Call only after the user "
        "explicitly confirms item_id, quantity, and expiration time. "
        "Use search_inventory_items first if item_id is unknown."
    ),
    response_model=ReserveResponse,
)
async def reserve_inventory_item(
    item_id: str,
    request: ReserveRequest,
) -> ReserveResponse:
    ...
```

critical ruleは先頭に置く。長すぎる説明はclient側で切られる可能性がある。

---

<!--
_class: section ch04
-->

<p class="kicker">Chapter 04</p>

# Remote MCPと複数Agent設定

Claude接続、project/user/org設定を整理する

---

<!--
_class: compact ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## ClaudeへRemote MCPを接続する全体像

Remote MCPはcloud/service側で動くMCP serverをClaude Codeなどから使う形。

```bash
claude mcp add --transport http inventory https://mcp.example.com/mcp

claude mcp add --transport http inventory https://mcp.example.com/mcp \
  --header "Authorization: Bearer $INVENTORY_MCP_TOKEN"

/mcp
claude mcp list
claude mcp get inventory
```

productionではHTTPS、OAuth/token validation、rate limit、audit logを前提にする。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## Claude Codeへの登録手順

| step | 作業 | command / check |
|---:|---|---|
| 1 | Remote MCP endpointを用意 | `https://mcp.example.com/mcp` |
| 2 | HTTP transportで登録 | `claude mcp add --transport http inventory <url>` |
| 3 | 必要ならscopeを指定 | `--scope local` / `--scope project` / `--scope user` |
| 4 | Bearer tokenならheaderを追加 | `--header "Authorization: Bearer $TOKEN"` |
| 5 | OAuthならClaude Code内で認証 | `/mcp` -> browser login |
| 6 | 接続確認 | `claude mcp list` / `claude mcp get inventory` / `/mcp` |

Teamで共有する設定は`--scope project`、個人横断利用は`--scope user`を使う。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## Q. OAuth付きRemote MCPはどう登録する？

```bash
# Dynamic Client Registrationが使える場合
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# redirect URIを事前登録するserver
claude mcp add --transport http \
  --callback-port 8080 \
  inventory https://mcp.example.com/mcp

# client id / secretを事前発行するserver
claude mcp add --transport http \
  --client-id "$MCP_CLIENT_ID" --client-secret --callback-port 8080 \
  inventory https://mcp.example.com/mcp

# 認証開始
/mcp
```

scopeを絞る場合は`.mcp.json`の`oauth.scopes`で固定する。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## Q. Claude.ai Connectorとして登録するには？

| 対象 | 手順 | 注意点 |
|---|---|---|
| Pro / Max | Claude settingsのConnectorsでRemote MCP URLを追加 | 必要ならOAuth client情報を入力 |
| Team / Enterprise | adminが組織設定でcustom connectorを追加 | memberは個別に認証して使う |
| Claude Code連携 | Claude.ai accountでloginし、`/mcp`で確認 | API key / Bedrock / Vertex認証時は表示されない場合がある |

Claude.ai connectorにする場合、Remote MCP serverはAnthropic cloud側から到達可能なHTTPS endpointである必要がある。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## 複数Agentで使う設定設計

設定を1つのJSONとして考えない。**共有する能力**と**個人の認証**を分ける。

| layer | 置くもの | 例 |
|---|---|---|
| project | teamで使うserver定義、URL、version、tool allowlist | `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json` |
| user | 個人token、OAuth login、local path、個人tool | `~/.claude.json`, user profile `mcp.json`, `~/.cursor/mcp.json` |
| org | approved server、allow/deny、audit、sandbox | `managed-mcp.json`, enterprise policy, Gateway/APIM |

共有serviceはRemote MCP。local file/Git/browserなど手元依存は`stdio`。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## Q. clientごとの設定形式は同じ？

同じではない。ここが複数Agent運用の落とし穴。

| client | project config | user config | key |
|---|---|---|---|
| Claude Code | `.mcp.json` | `~/.claude.json` | `mcpServers` |
| VS Code / Copilot | `.vscode/mcp.json` | user profile `mcp.json` | `servers` |
| Cursor | `.cursor/mcp.json` | `~/.cursor/mcp.json` | `mcpServers` |
| Codex CLI | `.codex/config.toml` | `~/.codex/config.toml` | `[mcp_servers.*]` |
| Claude.ai | connector settings | user OAuth | connector |

同名serverの上書き・precedenceもclientごとに確認する。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## 最小コマンド例

```bash
# Claude Code: project共有Remote MCP
claude mcp add --transport http inventory \
  --scope project https://mcp.example.com/mcp

# Claude Code: user横断Remote MCP
claude mcp add --transport http sentry \
  --scope user https://mcp.sentry.dev/mcp

# Claude Code: local stdio MCP
claude mcp add --transport stdio api-tools \
  --scope project -- python tools/mcp_server.py

# 状態確認
claude mcp list
claude mcp get inventory
```

OAuth付きRemote MCPは登録後に`/mcp`でbrowser loginする。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## 最小設定ファイル例

Claude Code / Cursor: `mcpServers`

```json
{
  "mcpServers": {
    "inventory": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

VS Code / Copilot: `servers`

```json
{
  "servers": {
    "inventory": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

違いは小さいが、keyを間違えるとclientが読み込まない。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## Microsoft APMで複数Agent設定をまとめる

APM = Agent Package Manager。MCP clientではなく、複数Agent向けの依存管理。

```yaml
name: internal-agent-context
dependencies:
  mcp:
    - io.github.github/github-mcp-server
    - io.github.microsoft/playwright-mcp
    - name: inventory
      registry: false
      transport: http
      url: https://mcp.example.com/mcp
```

`apm install`がClaude Code、VS Code、Cursor、Codexなどのruntime別configを書き分ける。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## VS Code / Copilotの設定例

```json
{
  "inputs": [
    { "type": "promptString", "id": "token", "password": true }
  ],
  "servers": {
    "inventory": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${input:token}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "sandboxEnabled": true
    }
  }
}
```

VS Codeは`mcpServers`ではなく`servers`。workspace/user/profile/devcontainerを使い分ける。

---

<!--
_class: dense ch04
-->

<p class="chapter-label">04 / Remote MCPと複数Agent設定</p>

## 組織管理の選択肢

| 方法 | 向く場面 | 注意 |
|---|---|---|
| Claude Code `managed-mcp.json` | 固定server set / MCP無効化 | secretを入れない |
| allowlist / denylist | approved catalog | nameだけでなくURL/commandで制御 |
| VS Code policy / sandbox | Copilot利用の統制 | Windowsではsandbox不可 |
| AWS AgentCore Gateway | AWS/社内toolのOAuth/OIDC連携 | Gateway policy/auditが中心 |
| Azure API Management | REST APIをRemote MCP化 | tools中心。resources/promptsは制約あり |

個別端末の設定ではなく、Remote endpointとpolicyを中心に設計する。

---

<!--
_class: section ch05
-->

<p class="kicker">Chapter 05</p>

# Protocol / Auth / JSON-RPC

接続フローとtool callの中身を見る

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## Q. MCP仕様は誰が管理している？

MCP自体はIETF RFCではない。公式仕様とschemaがsource of truth。

| 項目 | 位置づけ |
|---|---|
| MCP spec | `modelcontextprotocol.io`とGitHubの公式spec/schema |
| Governance | LF Projects / Agentic AI Foundation配下、MCP Steering Group |
| 仕様変更 | SEP、Working Group、Maintainer review |
| Message envelope | JSON-RPC 2.0 |
| Auth/OIDC | RFC 9728、RFC 8414、RFC 8707、PKCE、OIDC Discovery |
| 要件表現 | RFC 2119 / RFC 8174の`MUST`/`SHOULD` |

言い方: **MCPはLF/AAIF配下のopen protocol。RFC群は主にauth/securityで参照される。**

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## 接続protocolの選び方

| transport | 向く用途 | 接続フロー |
|---|---|---|
| stdio | local filesystem、git、script、developer-only tool | hostがserver process起動 -> stdin/stdoutでJSON-RPC |
| Streamable HTTP | remote service、team共有、SaaS、社内API | clientがHTTPS endpointへPOST/GET -> session/authで継続 |
| HTTP+SSE | 旧remote互換 | 新規では避け、HTTPへ移行 |
| WebSocket/custom | push-heavy、特殊要件 | client/server対応が前提 |

MCP message自体はJSON-RPC。transportはその運び方。

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## Remote MCPの接続フロー

<img class="diagram" src="diagrams/mcp-remote-auth-flow.svg" alt="Remote MCP OAuth connection flow" />

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## Remote MCPの実装時チェック

| step | client / server interaction | 実装上の要点 |
|---:|---|---|
| 1 | client -> server: `initialize` | protocol version、capability negotiation |
| 2 | server -> client: `InitializeResult` | `MCP-Session-Id`を返す場合がある |
| 3 | client -> server: `tools/list` | tool schemaとdescriptionを取得 |
| 4 | client -> server: `tools/call` | session header、auth header、input validation |
| 5 | server -> backend | token/scope検証、domain API実行 |
| 6 | server -> client | structured result、error、resource link |

Streamable HTTPではsession、protocol version header、Origin validation、authが運用上の要点。

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## 認証方法の現在地

| 方法 | 向く用途 | 注意 |
|---|---|---|
| stdio + env credentials | local developer tool | local process権限を持つ |
| Bearer token | controlled internal server | audience/scope検証が必要 |
| OAuth 2.1 + PKCE | user delegated Remote MCP | browser login、consent、token rotation |
| Dynamic Client Registration | unknown client接続 | server側policyが必要 |
| Protected Resource Metadata | auth server discovery | `WWW-Authenticate` / metadata整備 |
| Resource Indicators | token audience binding | token replayを防ぐ |
| OBO / token exchange | Gateway経由のdownstream API | token passthroughを避ける |

重要: MCP serverは受け取ったtokenを下流APIへそのまま渡さない。

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## JSON-RPCで流れるmessage

MCP messageはJSON-RPC 2.0 envelopeで流れる。

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{...}}
```

- `method`: `initialize`, `tools/list`, `tools/call`など
- `params`: methodごとの入力
- `id`: request/response対応。ない場合はnotification
- `result` / `error`: 成功応答またはprotocol error

LLMが直接APIを叩くのではなく、hostがtool callをMCP JSON-RPCへ変換する。

---

<!--
_class: dense ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## `tools/list`が作るmodel向け文脈

```json
{
  "name": "inventory.search_items",
  "description": "Search inventory by keyword. Use before reserving stock when SKU is unknown.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"},
      "limit": {"type": "integer", "minimum": 1, "maximum": 20}
    },
    "required": ["query"]
  }
}
```

- `name`: modelが選ぶtool ID
- `description`: いつ使うか、制約、返すもの
- `inputSchema`: argumentsを生成する型情報
- `outputSchema` / `structuredContent`: 返り値を後続処理しやすくする

descriptionはドキュメントではなく、**model input token**。

---

<!--
_class: compact ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## Q. tool callのテキストはどう生成される？

**A. MCP serverではなく、hostがLLMへtool定義を渡し、LLMがtool_use/tool_callを生成する。**

```text
MCP server: tools/list -> tool metadata
Host/client: providerのtools/function schemaへ変換
LLM: user prompt + system prompt + tool definitionsからtool callを生成
Host/client: tool callをMCP tools/callへ変換
MCP server: backend APIを実行してresultを返す
```

公開情報では、Anthropicはtool定義からspecial system promptを構築すると説明している。
OpenAI/Geminiもtool/function schemaをmodel inputとして渡し、実行はapplication側が担う。

---

<!--
_class: compact ch05
-->

<p class="chapter-label">05 / Protocol / Auth / JSON-RPC</p>

## Q. MCP用にLLMをfine-tuningする必要がある？

**A. 通常は不要。まずtool surfaceを設計する。**

- MCP接続に必要なのはmodel専用trainingではなく、host/client/serverのprotocol実装
- modelはtool/function calling能力で`name + arguments`を生成する
- 開発者が最初に調整すべきもの:
  - tool名
  - description
  - input/output schema
  - result size
  - error message
- 公開情報ではfunction calling向けfine-tuning例はあるが、MCP専用fine-tuning要件ではない

大量・類似・複雑なtoolで精度が足りない場合に、tool-use evalやfine-tuningを検討する。

---

<!--
_class: section ch06
-->

<p class="kicker">Chapter 06</p>

# AWSケーススタディ

Remote MCPをGateway/Identityで運用する

---

<!--
_class: compact ch06
-->

<p class="chapter-label">06 / AWSケーススタディ</p>

## AWS MCP / AgentCoreの位置づけ

AWS MCP ServerはGA済みのAWS公式MCP入口として、AWS API/knowledge/architecture guidanceをagentに接続する。

- AWSサービス操作やknowledge lookupをagent workflowへ入れやすい
- IAM、region、profile、least privilegeの設計が重要
- 個人開発ではlocal config、組織ではapproved server + policyで管理する
- Agent Toolkit for AWSではskillsやMCP serverを組み合わせて開発体験を作れる

AWS系は権限が強いので、read-onlyから始め、write系は承認を必須にする。

---

<!--
_class: compact ch06
-->

<p class="chapter-label">06 / AWSケーススタディ</p>

## AWSでRemote MCPを構築する構成

**A. AgentCore GatewayをRemote MCP入口にし、既存API/Lambda/MCP serverをtargetとして束ねる。**

```text
Claude / Codex / Agent
  -> AgentCore Gateway (MCP endpoint)
  -> targets: OpenAPI API / Lambda / MCP server / Smithy / API Gateway
  -> backend: AWS services / SaaS / internal APIs
```

- Gatewayは単一MCP endpointとtool catalogを提供する
- OpenAPIやLambdaをMCP-compatible toolsへ変換できる
- 複数targetを統合したvirtual MCP serverとして見せられる
- semantic tool searchで大きなtool catalogを扱いやすくする

---

<!--
_class: dense ch06
-->

<p class="chapter-label">06 / AWSケーススタディ</p>

## GatewayとIdentityが補うもの

| 要素 | 役割 | MCPとの関係 |
|---|---|---|
| AgentCore Gateway | MCP endpoint、tool aggregation、target routing | `tools/list` / `tools/call`の入口 |
| Gateway inbound auth | agent/clientがGatewayへ入る認証 | OAuth JWT、IAM SigV4、authenticate-onlyなど |
| Gateway outbound auth | Gatewayがtargetへ出る認証 | IAM、OAuth、API key、token passthroughなど |
| AgentCore Identity | OAuth provider、token vault、workload identity | 2LO/3LO/OBO tokenを管理 |
| OBO token exchange | inbound user tokenをdownstream向けtokenへ交換 | user + agent identityを維持した委任 |

GatewayはMCP transportだけでなく、認証・認可・credential管理の運用面を補う。

---

<!--
_class: dense ch06
-->

<p class="chapter-label">06 / AWSケーススタディ</p>

## AgentCore Gatewayでの構築フロー

| step | 設計/作業 | 実装上の判断 |
|---:|---|---|
| 1 | toolを定義 | OpenAPI、Lambda schema、既存MCP server |
| 2 | Gatewayを作成 | inbound auth: OAuth JWT / IAM / none for dev |
| 3 | targetを追加 | OpenAPI、Lambda、MCP server、API Gateway、Smithy |
| 4 | outbound authを設定 | IAM SigV4、OAuth 2LO/3LO/OBO、API key |
| 5 | capability sync | `SynchronizeGatewayTargets`でtool catalog更新 |
| 6 | client接続 | Claude CodeなどからGateway MCP URLを登録 |
| 7 | 運用 | CloudTrail、CloudWatch、least privilege、policy |

既存FastAPIならOpenAPI target、独自処理ならLambda target、既存MCPならMCP server targetが自然。

---

<!--
_class: section ch07
-->

<p class="kicker">Chapter 07</p>

# 開発ワークフローで使うMCP

Frontend操作、ブラウザMCP、Serenaを位置づける

---

<!--
_class: compact ch07
-->

<p class="chapter-label">07 / 開発ワークフローで使うMCP</p>

## Q. WebMCPはMCPの代わり？

**A. 代替ではない。frontend/live tab向けの補完。**

- MCP: backend/service layer。永続server、どのplatformからでも使う
- WebMCP: web pageがbrowser agentへ能力を宣言する仕組み
- Browser操作MCP: PlaywrightやChrome DevToolsをagentから使う開発用bridge

設計としては、**backendはMCP、frontendはWebMCP、検証はbrowser MCP**が整理しやすい。

---

<!--
_class: compact ch07
-->

<p class="chapter-label">07 / 開発ワークフローで使うMCP</p>

## Frontend操作に効くMCP

- Playwright MCP
  - live browser操作、E2E生成、UI再現、フォーム操作
  - appが動いている状態でagentに試行させる
- Chrome DevTools MCP
  - console、network、performance、screenshot、Lighthouse
  - Chrome DevTools Protocol由来の調査に強い
  - WebMCP debugging toolsも扱える

どちらも「ブラウザ操作をMCP tool化する」ので、通常の手動UI操作より再現性を上げやすい。

---

<!--
_class: dense rank ch07
-->

<p class="chapter-label">07 / 開発ワークフローで使うMCP</p>

## 開発向けMCPの優先候補

GitHub starsの目安。人気は変動するため、導入判断はofficial性、権限、保守状況も見る。

| MCP / repo | stars | 開発で効く場面 |
|---|---:|---|
| Firecrawl MCP | 129,670 | web research、crawl、extract |
| modelcontextprotocol/servers | 86,854 | reference/community servers |
| Context7 | 56,904 | latest library docs |
| Chrome DevTools MCP | 43,030 | frontend debug |
| Playwright MCP | 33,574 | browser automation |
| GitHub MCP | 30,495 | issue、PR、repo workflow |
| Serena | 25,036 | codebase理解、symbolic editing |
| AWS MCP servers | 9,224 | AWS操作と知識 |

---

<!--
_class: compact ch07
-->

<p class="chapter-label">07 / 開発ワークフローで使うMCP</p>

## Q. Serena MCPはなぜ効く？

**A. コードを全部読ませず、symbol単位で探索・編集できるから。**

- symbol overviewで構造を把握する
- 必要な関数・classだけ読む
- referencesを追って影響範囲を確認する
- file全体貼り付けよりcontext効率が良い
- large repoで「読む量」を制御しやすい

MCPの価値は外部APIだけではない。local code understandingにも効く。

---

<!--
_class: section ch08
-->

<p class="kicker">Chapter 08</p>

# ガバナンスと導入

争点、ロードマップ、社内展開へ広げる

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## MCPの現在地

| 観点 | 現在地 |
|---|---|
| 起点 | 2024-11にAnthropicがopen standardとして公開 |
| 標準化 | AAIF / Linux Foundation配下のmulti-vendor open protocolへ移行 |
| 採用 | Claude、OpenAI、Microsoft、Google、Salesforce、AWSなどが対応を拡大 |
| 主戦場 | local developer toolからRemote MCP / enterprise connectorへ |
| 未成熟 | auth実装、server trust、registry vetting、audit、large tool catalog |

いまのMCPは「便利な開発者plugin」から、**agentic systemの接続インフラ**へ移りつつある。

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 論争の歴史

<img class="diagram" src="diagrams/mcp-trust-roadmap.svg" alt="MCP trust and roadmap flow" />

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 論争の歴史から見る現在地

| 時期 | 論点 | 意味 |
|---|---|---|
| 2024-11 | custom connector地獄を解くopen protocol | MCPの価値が明確になった |
| 2025前半 | stdio/local MCPが急増 | local権限とsupply chainが争点化 |
| 2025-04 | tool poisoning / line jumping | tool descriptionも攻撃面だと認識された |
| 2025後半 | Remote MCP / OAuth / registry | production運用の問題へ移った |
| 2025-12 | AAIF/LFへ寄贈 | vendor-neutralityの論点に回答 |
| 2026 | NSA/OWASP/研究者がsecurity guidance | 導入前提だが、統制必須という現在地 |

結論: **MCPは失敗したprotocolではなく、急成長でtrust設計が追いついていないprotocol。**

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 今後の争点

| 争点 | 問い |
|---|---|
| server trust | そのserver/toolは本当に信頼できるか |
| tool metadata | descriptionに隠れた指示をどう検知するか |
| auth boundary | user / host / client / server / backendの誰に権限があるか |
| registry | public MCP serverを誰が審査するか |
| stdio | local MCPを「任意コード実行」として扱えているか |
| large catalog | 数千toolからどう選ばせるか |
| UI / Apps | tool結果がinteractive UIになると何をsandboxするか |
| audit | agentが何を見て何を実行したか追えるか |

争点はprotocol syntaxではなく、**trust boundaryと運用責任**。

---

<!--
_class: compact ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 開発者以外への広がり

- Sales / CRM
  - AI assistantからaccount history、opportunity、case activityを取得
- Finance
  - FactSet、MSCI、LSEG、S&P Global、NetSuiteなどの業務dataへ接続
- Customer support
  - ticket、order、CRM、knowledge baseを横断して回答/更新
- Enterprise knowledge
  - Gmail、Calendar、Drive、SharePoint、Teams、Dropbox、社内docs
- Operations / Analytics
  - dashboard生成、AR trend分析、inventory logging、incident summary

MCPは「開発者が便利に使うもの」から、**業務AIの接続面**へ広がっている。

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 公式ロードマップの読み方

| 優先領域 | 何が変わるか |
|---|---|
| Transport scalability | Streamable HTTP、session、resumption、server card |
| Agent communication | tasks、retry、expiry、long-running operation |
| Governance maturation | WG/IG、SEP、contributor ladder、delegation |
| Enterprise readiness | audit、observability、SSO、gateway/proxy、config portability |
| Security/Auth | least privilege、OAuth mix-up対策、credential管理、vuln disclosure |
| Extensions | MCP Apps、auth extensions、skills-like composed capability |
| Validation | conformance tests、SDK tiers、reference implementations |

ロードマップは約束ではなく、**どの論点にmaintainer capacityを寄せるか**を示す。

---

<!--
_class: compact ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## MCP server設計の重要ルール

- trusted serverだけ接続する
- read/writeを分け、writeは承認を要求する
- token passthroughを避け、audience/scopeを検証する
- tool結果はsummary + ID + paginationで返す
- huge logやfull documentをdefaultで返さない
- `search -> read detail -> act` の順にtoolを設計する
- dangerous toolは名前とdescriptionで危険性を明示する
- audit log、rate limit、timeout、cancellationを入れる

最重要は「便利にする」より「誤用しにくくする」。

---

<!--
_class: dense ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## Token-awareなMCP設計

悪い例:

```text
call_api(method, path, body) -> raw JSON / raw logを全部返す
```

良い例:

```text
search_incidents(query, severity, limit) -> summary + incident_id
get_incident_detail(incident_id, fields) -> bounded structured detail
summarize_incident(incident_id) -> agent-ready summary
create_incident_update(incident_id, body) -> write with confirmation
```

agentに必要なのは「全データ」ではなく「次の判断に十分な最小context」。

---

<!--
_class: compact ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## 社内導入の進め方

1. まずread-only MCPを作る
2. OpenAPIからcandidate toolを生成する
3. route policyで公開面を絞る
4. descriptionとschemaをagent向けに整える
5. Claude/Codex/Cursorで実タスク検証する
6. output cap、audit、rate limit、authを入れる
7. write toolは承認とscopeを分けて追加する

最初から巨大serverを作らず、1つの業務フローを安定化させる。

---

<!--
_class: compact ch08
-->

<p class="chapter-label">08 / ガバナンスと導入</p>

## まとめ: MCPで覚えること

MCPが使える場合にMCPを優先する理由:

- token効率: tool search、schema、bounded resultでcontextを減らせる
- 安定性: CLI flagsやUI推測ではなくdeclared capabilityを呼べる
- セキュリティ: auth、scope、approval、auditをserver/host境界で扱える
- provider効果: agent向けの安全なproduct surfaceを設計できる
- 開発効果: API、frontend、cloud、repo理解を同じagent workflowへ統合できる

**MCPはagent時代のintegration layer。**

---

<!--
_class: section ch09
-->

<p class="kicker">Chapter 09</p>

# References

仕様、実装、セキュリティ、運用の参照元

---

<!--
_class: dense ch09
-->

<p class="chapter-label">09 / References</p>

## 主な参照 1

- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-11-25
- MCP transports: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- MCP tools: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- FastMCP OpenAPI docs: https://gofastmcp.com/servers/openapi
- Chrome WebMCP comparison: https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja

---

<!--
_class: dense ch09
-->

<p class="chapter-label">09 / References</p>

## 主な参照 2

- AWS MCP Server GA: https://aws.amazon.com/blogs/aws/the-aws-mcp-server-is-now-generally-available/
- AgentCore Gateway concepts: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-core-concepts.html
- AgentCore Gateway MCP targets: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html
- AgentCore Identity OBO: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Chrome DevTools MCP: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Serena: https://github.com/oraios/serena

---

<!--
_class: dense ch09
-->

<p class="chapter-label">09 / References</p>

## 主な参照 3

- JSON-RPC 2.0 specification: https://www.jsonrpc.org/specification
- MCP lifecycle: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
- MCP sampling: https://modelcontextprotocol.io/specification/2025-11-25/client/sampling
- Anthropic tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Anthropic define tools: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- OpenAI function calling fine-tuning: https://developers.openai.com/cookbook/examples/fine_tuning_for_function_calling

---

<!--
_class: dense ch09
-->

<p class="chapter-label">09 / References</p>

## 主な参照 4

- MCP governance: https://modelcontextprotocol.io/community/governance
- MCP roadmap: https://modelcontextprotocol.io/development/roadmap
- MCP authorization: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- Anthropic MCP donation / AAIF: https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation
- Claude Code managed MCP: https://code.claude.com/docs/en/managed-mcp
- VS Code MCP servers: https://code.visualstudio.com/docs/agent-customization/mcp-servers
- VS Code MCP config reference: https://code.visualstudio.com/docs/agents/reference/mcp-configuration
- Cursor MCP: https://docs.cursor.com/context/model-context-protocol
- Microsoft APM: https://microsoft.github.io/apm/

---

<!--
_class: dense ch09
-->

<p class="chapter-label">09 / References</p>

## 主な参照 5

- NSA MCP security guidance: https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf
- Trail of Bits line jumping: https://blog.trailofbits.com/2025/04/21/jumping-the-line-how-mcp-servers-can-attack-you-before-you-ever-use-them/
- Semgrep MCP security guide: https://semgrep.dev/blog/2025/a-security-engineers-guide-to-mcp
- OpenAI MCP connectors: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- Microsoft Copilot Studio MCP GA: https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/model-context-protocol-mcp-is-now-generally-available-in-microsoft-copilot-studio/
- Salesforce Hosted MCP Servers GA: https://developer.salesforce.com/blogs/2026/04/salesforce-hosted-mcp-servers-are-now-generally-available
