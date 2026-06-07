---
marp: true
theme: mcp-modern
paginate: true
size: 16:9
title: MCPを開発現場でどう使うべきか
navTitle: MCP internal presentation
description: 社内発表向けMCP Q&A、JSON-RPC payload、CLI/ブラウザ比較、MCPサーバー構築、Remote MCP、開発向けMCP調査
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
_class: compact
-->

## Q. 結局MCPは何を解決するのか？

**A. AIエージェントが外部システムを安全に使うための標準インターフェースを作る。**

- 外部システム: GitHub、AWS、Sentry、DB、社内API、ブラウザ、Docs
- できること: context取得、tool実行、workflowの再利用
- 重要点: tool名、description、schema、auth、transport、approvalをプロトコルで扱う

MCPは「AIに便利ツールを足す」ではなく、**agent-nativeなAPI境界**。

---

<!--
_class: compact
-->

## Q. CLI、ブラウザ操作、MCPは何が違う？

| 方式 | agentが見るもの | 強い場面 | 弱い場面 |
|---|---|---|---|
| CLI | command + stdout/stderr | local test、build、git、devops | flags/env/output量に依存 |
| Browser | UI、DOM、screenshot、DevTools | visual QA、live UI、session依存 | layout/selector/loadingに依存 |
| MCP | tool/resource schema + structured result | repeatableなAPI/data/action | server設計と運用が必要 |

判断軸は「人間向けインターフェースか、agent向け契約か」。

---

<!--
_class: compact
-->

## Q. CLIで叩けばよくない？

**A. CLIは今でも強い。ただしagentには余計な推測と出力が多い。**

- command syntax、flags、profile、region、envをagentが推測する
- stdout/stderrは人間向けで、ログやstack traceが巨大になりやすい
- エラー原因の切り分けに追加commandが増える
- 出力を絞るには`jq`、`grep`、`--json`などを毎回設計する必要がある

CLIはlocal executionに最適。外部サービスの反復操作はMCPの方が安定しやすい。

---

<!--
_class: compact
-->

## Q. ブラウザ操作で十分では？

**A. UIそのものを見るなら必須。データ取得や操作の主経路にすると不安定。**

- page遷移、modal、loading、viewport、selector変更に弱い
- screenshotやaccessibility treeはcontextを消費しやすい
- UIから意図を推測するため、操作ミスや待機ミスが起きやすい
- ただしvisual QA、console/network、performance、実ブラウザ再現には強い

ブラウザ操作は「UIの検証」、MCPは「宣言された機能の実行」と分ける。

---

<!--
_class: dense
-->

## Q. トークン数は何が違う？

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
_class: compact
-->

## Q. なぜMCPだとフローが安定する？

**A. agentが低レベル操作を推測せず、宣言済みcapabilityを呼べるから。**

- `tools/list`: 何ができるかを発見する
- `inputSchema`: 必要な引数と型がわかる
- `description`: いつ使うべきか、制約は何かがわかる
- `structuredContent`: 返り値を機械的に扱える
- host UI: sensitive tool callを承認フローに載せられる

「画面を見て推測」や「CLI flagsを思い出す」から「定義済みtoolを呼ぶ」へ移る。

---

<!--
_class: dense
-->

## Q. 同じCI調査だとどう違う？

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
_class: compact
-->

## Q. MCPが向かない場面は？

- local build/test、package scripts、任意shell調査
- UIの見た目、layout、accessibility、performance確認
- 一度だけのadhoc作業でserver化する価値が薄いもの
- 信頼できるMCP serverがないサービス
- 広すぎる権限や雑なdescriptionで、agent-safeではないserver

MCPは万能ではない。**反復的なservice/data/action境界**を標準化するもの。

---

<!--
_class: dense
-->

## Q. サービス提供者は何を出すべき？

| 提供面 | 主な利用者 | agent適性 | provider control |
|---|---|---|---|
| Browser UI | 人間 | 低-中 | 見た目は制御、machine契約は弱い |
| CLI | 開発者/運用者 | 中 | 便利だが出力・権限が広がりやすい |
| REST/OpenAPI | アプリ | 中-高 | 契約は強いがagent用説明が不足しがち |
| MCP | AI client/agent | 高 | scope、audit、consent、output capを設計できる |

provider視点では、MCPは「agent向けproduct surface」。

---

<!--
_class: compact
-->

## Q. 既存APIはどうMCP化する？

**A. API本体を書き換えず、adapter layerを追加する。**

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
_class: dense
-->

## Q. FastAPI + OpenAPIなら実装は？

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
_class: dense
-->

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
_class: compact
-->

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
_class: dense
-->

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
_class: compact
-->

## Q. Remote MCPとしてClaudeにつなぐには？

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
_class: dense
-->

## Q. Claude Codeへの登録手順は？

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
_class: dense
-->

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
_class: dense
-->

## Q. Claude.ai Connectorとして登録するには？

| 対象 | 手順 | 注意点 |
|---|---|---|
| Pro / Max | Claude settingsのConnectorsでRemote MCP URLを追加 | 必要ならOAuth client情報を入力 |
| Team / Enterprise | adminが組織設定でcustom connectorを追加 | memberは個別に認証して使う |
| Claude Code連携 | Claude.ai accountでloginし、`/mcp`で確認 | API key / Bedrock / Vertex認証時は表示されない場合がある |

Claude.ai connectorにする場合、Remote MCP serverはAnthropic cloud側から到達可能なHTTPS endpointである必要がある。

---

<!--
_class: dense
-->

## Q. 複数AgentでMCP設定はどう書く？

設定を1つのJSONとして考えない。**共有する能力**と**個人の認証**を分ける。

| layer | 置くもの | 例 |
|---|---|---|
| project | teamで使うserver定義、URL、version、tool allowlist | `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json` |
| user | 個人token、OAuth login、local path、個人tool | `~/.claude.json`, user profile `mcp.json`, `~/.cursor/mcp.json` |
| org | approved server、allow/deny、audit、sandbox | `managed-mcp.json`, enterprise policy, Gateway/APIM |

共有serviceはRemote MCP。local file/Git/browserなど手元依存は`stdio`。

---

<!--
_class: dense
-->

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
_class: dense
-->

## Q. Microsoft APMは何に使える？

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
_class: dense
-->

## Q. VS Code / Copilotではどう設定する？

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
_class: dense
-->

## Q. 組織でMCPを管理するには？

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
_class: dense
-->

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
_class: dense
-->

## Q. stdioとStreamable HTTPはどう選ぶ？

| transport | 向く用途 | 接続フロー |
|---|---|---|
| stdio | local filesystem、git、script、developer-only tool | hostがserver process起動 -> stdin/stdoutでJSON-RPC |
| Streamable HTTP | remote service、team共有、SaaS、社内API | clientがHTTPS endpointへPOST/GET -> session/authで継続 |
| HTTP+SSE | 旧remote互換 | 新規では避け、HTTPへ移行 |
| WebSocket/custom | push-heavy、特殊要件 | client/server対応が前提 |

MCP message自体はJSON-RPC。transportはその運び方。

---

<!--
_class: dense
-->

## Q. Remote MCPの接続フローは？

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
_class: dense
-->

## Q. JSON-RPCでは実際に何が流れる？

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
_class: dense
-->

## Q. tools/listでモデルに渡る情報は？

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
_class: compact
-->

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
_class: compact
-->

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
_class: compact
-->

## Q. WebMCPはMCPの代わり？

**A. 代替ではない。frontend/live tab向けの補完。**

- MCP: backend/service layer。永続server、どのplatformからでも使う
- WebMCP: web pageがbrowser agentへ能力を宣言する仕組み
- Browser操作MCP: PlaywrightやChrome DevToolsをagentから使う開発用bridge

設計としては、**backendはMCP、frontendはWebMCP、検証はbrowser MCP**が整理しやすい。

---

<!--
_class: compact
-->

## Q. Playwright MCPとChrome DevTools MCPは何に効く？

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
_class: compact
-->

## Q. AWS MCPは何が違う？

AWS MCP ServerはGA済みのAWS公式MCP入口として、AWS API/knowledge/architecture guidanceをagentに接続する。

- AWSサービス操作やknowledge lookupをagent workflowへ入れやすい
- IAM、region、profile、least privilegeの設計が重要
- 個人開発ではlocal config、組織ではapproved server + policyで管理する
- Agent Toolkit for AWSではskillsやMCP serverを組み合わせて開発体験を作れる

AWS系は権限が強いので、read-onlyから始め、write系は承認を必須にする。

---

<!--
_class: compact
-->

## Q. AWSでRemote MCPを構築するなら？

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
_class: dense
-->

## Q. GatewayとIdentityは何を補う？

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
_class: dense
-->

## Q. AgentCoreでの構築フローは？

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
_class: dense rank
-->

## Q. 開発向けMCPは何から見る？

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
_class: compact
-->

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
_class: compact
-->

## Q. MCP server設計で守るルールは？

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
_class: dense
-->

## Q. token-awareなMCP設計とは？

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
_class: compact
-->

## Q. 社内導入はどう進める？

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
_class: compact
-->

## Q. 最終的に何を覚えるべき？

MCPが使える場合にMCPを優先する理由:

- token効率: tool search、schema、bounded resultでcontextを減らせる
- 安定性: CLI flagsやUI推測ではなくdeclared capabilityを呼べる
- セキュリティ: auth、scope、approval、auditをserver/host境界で扱える
- provider効果: agent向けの安全なproduct surfaceを設計できる
- 開発効果: API、frontend、cloud、repo理解を同じagent workflowへ統合できる

**MCPはagent時代のintegration layer。**

---

<!--
_class: dense
-->

## 主な参照 1

- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-11-25
- MCP transports: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- MCP tools: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- FastMCP OpenAPI docs: https://gofastmcp.com/servers/openapi
- Chrome WebMCP comparison: https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja

---

<!--
_class: dense
-->

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
_class: dense
-->

## 主な参照 3

- JSON-RPC 2.0 specification: https://www.jsonrpc.org/specification
- MCP lifecycle: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
- MCP sampling: https://modelcontextprotocol.io/specification/2025-11-25/client/sampling
- Anthropic tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Anthropic define tools: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- OpenAI function calling fine-tuning: https://developers.openai.com/cookbook/examples/fine_tuning_for_function_calling

---

<!--
_class: dense
-->

## 主な参照 4

- MCP governance: https://modelcontextprotocol.io/community/governance
- Anthropic MCP donation / AAIF: https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation
- Claude Code managed MCP: https://code.claude.com/docs/en/managed-mcp
- VS Code MCP servers: https://code.visualstudio.com/docs/agent-customization/mcp-servers
- VS Code MCP config reference: https://code.visualstudio.com/docs/agents/reference/mcp-configuration
- Cursor MCP: https://docs.cursor.com/context/model-context-protocol
- Microsoft APM: https://microsoft.github.io/apm/
