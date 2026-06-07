# MCP internal presentation research notes

Date: 2026-06-07

## Research stance

This is a technical specification review plus ecosystem survey, not a formal academic literature review. Primary sources were prioritized:

- MCP official docs/specification: https://modelcontextprotocol.io/
- Anthropic launch post: https://www.anthropic.com/news/model-context-protocol
- OpenAI API docs for remote MCP/connectors: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- GitHub MCP docs/repo: https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/use-the-github-mcp-server and https://github.com/github/github-mcp-server
- Stripe MCP docs: https://docs.stripe.com/mcp
- MCP reference servers/registry: https://github.com/modelcontextprotocol/servers and https://github.com/modelcontextprotocol/registry
- MCP build server/client guides: https://modelcontextprotocol.io/docs/develop/build-server and https://modelcontextprotocol.io/docs/develop/build-client
- FastMCP documentation: https://github.com/jlowin/fastmcp
- FastAPI OpenAPI documentation: https://fastapi.tiangolo.com/how-to/extending-openapi/
- Claude Remote MCP / custom connectors: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp and https://code.claude.com/docs/en/mcp
- Chrome WebMCP comparison: https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Chrome DevTools MCP: https://github.com/ChromeDevTools/chrome-devtools-mcp
- AWS MCP Server GA / Agent Toolkit: https://aws.amazon.com/blogs/aws/the-aws-mcp-server-is-now-generally-available/ and https://aws.amazon.com/products/developer-tools/agent-toolkit-for-aws/
- GitHub repository star counts: fetched via GitHub REST API on 2026-06-07.

## Expanded beginner-friendly notes, 2026-06-07

This section is the beginner-oriented source material for the final talk. It intentionally explains the concepts underneath MCP before moving into implementation details.

### 1. MCPが解こうとしている問題

LLMは文章を読む・書く・推論する能力を持つが、そのままでは社内システム、GitHub、AWS、ブラウザ、DB、SaaSの「現在の状態」を知らない。モデルの学習時点より後に生まれたAPIや社内仕様も知らない。人間が毎回ログ、Issue、API仕様、画面状態をコピーして貼ると、遅い、漏れる、権限管理が曖昧になる、再現性が低い。

MCPはこの問題を「AIアプリと外部システムをつなぐ標準プロトコル」として解く。各AIアプリがGitHub連携、Slack連携、AWS連携、社内API連携を個別に実装するのではなく、AIアプリ側はMCP clientを実装し、各システム側はMCP serverを実装する。これにより、同じMCP serverをClaude、Codex、Cursor、VS Code系ツールなど複数のhostから使える。

初心者向けの要点:

- MCPはAIモデルそのものではない。
- MCPはAPIそのものでもない。
- MCPは「AIが外部の文脈を読み、必要な操作を安全に呼び出すための接続規約」。
- 既存APIをMCP化すると、モデルはAPI仕様を推測せず、名前・説明・入力schema付きのtoolとして呼び出せる。

### 2. MCPの位置づけ: tool calling、OpenAPI、API Gatewayとの違い

MCPはFunction CallingやTool Callingの代替ではない。Function Callingは「モデルが関数呼び出し形式の出力を返せる」モデル/アプリ内の仕組み。MCPは「その関数群をどこから発見し、どう実行し、どう権限・transport・session・metadataを扱うか」を標準化する仕組み。

OpenAPIはHTTP APIの契約を記述する仕様。MCPはAI clientに対してResources、Tools、Promptsを提供するプロトコル。OpenAPIはMCP serverを作るための良い入力になり得るが、OpenAPIをそのまま全部MCP公開するのは危険。admin、internal、write系endpointは、AIが呼んでよい操作かを別途判断する必要がある。

API Gatewayは人間/アプリケーション向けAPIの入口。MCP serverはAI agent向けの入口。両者は役割が異なる。実運用では、既存API Gatewayの後ろにあるAPIをMCP adapterから呼び出す構成がわかりやすい。

| 仕組み | 主な役割 | MCPとの関係 |
|---|---|---|
| Function Calling | モデルが関数呼び出しを表現する | MCP tool呼び出しの内側で使われることがある |
| OpenAPI | HTTP APIの契約 | MCP server生成の入力になる |
| API Gateway | APIの入口、認証、rate limit | MCP adapterが既存APIを呼ぶ入口になり得る |
| MCP | AI clientと外部tool/contextの接続規約 | 発見、schema、実行、transport、auth、sessionを扱う |

### 3. Host、Client、Serverを誰が担うか

MCPの構成はHost、Client、Serverに分かれる。公式仕様では、Hostは複数のclientを作り、各clientが1つのserverと1対1のsessionを持つ。ServerはResources、Tools、Promptsを公開する。重要なのは、Hostがserver間の境界とユーザー承認を管理する点である。

具体例:

- Claude Desktop、Claude Code、Codex、Cursor、VS Code拡張などがHost。
- Host内でGitHub MCP用、Playwright MCP用、社内API MCP用のClientが別々に動く。
- GitHub MCP Server、Chrome DevTools MCP、社内Inventory MCPなどがServer。

この分離により、GitHub MCP serverはSlack MCP serverのデータを勝手に読めない。各serverは「自分に渡された入力」と「自分が持つ権限」の範囲でだけ動く。これは実装上の都合ではなく、MCPのセキュリティ境界である。

### 4. Resources、Tools、Promptsの違い

初心者が最初につまずくのは、ResourcesとToolsの違いである。

- Resourceは読むもの。
- Toolは実行するもの。
- Promptは作業テンプレート。

例:

| 種類 | 例 | モデルから見た意味 |
|---|---|---|
| Resource | `file:///README.md`、DB schema、issue本文、API仕様 | 判断材料として読む |
| Tool | `create_pull_request`、`search_docs`、`reserve_inventory` | 外部世界に問い合わせる、または変更する |
| Prompt | `review_pr`、`summarize_incident` | 作業の型を呼び出す |

Toolは特に強力で、外部API実行、ファイル変更、ブラウザ操作、クラウド操作、決済操作まで可能になる。だからToolは「便利な関数」ではなく「権限を持った操作」として扱う。説明文、入力schema、出力schema、承認UI、監査ログが重要になる。

### 5. Capability negotiationとは何か

MCPでは、clientとserverが接続時に「自分が何をサポートしているか」を宣言する。これがcapability negotiationである。

なぜ必要か:

- あるserverはtoolsだけを持つかもしれない。
- 別のserverはresourcesやpromptsも持つかもしれない。
- あるclientはsamplingに対応しているが、別のclientは対応していないかもしれない。
- protocol versionによって利用可能な機能が異なる。

MCPでは、接続後に「このserverはtools capabilityを宣言しているからtools/listできる」「このclientはsamplingを宣言していないからserverからLLM呼び出しを依頼してはいけない」という判断ができる。これはWeb APIでいうfeature negotiationや、LSPでのcapabilities交換に近い。

### 6. Transport: stdioとStreamable HTTP

MCPのmessageはJSON-RPC 2.0で表現される。そのmessageをどの経路で運ぶかがtransportである。

stdio:

- clientがserverプロセスをローカルで起動する。
- stdin/stdoutでJSON-RPC messageをやり取りする。
- filesystem、local git、local browser、developer toolに向く。
- stdoutはprotocol用なので、ログをstdoutに書くと壊れる。ログはstderrへ出す。

Streamable HTTP:

- serverがHTTP endpointを公開する。
- remote MCP、SaaS、社内共通server、組織管理に向く。
- 2025-03-26以降の方向性としてHTTP+SSEを置き換える標準transport。
- HTTP POST/GET、SSE streaming、session id、protocol version header、Origin validationなどを扱う。

実務上の選び方:

- 個人開発・ローカルツール: stdio。
- 社内共通・Claude custom connector・SaaS連携: Streamable HTTP。
- 旧SSE serverは残っているが、新規ならHTTPを優先する。

### 7. Authorization: なぜOAuth 2.1とaudienceが重要か

Remote MCPでは、serverが誰に何を許可するかを明確にする必要がある。MCP authorization specはOAuth 2.1をベースにしている。Protected Resource Metadata、Authorization Server Metadata / OIDC Discovery、PKCE、Resource Indicators、Client ID Metadata Documentsなどが関係する。

初心者向けに言うと、Remote MCPの認証で避けたい事故は3つ。

1. 他のサービス向けtokenをMCP serverが受け入れてしまう。
2. MCP serverが受け取ったtokenを下流APIへそのまま渡してしまう。
3. どのserver向けに発行されたtokenかを検証しない。

MCP specはtoken passthroughを禁じ、Resource Indicatorsでtokenの対象resourceを明示する方向を強めている。productionのRemote MCPでは、単にBearer tokenを受け取るだけでは足りない。誰のtokenか、どのserver向けか、どのscopeか、いつ失効するか、どの操作に使えるかを検証する。

### 8. 既存APIをMCP化するときの設計原則

既存APIをMCP対応させる最短路は、API本体を書き換えることではない。APIはそのまま残し、MCP adapterを追加する。

推奨構成:

```text
FastAPI app -> OpenAPI schema -> MCP adapter -> MCP client
                         |
                         +-> route policy / description policy / auth policy
```

設計原則:

- 既存APIをsource of truthにする。
- OpenAPIをAI向け契約として整える。
- MCP adapterは公開面を絞る場所にする。
- API handlerを直接importして呼ぶより、まずはHTTP clientで既存APIを呼ぶほうが安全。
- direct service-layer callは高速だが、auth、middleware、logging、validationを再実装する必要がある。

FastMCPはOpenAPI specからMCP serverを作れる。FastMCP v2.8以降のdefault mappingは「全routeをtool化」する方向なので、productionではRouteMapで明示的に除外・allowlist化するのが重要である。admin/internal/debug endpointを除外し、write系endpointを特別扱いする。

### 9. Tool descriptionはAPI docsではなくモデル向けUIである

Tool descriptionは人間向けのAPI説明ではない。モデルが「このtoolを使うべきか」「どの入力で呼ぶべきか」「呼ぶと外部世界が変わるか」を判断するためのUIである。

良いdescriptionに含めるもの:

- このtoolが何をするか。
- いつ使うべきか。
- いつ使ってはいけないか。
- 入力の形式、単位、制約。
- read-onlyか、状態変更があるか。
- ユーザー確認が必要か。
- 返すstructured outputの形。
- 似たtoolとの使い分け。

悪いdescription:

```text
Inventory endpoint.
```

良いdescription:

```text
Reserve stock for an inventory item after explicit user confirmation.
This decreases available stock. Requires exact SKU and positive quantity.
Returns reserved quantity and remaining stock. Do not use for price quotes
or order creation.
```

descriptionに「必ず確認する」と書くだけでは不十分である。server側でもwrite操作のauth、idempotency、audit log、rate limitを実装する。

### 10. WebMCPはMCPの置き換えではない

ChromeのWebMCP docsは、WebMCPとMCPを「競合ではなく補完」と位置づけている。MCPはbackend/service layer向けで、どのplatformからでも利用できる永続的なserver。WebMCPはfrontend/live web UI向けで、ユーザーが開いているtabに紐づくエフェメラルな仕組みである。

使い分け:

- MCP: core business logic、API操作、DB検索、バックグラウンド処理、社内システム連携。
- WebMCP: ユーザーが開いているWeb画面上の操作、DOMやCookieやlive sessionに紐づく機能。
- Playwright MCP / Chrome DevTools MCP: 開発時に実際のブラウザを操作・検査するためのbridge。

WebアプリをAI agent対応にする場合、「backendはMCP」「frontendはWebMCP」「開発・検証はPlaywright MCP / Chrome DevTools MCP」という三層で考えると整理しやすい。

### 11. Claude、Codex、OpenAIでのRemote MCPの考え方

Claude Codeではremote HTTP serverが推奨され、`claude mcp add --transport http <name> <url>` で追加できる。SSEはdeprecated扱いで、可能ならHTTPを使う。stdio serverはローカルプロセスとして起動され、filesystemやlocal browserのような手元環境に強い。

Claude.ai custom connectorsではRemote MCP server URLを設定し、必要に応じてOAuth client情報を入れる。Team/Enterpriseでは管理者がconnectorを組織に追加し、メンバーが個別に接続する。Remote MCP serverはAnthropic cloud infrastructureから到達可能である必要があるため、VPN内やprivate networkだけに置いたserverはそのままでは使えない。

OpenAIのResponses APIやDeep Research系docsでもMCP connectorsが使われる。ここで重要なのは、MCPは特定vendorの閉じた機能ではなく、複数clientが採用するintegration layerになっていること。ただし、各clientのsupported transport、tool search、output limit、OAuth実装、approval UXは異なる。社内MCP serverを作るなら、公式spec準拠を軸にしつつ、主要clientごとの差分をテストする。

### 12. AWS MCP / Agent Toolkit for AWSの意味

AWS MCP Serverは2026-05-06にGAし、Agent Toolkit for AWSの中核になった。AWSの発表では、managed remote MCP serverとして、coding agentがAWSへ安全にアクセスするための小さな固定tool setを提供すると説明されている。

主なtool:

- `call_aws`: 15,000+ AWS API operationをIAM credentialsで実行。
- `search_documentation`: 最新AWS documentationを検索。
- `read_documentation`: AWS docs/best practicesを読む。
- `run_script`: sandboxed server-side Pythonで複数API呼び出しや集計を1 round-tripにまとめる。

運用上の価値:

- 最新docsをその場で引けるため、modelのknowledge cutoffを補える。
- IAM context keys、IAM/SCP、CloudWatch `AWS-MCP` metrics、CloudTrailでagent操作を人間操作と分けて管理できる。
- read-onlyから始め、write権限は明示的に分離できる。

社内発表では「AWS MCPは便利なAWS操作tool」ではなく、「agentにAWS権限を渡すときの監査・権限制御モデル」として説明するのが重要。

### 13. 開発向けMCPの現状ランキング, 2026-06-07

GitHub API / `gh api` で2026-06-07に再取得したstar数。star数は人気・認知のsignalであり、品質や安全性の保証ではない。大規模product repoとMCP専用repoが混ざるため、採用判断ではmaintainer、release頻度、security posture、client互換性を見る。

| Repo | Stars | Notes |
|---|---:|---|
| `mendableai/firecrawl` | 129,670 | Web search/scrape/crawl product repo。MCP server単体ではない。 |
| `modelcontextprotocol/servers` | 86,854 | reference servers集。公式/参考実装の入口。 |
| `upstash/context7` | 56,904 | current docs lookup。coding agent向けdocs contextで強い。 |
| `ChromeDevTools/chrome-devtools-mcp` | 43,030 | Chrome DevTools for coding agents。frontend debug/perfに強い。 |
| `microsoft/playwright-mcp` | 33,574 | live browser操作、E2E生成、UI再現に強い。 |
| `github/github-mcp-server` | 30,495 | official GitHub MCP server。repo/issue/PR/search。 |
| `oraios/serena` | 25,036 | semantic code retrieval/editing。大規模repo向け。 |
| `GLips/Figma-Context-MCP` | 15,012 | Figma layout contextをcoding agentへ渡す。 |
| `awslabs/mcp` | 9,224 | AWS service-specific open-source MCP servers。 |
| `modelcontextprotocol/registry` | 6,896 | MCP server discovery/publishing基盤。 |
| `firecrawl/firecrawl-mcp-server` | 6,510 | Firecrawl official MCP server。 |
| `browserbase/mcp-server-browserbase` | 3,365 | managed browser automation。 |
| `supabase/mcp` | 2,723 | Supabase project/database連携。 |
| `stripe/ai` | 1,591 | Stripe AI/agent toolkit。 |
| `mongodb-js/mongodb-mcp-server` | 1,044 | MongoDB/Atlas連携。 |
| `getsentry/sentry-mcp` | 720 | Sentry issues/errors。 |

初期導入のおすすめ:

1. GitHub MCP: PR/issue/code search/CI。
2. Context7: 依存ライブラリの最新docs。
3. Playwright MCP: UI操作、E2E生成、回帰再現。
4. Chrome DevTools MCP: console/network/performance/Lighthouse。
5. Serena: 大規模repoのsemantic retrieval/editing。
6. Firecrawl MCP: web調査、公式docs取り込み。
7. AWS MCP / Agent Toolkit: AWS docs/API/CloudWatch/CloudTrail。
8. Figma/Sentry/Supabase/MongoDB/Stripe: チームの業務領域に合わせて追加。

### 14. MCPのリスクを初学者にどう説明するか

MCP serverは便利な連携部品である一方、外部データを読み、外部操作を実行できる。したがって「installして終わり」ではない。

主要リスク:

- Supply chain risk: npm/pipで入れるserver自体が信頼できるか。
- Permission risk: tokenやIAM roleが広すぎないか。
- Prompt injection: external contentがmodelの判断を誘導しないか。
- Tool confusion: 似たtoolが多すぎてmodelが誤選択しないか。
- Data leakage: serverに渡したcontextが外部へ流れないか。
- Local execution risk: stdio serverがlocal filesystemやshellへアクセスできるか。
- Audit gap: 誰が何を実行したか追えないか。

対策:

- official/vendor-maintained serverを優先。
- read-onlyから始める。
- allowed tools / route allowlistでtool surfaceを絞る。
- write toolはuser confirmation、server-side auth、idempotency、audit logを必須にする。
- secretはenv/secret managerから渡し、repoに置かない。
- outputはbounded structured JSONにし、巨大な生データを返さない。
- Remote MCPはOAuth/audience/scope/expiryを確認する。
- ローカルstdio serverは実行commandと権限をレビューする。

### 15. 初学者向けの説明順序

最終資料を誰が読んでも理解できるようにするなら、次の順序がよい。

1. LLMは外部システムを知らない、だから接続規約が必要。
2. MCPはAIアプリと外部システムをつなぐ標準protocol。
3. Host / Client / Serverで責務を分ける。
4. Resources / Tools / Promptsで「読む・実行する・作業テンプレート」を分ける。
5. stdio / Streamable HTTPでlocalとremoteを分ける。
6. Authとconsentがproductionの本体。
7. 既存APIはOpenAPIを整えてMCP adapterで公開する。
8. descriptionはモデル向けのUIとして設計する。
9. WebMCPとブラウザ操作MCPでfrontendもagent対応する。
10. AWS MCPやGitHub MCPなど、開発workflowに効くMCPから導入する。
11. 最後にリスク、管理、ロードマップを説明する。

## One-slide thesis

MCP is becoming the standard interface layer between AI agents and external systems. Its core value is not "more tools"; it is a common protocol for discovery, permissioning, context exchange, tool invocation, and future multi-client interoperability.

Good shorthand:

> MCP is the USB-C-like connector for AI applications, but with security, consent, and protocol lifecycle concerns that USB-C does not have.

## What MCP is

Official definition: MCP is an open protocol that standardizes integration between LLM applications and external data sources/tools. It uses JSON-RPC 2.0, stateful sessions, and capability negotiation.

Core architectural terms:

- Host: the AI application/container, such as Claude Desktop, ChatGPT, Codex, VS Code, Cursor, or another agent app.
- Client: a connector instance inside the host; each client maintains one isolated session to one server.
- Server: a local process or remote service that exposes context and capabilities.

Key analogy:

- Like Language Server Protocol standardized programming-language support across editors, MCP aims to standardize tool/context integration across AI clients.

## Core concepts

Server-side primitives:

- Resources: readable context/data, such as files, schemas, docs, database metadata, or business objects.
- Prompts: reusable prompt templates/workflows, typically user-selected.
- Tools: callable operations, model-controlled by default, such as search, API calls, database queries, issue creation, browser automation, or payment link creation.

Client-side primitives:

- Roots: host-provided filesystem/URI boundaries.
- Sampling: server-initiated LLM calls through the client.
- Elicitation: server requests for additional user input.
- Tasks: experimental durable request tracking and deferred result retrieval in the 2025-11-25 spec.

Important framing:

- Resources are context.
- Prompts are workflows.
- Tools are actions.
- Host/client isolation is a security boundary, not just an implementation detail.

## Basic flow

1. Host configures or discovers an MCP server.
2. Host creates an MCP client for that server.
3. Client and server initialize:
   - negotiate protocol version
   - exchange capabilities
   - exchange implementation metadata
4. Client discovers resources/prompts/tools as needed.
5. Model or user selects relevant capabilities.
6. Host enforces approvals, permissions, and context controls.
7. Client sends JSON-RPC requests to the server.
8. Server returns tool results, resources, prompts, logs, progress, or errors.
9. Shutdown occurs through the transport.

## MCP server construction: engineer-focused patterns

The most useful internal angle is not only "what MCP is", but "how we expose our existing systems safely as model-usable tools". There are three practical patterns:

1. Hand-write a small MCP server around a few high-value operations.
2. Generate an MCP surface from an existing OpenAPI spec, then filter and harden it.
3. Deploy it as a Remote MCP server over HTTPS so Claude, Claude Code, or other MCP clients can connect.

### Pattern A: hand-written tools with FastMCP

This is best for a small, curated tool surface. Type hints and docstrings become the schema and descriptions that the model sees.

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("inventory")

@mcp.tool()
async def get_stock(item_id: str) -> dict:
    """Return current inventory stock for one item."""
    # Replace with DB/API call.
    return {"item_id": item_id, "stock": 42}

@mcp.tool()
async def reserve_stock(item_id: str, quantity: int) -> dict:
    """Reserve inventory for an order. Use only after user confirmation."""
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    return {"item_id": item_id, "reserved": quantity}

if __name__ == "__main__":
    # Local MCP for desktop clients.
    mcp.run(transport="stdio")
```

For stdio servers, never write ordinary logs to stdout because stdout is the protocol channel. Use stderr or structured logging.

### Pattern B: existing FastAPI plus OpenAPI to MCP

FastAPI automatically exposes OpenAPI at `/openapi.json`, and `app.openapi()` returns the same schema in-process. This makes FastAPI a good source for an MCP wrapper.

Existing API:

```python
# inventory_api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Inventory API", version="1.0.0")

class Item(BaseModel):
    id: str
    name: str
    stock: int

ITEMS = {
    "sku-001": Item(id="sku-001", name="Notebook", stock=42),
}

@app.get("/items/{item_id}", tags=["items"])
async def get_item(item_id: str) -> Item:
    """Get a single item by SKU."""
    item = ITEMS.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    return item

@app.post("/items/{item_id}/reserve", tags=["inventory"])
async def reserve_item(item_id: str, quantity: int) -> dict[str, int]:
    """Reserve stock for an item."""
    item = ITEMS.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    if quantity <= 0 or quantity > item.stock:
        raise HTTPException(status_code=400, detail="invalid quantity")
    item.stock -= quantity
    return {"reserved": quantity, "remaining": item.stock}
```

MCP wrapper from the OpenAPI schema:

```python
# inventory_mcp.py
import httpx
from fastmcp import FastMCP
from inventory_api import app

openapi_spec = app.openapi()
api_client = httpx.AsyncClient(base_url="http://127.0.0.1:9000")

mcp = FastMCP.from_openapi(
    openapi_spec=openapi_spec,
    client=api_client,
    name="Inventory MCP",
)

if __name__ == "__main__":
    # Remote-capable HTTP transport. Put HTTPS/auth in front for production.
    mcp.run(transport="http", host="0.0.0.0", port=8000)
```

Run locally:

```bash
uvicorn inventory_api:app --host 127.0.0.1 --port 9000
python inventory_mcp.py
```

The important point for slides: OpenAPI generation is only the starting point. A production MCP server should not blindly expose every endpoint. The model-facing tool surface must be curated.

### Pattern C: filter generated tools before publishing

Use route mapping to exclude internal or dangerous endpoints and to decide whether a route should become a tool, resource, or resource template.

```python
from fastmcp import FastMCP
from fastmcp.server.providers.openapi import MCPType
from fastmcp.utilities.openapi import HTTPRoute

def route_map_fn(route: HTTPRoute, mcp_type: MCPType) -> MCPType | None:
    if route.path.startswith("/admin/"):
        return MCPType.EXCLUDE
    if "internal" in set(route.tags or []):
        return MCPType.EXCLUDE
    if route.method in {"POST", "PUT", "PATCH", "DELETE"}:
        return MCPType.TOOL
    if route.path.startswith("/items/"):
        return MCPType.RESOURCE_TEMPLATE
    return None

mcp = FastMCP.from_openapi(
    openapi_spec=openapi_spec,
    client=api_client,
    name="Inventory MCP",
    route_map_fn=route_map_fn,
)
```

For internal APIs, this filtering layer is where engineering judgment matters most:

- Keep only operations that an AI assistant should actually call.
- Prefer read-only tools first; gate write tools behind confirmation and authorization.
- Give every operation a stable `operationId`, clear tags, precise request/response schemas, and concise descriptions.
- Avoid exposing endpoints with ambiguous side effects.
- Add pagination and output caps; large raw API responses become poor model context.

## Remote MCP for Claude: build and use

Claude can connect to local stdio MCP servers and Remote MCP servers. For Claude.ai custom connectors and team-wide usage, Remote MCP is the relevant architecture.

Minimal deployment shape:

```mermaid
flowchart LR
    Claude["Claude / Claude Code"] -->|"HTTPS MCP transport"| Gateway["Public HTTPS endpoint"]
    Gateway --> Auth["OAuth / token validation"]
    Auth --> MCP["MCP server"]
    MCP --> API["Existing API / DB / SaaS"]
```

Production requirements:

- Expose the MCP endpoint over public HTTPS. Claude connects from Anthropic cloud infrastructure, even when the user is on Claude Desktop or Cowork.
- Private networks, VPN-only hosts, and firewalled internal services will not work unless access from Anthropic IP ranges is allowed or an approved gateway is used.
- For Claude custom connectors, OAuth is the preferred user-scoped authorization model. For Claude Code development, static headers can be useful, but they are not the best production default.
- Validate `Origin` where applicable, enforce auth on every request, rate limit, and log tool calls for audit.
- Keep server instructions and tool descriptions short and precise; Claude Code truncates server instructions and tool descriptions around a documented size limit.

Claude Code remote MCP example:

```bash
claude mcp add --transport http inventory https://mcp.example.com/mcp

claude mcp add --transport http inventory https://mcp.example.com/mcp \
  --header "Authorization: Bearer $MCP_TOKEN"

claude mcp list
claude mcp get inventory
```

Authenticate OAuth-backed servers from inside Claude Code:

```text
/mcp
```

Project-shared `.mcp.json` example:

```json
{
  "mcpServers": {
    "inventory": {
      "type": "http",
      "url": "${INVENTORY_MCP_URL:-https://mcp.example.com/mcp}",
      "headers": {
        "Authorization": "Bearer ${INVENTORY_MCP_TOKEN}"
      },
      "timeout": 60000
    }
  }
}
```

Claude.ai custom connector usage:

- Pro/Max users can add a custom connector from Claude settings by entering the Remote MCP server URL and optional OAuth client information.
- Team/Enterprise owners add custom connectors from organization settings; members then connect individually.
- Treat every connector as a privileged integration. Review scopes, disable unnecessary tools, and be careful with "always allow" behavior for write-capable tools.

## MCP server design rules for engineers

These are the rules worth putting into the slide deck:

- Tool surface is product design, not only API wrapping. The model sees names, descriptions, parameters, and results; design them intentionally.
- OpenAPI quality directly determines MCP quality. Poor `operationId`, weak schemas, vague descriptions, and huge response bodies become poor tools.
- Start from read-only, then add write actions with explicit confirmation, authorization, and audit.
- Never expose internal/admin endpoints by default.
- Return structured JSON results, not long prose.
- Separate tool execution errors from protocol errors. Business/API validation failures should come back as tool results or tool execution errors, not broken MCP sessions.
- Keep results bounded with pagination, filters, and summarizable fields.
- Treat prompts, tool descriptions, resource content, and API output as possible prompt-injection surfaces.
- For stdio servers, stdout is reserved for MCP messages.
- For remote servers, HTTPS, OAuth/token handling, rate limits, observability, and key rotation are part of the server, not optional extras.

## Recommended design for adapting an existing API server

For an existing API server, the recommended design is an adapter layer, not a rewrite. Keep the existing API as the source of truth, use OpenAPI as the contract, and publish only a curated MCP surface.

### Recommended layer structure

```text
app/
  api/
    main.py              # Existing FastAPI app
    routers/
      inventory.py       # HTTP routes, response_model, operation_id, tags
  domain/
    inventory_service.py # Business logic shared by API and jobs
  mcp/
    server.py            # MCP adapter
    route_policy.py      # OpenAPI route filtering / mapping
    descriptions.py      # Tool/server description text
  tests/
    test_openapi_contract.py
    test_mcp_tools.py
```

Recommended dependency direction:

```mermaid
flowchart LR
    Domain["domain service"] --> API["FastAPI routes"]
    API --> OpenAPI["OpenAPI schema"]
    OpenAPI --> MCP["MCP adapter"]
    MCP --> Client["Claude / Codex / other MCP clients"]
```

Do not let MCP become a second business-logic implementation. Either:

- call the existing public API through `httpx.AsyncClient`, which preserves auth, validation, rate limits, and observability; or
- call the shared domain/service layer directly if the MCP server runs in the same trusted service boundary.

For most teams, the first version should call the existing API over HTTP because it is easier to reason about and test. Direct service-layer calls are attractive later, but they bypass API middleware unless recreated carefully.

### Import policy

Use one MCP SDK style consistently per server:

```python
# Official MCP SDK quickstart style for hand-written tools.
from mcp.server.fastmcp import FastMCP
```

```python
# FastMCP v2 style for OpenAPI/FastAPI adaptation.
from fastmcp import FastMCP
```

For an existing FastAPI API, keep the imports explicit and boring:

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

Design guidance:

- Import the FastAPI `app` only to obtain the OpenAPI schema.
- Keep the outbound API client as the integration boundary.
- Keep route filtering in a separate module so security review is easy.
- Do not scatter MCP decorators across existing HTTP route files unless the service is intentionally MCP-first.
- Do not import private route handlers and call them as normal functions. That often skips request validation, auth dependencies, middleware, tracing, and error handling.

### FastAPI route design for AI-ready OpenAPI

OpenAPI quality directly affects generated MCP tool quality. Design routes with explicit metadata:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/items", tags=["inventory"])

class ReserveRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Number of units to reserve.")

class ReserveResponse(BaseModel):
    item_id: str
    reserved: int
    remaining: int

@router.post(
    "/{item_id}/reserve",
    operation_id="reserve_inventory_item",
    summary="Reserve inventory for an item",
    description=(
        "Reserve stock for a known inventory item. "
        "This changes inventory state and should be called only after explicit user confirmation."
    ),
    response_model=ReserveResponse,
)
async def reserve_inventory_item(item_id: str, request: ReserveRequest) -> ReserveResponse:
    ...
```

Recommended route metadata:

- `operation_id`: stable, unique, verb-first, model-readable. Example: `reserve_inventory_item`, not `post_items_item_id_reserve`.
- `summary`: one-line action name.
- `description`: when to use it, side effects, constraints, and confirmation requirements.
- `tags`: route grouping used for MCP filtering.
- `response_model`: concrete structured output.
- Pydantic `Field(description=...)`: parameter semantics, units, allowed values, and examples.
- `include_in_schema=False`: hide internal routes from OpenAPI and therefore from generated MCP.

### Route publication policy

Use tags and path conventions to make MCP exposure reviewable:

```python
# app/mcp/route_policy.py
from fastmcp.server.providers.openapi import MCPType
from fastmcp.utilities.openapi import HTTPRoute

BLOCKED_TAGS = {"internal", "admin", "debug"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

def route_map_fn(route: HTTPRoute, default_type: MCPType) -> MCPType | None:
    tags = set(route.tags or [])
    if tags.intersection(BLOCKED_TAGS):
        return MCPType.EXCLUDE
    if route.path.startswith(("/admin", "/debug", "/internal")):
        return MCPType.EXCLUDE
    if route.method in WRITE_METHODS:
        return MCPType.TOOL
    if route.method == "GET" and "catalog" in tags:
        return MCPType.RESOURCE_TEMPLATE
    return MCPType.TOOL
```

Recommended policy:

- GET/search/list routes can become tools or resources depending on client support.
- Write routes should remain tools because they are explicit actions.
- Admin/debug/internal routes should be excluded twice: first from OpenAPI with `include_in_schema=False`, then from MCP route policy.
- Start with an allowlist for production if the API is large or sensitive.

### Description design policy

Descriptions are not normal API docs. They are model-facing decision aids. A good description answers:

1. What action does this tool perform?
2. When should the model use it?
3. What inputs are required, and what format/units do they use?
4. Does it read data or change state?
5. What user confirmation or permission is required?
6. What output shape should the model expect?
7. When should the model not use it?

Good read-only example:

```text
Read a single inventory item by exact SKU. Use when the user asks for current
stock, item name, or item status for a known SKU. No side effects. Returns
JSON with id, name, stock, and status.
```

Good write-action example:

```text
Reserve stock for an inventory item after explicit user confirmation. This
decreases available stock. Requires exact SKU and positive quantity. Returns
reserved quantity and remaining stock. Do not use for price quotes or order
creation.
```

Poor description:

```text
Inventory endpoint.
```

Reason: it does not explain action, timing, side effects, input expectations, or output.

Description rules:

- Put the most important instruction first. Claude Code truncates tool descriptions and server instructions at a documented limit, so late caveats may disappear.
- Prefer concrete verbs: `read`, `search`, `reserve`, `create`, `cancel`, `summarize`.
- State side effects explicitly: `No side effects`, `Creates a ticket`, `Deletes a draft`, `Sends an email`.
- Use business names users know, not only internal table/API names.
- Include disambiguation for similar tools: "Use this for current stock; use `search_inventory_items` when SKU is unknown."
- Keep auth and confirmation requirements in the description for write tools.
- Avoid vague promises such as "gets data", "handles inventory", or "does the operation".
- Avoid embedding secrets, internal URLs, or policy text that should live in server-side enforcement.

### Server instructions design

Server instructions help the client decide when to search or load tools, especially when tool search is enabled.

Recommended shape:

```text
This server provides inventory lookup and reservation tools for the internal
commerce platform. Use it when the user asks about item stock, SKU availability,
or reserving inventory. Prefer read-only lookup tools before reservation tools.
Reservation tools change inventory state and require explicit user confirmation.
```

Keep server instructions short and front-load:

- domain/category of tasks
- when to search these tools
- key capabilities
- safety rule for write tools

### Test plan for API-to-MCP adaptation

Minimum tests:

- OpenAPI contract test: every exposed route has `operationId`, `summary`, `description`, tags, and response schema.
- Route policy test: admin/internal/debug routes are excluded.
- Tool list smoke test: generated MCP server exposes expected tool names only.
- Tool execution test: representative GET and write endpoints call the API and return structured results.
- Auth test: unauthenticated remote calls fail.
- Output-size test: list/search tools paginate or cap results.

Example contract test:

```python
def test_mcp_exposed_routes_have_ai_ready_metadata():
    spec = fastapi_app.openapi()
    for path, methods in spec["paths"].items():
        for method, operation in methods.items():
            if "internal" in operation.get("tags", []):
                continue
            assert operation.get("operationId")
            assert operation.get("summary")
            assert operation.get("description")
            assert operation.get("responses")
```

## Connection protocols / transports

MCP has one protocol message format and multiple ways to carry those messages. The message format is JSON-RPC 2.0. The transport answers a different question: "how do the client and server physically exchange those JSON-RPC messages?"

Beginner framing:

- Protocol message: `initialize`, `tools/list`, `tools/call`, result, error, notification.
- Transport: stdio, HTTP, SSE stream, or another bidirectional channel.
- Lifecycle: every transport still follows the same MCP lifecycle: initialize -> initialized -> normal operation -> shutdown.

### Common lifecycle for all transports

The initialization phase is not optional. The client starts with `initialize`, the server returns protocol version, capabilities, and server info, then the client sends `notifications/initialized`.

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as MCP Server
    C->>S: initialize(protocolVersion, clientCapabilities, clientInfo)
    S-->>C: InitializeResult(protocolVersion, serverCapabilities, serverInfo)
    C->>S: notifications/initialized
    C->>S: tools/list or resources/list
    S-->>C: available capabilities
    C->>S: tools/call
    S-->>C: tool result or error
```

Key rule:

- Both sides must respect the negotiated protocol version and capabilities.
- A client should not call `tools/list` unless the server declared tool capability.
- A server should not use client-side features such as sampling unless the client declared support.

### Transport comparison

- stdio:
  - Client launches server as subprocess.
  - Good for local tools and developer workflows.
  - Credentials should usually come from environment/config, not OAuth flow.
  - stdout must contain only valid MCP messages; stderr is for logs.
  - Best for filesystem, local git, local browser, local scripts, and developer-only tools.

- Streamable HTTP:
  - Server exposes a single MCP endpoint using HTTP POST and GET.
  - Supports JSON response or SSE streaming.
  - Replaces the older HTTP+SSE transport from the 2024-11-05 spec.
  - Better for remote servers, hosted services, organization-wide deployment.
  - Best for SaaS, internal platform MCP, Claude custom connectors, and shared team servers.

- HTTP+SSE, legacy:
  - Older transport from protocol version 2024-11-05.
  - Deprecated for new servers, but clients may maintain backwards compatibility.
  - Uses a GET-established SSE stream plus a POST endpoint announced by the server.

- WebSocket / custom transports:
  - Not one of the two current standard transports in the MCP spec.
  - The spec allows custom transports if they preserve JSON-RPC message format and lifecycle requirements.
  - Claude Code supports remote WebSocket server configuration, but recommends HTTP for request/response style remote servers because HTTP has better OAuth support in the CLI flow.

| Transport | Standard status | Connection ownership | Best fit | Main caution |
|---|---|---|---|---|
| stdio | Current standard | Client starts local process | Local tools, dev workflows | stdout is protocol-only; local process privileges are powerful |
| Streamable HTTP | Current standard | Server exposes HTTP endpoint | Remote/shared servers | auth, Origin validation, session handling |
| HTTP+SSE | Deprecated legacy | SSE stream + POST endpoint | Older servers | use only for compatibility |
| WebSocket/custom | Implementation-specific | Persistent bidirectional socket | event-heavy custom clients | less portable; document handshake and auth clearly |

### stdio overview and connection flow

stdio is the simplest local transport. The host launches the MCP server command as a subprocess, then talks to it through stdin/stdout. Each JSON-RPC message is newline-delimited. The server may log to stderr, but must not write non-protocol text to stdout.

Typical config shape:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

Flow:

```mermaid
sequenceDiagram
    participant H as Host
    participant C as MCP Client
    participant P as Server Process
    H->>C: Load server config
    C->>P: spawn command/args/env
    C->>P: stdin: initialize JSON-RPC
    P-->>C: stdout: InitializeResult
    C->>P: stdin: notifications/initialized
    C->>P: stdin: tools/list
    P-->>C: stdout: tool definitions
    C->>P: stdin: tools/call
    P-->>C: stdout: tool result
    C->>P: close stdin or terminate process
```

Good fit:

- Local filesystem and git access.
- Browser automation that needs local Chrome.
- Small custom scripts.
- Developer-only tools where remote hosting would add overhead.

Avoid:

- Shared enterprise services.
- Multi-user SaaS connectors.
- Long-lived org-wide tools needing OAuth, audit, rate limiting, and centralized lifecycle.

Security notes:

- Treat the command exactly like running a local program.
- Review package source and command arguments.
- Use env vars or secret managers for credentials; do not commit secrets into `.mcp.json`.
- For stdio, `print()` / `console.log()` can break the protocol if they write to stdout.

### Streamable HTTP overview and connection flow

Streamable HTTP is the current remote-friendly standard. The server exposes a single MCP endpoint, commonly like `https://example.com/mcp`, that supports POST and optionally GET. POST carries JSON-RPC messages from client to server. A request can return a normal JSON response or open an SSE stream for streaming responses. GET can be used to open a server-to-client SSE stream for notifications or server-initiated messages.

Typical Claude Code config:

```bash
claude mcp add --transport http inventory https://mcp.example.com/mcp
```

Typical JSON config:

```json
{
  "mcpServers": {
    "inventory": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${INVENTORY_MCP_TOKEN}"
      }
    }
  }
}
```

Basic request/response flow:

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as HTTP MCP Server
    C->>S: POST /mcp initialize<br/>Accept: application/json, text/event-stream
    S-->>C: 200 JSON InitializeResult<br/>MCP-Session-Id: abc
    C->>S: POST /mcp notifications/initialized<br/>MCP-Session-Id: abc<br/>MCP-Protocol-Version: 2025-11-25
    S-->>C: 202 Accepted
    C->>S: POST /mcp tools/list
    S-->>C: 200 JSON tools
    C->>S: POST /mcp tools/call
    S-->>C: 200 JSON result
```

Streaming flow:

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as HTTP MCP Server
    C->>S: POST /mcp tools/call<br/>Accept: application/json, text/event-stream
    S-->>C: 200 text/event-stream
    S-->>C: SSE event id: 1, progress/log message
    S-->>C: SSE event id: 2, final JSON-RPC response
    S-->>C: close stream
```

Optional server-to-client stream:

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as HTTP MCP Server
    C->>S: GET /mcp<br/>Accept: text/event-stream
    S-->>C: 200 text/event-stream
    S-->>C: server notification or request
    C->>S: POST /mcp response/notification
    S-->>C: 202 Accepted
```

Session and recovery details:

- Server may return `MCP-Session-Id` during initialization.
- Client must include `MCP-Session-Id` on later HTTP requests when the server gave one.
- Client must include `MCP-Protocol-Version` on subsequent HTTP requests.
- SSE events may include IDs; client can use `Last-Event-ID` to resume after disconnection.
- Client can send HTTP DELETE with `MCP-Session-Id` to explicitly terminate a session if the server supports it.

Security notes:

- Validate `Origin` on incoming HTTP connections to reduce DNS rebinding risk.
- Local HTTP MCP servers should bind to `127.0.0.1`, not `0.0.0.0`, unless they are intentionally exposed.
- Remote servers should implement authentication and authorization.
- For production, prefer OAuth 2.1-compatible flows and audience-bound tokens over static shared tokens.

### HTTP+SSE legacy overview and flow

HTTP+SSE was the older remote transport used by the 2024-11-05 protocol. It is deprecated for new work, but compatibility matters because existing servers and clients may still use it.

High-level difference:

- Old HTTP+SSE: client first opens an SSE stream and receives an `endpoint` event; client sends JSON-RPC messages to the announced POST endpoint; server replies over the SSE stream.
- Streamable HTTP: client sends JSON-RPC messages to one MCP endpoint via POST; the server may respond with JSON or SSE; GET to the same endpoint is optional for server-to-client streaming.

Legacy flow:

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as Legacy HTTP+SSE Server
    C->>S: GET /sse
    S-->>C: SSE endpoint event<br/>data: /messages
    C->>S: POST /messages initialize
    S-->>C: SSE message InitializeResult
    C->>S: POST /messages notifications/initialized
    C->>S: POST /messages tools/list
    S-->>C: SSE message tool definitions
    C->>S: POST /messages tools/call
    S-->>C: SSE message tool result
```

Compatibility detection:

- A client can try POST initialize to the supplied server URL.
- If it fails with expected status codes such as 400, 404, or 405, the client can try GET and look for the old SSE `endpoint` event.
- New servers should prefer Streamable HTTP; old servers may host both old and new endpoints during migration.

### WebSocket and custom transports

The latest MCP specification is transport-agnostic beyond the two standard transports. Custom transports are allowed if they preserve JSON-RPC message format and MCP lifecycle. WebSocket is one common custom option because it gives a persistent bidirectional channel.

Claude Code supports remote WebSocket configuration through JSON, for example:

```json
{
  "mcpServers": {
    "events-server": {
      "type": "ws",
      "url": "wss://mcp.example.com/socket",
      "headers": {
        "Authorization": "Bearer ${EVENTS_TOKEN}"
      }
    }
  }
}
```

Generic custom WebSocket flow:

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as WebSocket MCP Server
    C->>S: WebSocket connect wss://...
    C->>S: initialize JSON-RPC message
    S-->>C: InitializeResult JSON-RPC message
    C->>S: notifications/initialized
    C->>S: tools/list
    S-->>C: tool definitions
    S-->>C: server notification or pushed request
    C->>S: response or tool call
```

When to consider:

- Server needs continuous push events.
- Client explicitly supports the custom transport.
- You control both client and server or can document the connection contract clearly.

When not to choose it:

- You want broad MCP client compatibility.
- You need standard OAuth setup through existing MCP client commands.
- Request/response HTTP is enough.

### WebMCP is not an MCP transport

WebMCP should not be grouped with stdio, Streamable HTTP, or WebSocket. WebMCP is a browser-side API proposal for exposing web page capabilities to browser-based agents. It is inspired by MCP, but it is not a direct JavaScript implementation of MCP and not a transport for MCP JSON-RPC messages.

Practical mental model:

- MCP transport: how an MCP client talks to an MCP server.
- WebMCP: how a live web page declares frontend capabilities to a browser agent.
- Browser-operation MCPs such as Playwright MCP and Chrome DevTools MCP: MCP servers that let an agent inspect/control a browser during development.

Security points for HTTP:

- Validate Origin headers to reduce DNS rebinding risk.
- Local HTTP servers should bind to localhost, not 0.0.0.0.
- Use authentication for remote or sensitive servers.
- Include MCP-Protocol-Version on subsequent HTTP requests after negotiation.

## Auth specification

MCP authorization is optional overall, but HTTP-based protected servers should follow the MCP authorization spec.

Current direction:

- OAuth 2.1 based flow.
- MCP server acts as OAuth resource server.
- MCP client acts as OAuth client.
- Authorization server issues access tokens.
- Protected Resource Metadata (RFC 9728) is required for server authorization discovery.
- Authorization Server Metadata (RFC 8414) or OpenID Connect Discovery 1.0 is required on the auth server side.
- Resource Indicators (RFC 8707) bind tokens to the intended MCP server.
- PKCE is required for authorization code protection.
- Client ID Metadata Documents were added/recommended in 2025-11-25 for no-prior-relationship client registration.
- Dynamic Client Registration remains possible but is no longer the main recommended path in the latest spec.

Rules to emphasize:

- Send bearer tokens in Authorization headers, not query strings.
- Include authorization on every HTTP request.
- Do not accept or forward tokens that were not issued for the MCP server.
- Token passthrough is forbidden.
- Treat scopes as least-privilege and support incremental/step-up authorization where possible.

## History

- 2024-11-25: Anthropic announced and open-sourced MCP, including the spec/SDKs, local MCP support in Claude Desktop, and a repository of prebuilt servers.
- Early examples included Google Drive, Slack, GitHub, Git, Postgres, and Puppeteer.
- Early adopters/participants named by Anthropic included Block, Apollo, Zed, Replit, Codeium, and Sourcegraph.
- The initial transport included HTTP+SSE.
- Later specs introduced Streamable HTTP, stronger auth, better security guidance, and richer capabilities.
- 2025-11-25 latest spec changes include OIDC discovery support, Client ID Metadata Documents, incremental scope consent, icon metadata, URL elicitation, tool calling support in sampling, experimental tasks, SDK tiering, governance, and working/interest groups.
- The old third-party server list in `modelcontextprotocol/servers` has been retired in favor of the MCP Registry.
- The MCP Registry preview launched 2025-09-08; its v0.1 API entered a freeze on 2025-10-24 according to the registry repo.

## Main use cases

Engineering:

- Repo/issue/PR operations through GitHub MCP.
- Local file and Git context through Filesystem/Git reference servers.
- Browser/web fetch automation through Fetch/Puppeteer-like servers.
- Documentation lookup through docs MCPs such as OpenAI docs, Context7, or DeepWiki.
- Design-to-code workflows through Figma MCP.
- Observability triage through Sentry MCP.

Enterprise knowledge:

- Search and fetch private docs from Google Drive, Notion, SharePoint, Slack, Gmail, etc.
- Bring database schemas, project artifacts, and customer-support context into agents.
- Use MCP as a controlled context layer rather than copying data manually into prompts.

Business operations:

- Payments/billing operations via Stripe MCP.
- Calendar/email workflows via Google/Microsoft connectors.
- CRM/BI/internal tool workflows through company-owned MCP servers.

Agent platform:

- Standardize how agents discover external tools.
- Enable cross-client reuse.
- Move from prompt-only automation to governed action execution.

Frontend / browser agents:

- WebMCP is a Chrome proposal for exposing frontend capabilities to browser-based agents.
- WebMCP is not a replacement for MCP. Chrome positions MCP as the backend/service-layer integration and WebMCP as the frontend/live-tab integration.
- WebMCP is tab-bound and ephemeral, while MCP servers are persistent local or remote services.
- Browser automation MCPs such as Playwright MCP and Chrome DevTools MCP bridge the gap today: they let agents inspect DOM, click, navigate, collect screenshots, inspect network/console logs, and generate tests.
- Chrome DevTools MCP also exposes WebMCP-related tools in its tool catalog, making it relevant for debugging pages that adopt WebMCP.

## Well-known MCP servers / surfaces

Official or high-signal examples:

- GitHub MCP Server: official GitHub server for repositories, issues, PRs, search, security alerts, Copilot-related tools.
- Stripe MCP: public preview remote MCP server for Stripe API operations and Stripe knowledge search.
- OpenAI connectors / remote MCP: Responses API supports `type: "mcp"` for remote servers and built-in connectors.
- MCP reference servers: Everything, Fetch, Filesystem, Git, Memory, Sequential Thinking, Time.
- MCP Registry: emerging "app store"-like server discovery/publishing infrastructure.

OpenAI connector examples:

- Dropbox
- Gmail
- Google Calendar
- Google Drive
- Microsoft Teams
- Outlook Calendar
- Outlook Email
- SharePoint

Developer-useful MCPs in this Codex environment:

- GitHub: repos, issues, PRs, CI/PR workflows.
- Figma: design context, screenshots, design-to-code and deck/diagram workflows.
- Google Drive/Docs/Sheets/Slides: private docs and collaborative artifacts.
- Slack: message/thread/channel context and drafting.
- Notion: knowledge base, specs, docs, task/project context.
- Sentry: issue/error context.
- Firecrawl: web search/scraping/crawling.
- Context7: current library/framework docs.
- OpenAI Developer Docs: current official OpenAI API/Codex docs.
- 1Password: environment/secrets workflows.
- Node REPL: runtime-backed JS execution.
- AWS knowledge / AWS plugins: cloud/agent infrastructure guidance.

Developer-useful MCPs from GitHub/community signals:

Star counts below were fetched from GitHub API on 2026-06-07. They should be treated as popularity signals, not quality guarantees.

| MCP / repo | Stars | Practical development value |
|---|---:|---|
| `mendableai/firecrawl` | 129,668 | Web search/scrape/crawl for research and docs ingestion. This is the product repo, not only the MCP server repo. |
| `modelcontextprotocol/servers` | 86,854 | Reference filesystem, git, memory, fetch, time, and protocol example servers. |
| `upstash/context7` | 56,903 | Current library/framework docs for coding agents. |
| `ChromeDevTools/chrome-devtools-mcp` | 43,029 | Browser debugging, performance trace, network/console inspection, screenshots, Lighthouse, WebMCP tools. |
| `microsoft/playwright-mcp` | 33,574 | Browser operation and E2E test generation from live DOM/app state. |
| `github/github-mcp-server` | 30,495 | Repository, issue, PR, code search, and workflow operations. |
| `oraios/serena` | 25,034 | Semantic code retrieval and editing for large codebases. |
| `awslabs/mcp` | 9,224 | AWS service-specific open-source MCP servers; Agent Toolkit for AWS is now the recommended managed path. |
| `mendableai/firecrawl-mcp-server` | 6,509 | Official Firecrawl MCP server package. |
| `modelcontextprotocol/registry` | 6,896 | MCP server discovery and publishing infrastructure. |
| `browserbase/mcp-server-browserbase` | 3,365 | Managed browser automation with Browserbase/Stagehand. |
| `supabase-community/supabase-mcp` | 2,723 | Supabase database/project access for AI assistants. |
| `figma/mcp-server-guide` | 1,554 | Official Figma MCP usage guide; Figma also provides hosted/desktop MCP options. |
| `getsentry/sentry-mcp` | 720 | Sentry issue/error context for coding assistants. |

Recommended adoption order for development teams:

1. GitHub MCP for repository operations.
2. Context7 for current docs.
3. Playwright MCP for UI operation and E2E test generation.
4. Chrome DevTools MCP for frontend debugging, network, console, performance, screenshots, and WebMCP inspection.
5. Serena for semantic code understanding/editing.
6. Firecrawl MCP for web research and documentation ingestion.
7. AWS MCP / Agent Toolkit for AWS for cloud documentation, API calls, metrics, and audit-friendly operations.
8. Figma and Sentry MCPs when design-to-code or runtime triage are central to the workflow.

## Frontend: WebMCP and browser-operation MCPs

Chrome's WebMCP documentation frames WebMCP and MCP as complementary:

- MCP is for backend/service logic: agents can use data/actions from anywhere.
- WebMCP is for frontend/live web UI: browser agents understand capabilities in the user's current tab.
- MCP has persistent local/remote server lifecycle; WebMCP is ephemeral and tied to page visits.
- MCP discovery is through agent/client configuration; WebMCP discovery occurs when the user visits a page that declares tools.

Design implication:

- Use MCP for core API actions and data retrieval.
- Use WebMCP to declare frontend actions and page-specific affordances.
- Use Playwright MCP and Chrome DevTools MCP during development to inspect, test, and debug the actual UI.

Playwright MCP:

- Official Microsoft server at `microsoft/playwright-mcp`.
- Gives AI coding assistants direct access to a live browser session.
- Useful for DOM inspection, clicking, navigation, test generation, and reproducing user flows.
- Typical configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Chrome DevTools MCP:

- Official Chrome DevTools server at `ChromeDevTools/chrome-devtools-mcp`.
- Tool categories include input automation, navigation, emulation, performance, network, debugging, memory, extensions, third-party developer tools, and WebMCP tools.
- Useful for console/network inspection, Lighthouse, performance traces, screenshots, heap snapshots, and connecting to running Chrome.
- Typical configuration:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--headless=true",
        "--isolated=true"
      ]
    }
  }
}
```

Important Chrome DevTools MCP options:

- `--autoConnect`: connect to a local Chrome instance with remote debugging enabled.
- `--browserUrl=http://127.0.0.1:9222`: connect to a running debuggable Chrome instance.
- `--isolated=true`: use a temporary Chrome profile per session.
- `--slim`: expose only a small navigation/script/screenshot tool set.
- `--category-experimental-webmcp`: enable WebMCP debugging tools; Chrome flags are required.

## AWS MCP and Agent Toolkit for AWS

AWS announced the AWS MCP Server general availability on 2026-05-06. It is now part of Agent Toolkit for AWS.

Key points:

- Managed remote MCP server.
- Supports secure authenticated access to AWS services through a small fixed tool set.
- `call_aws` can execute AWS API operations using IAM credentials.
- `search_documentation` and `read_documentation` retrieve current AWS documentation.
- `run_script` executes Python server-side in a sandboxed environment.
- CloudWatch metrics are published under the `AWS-MCP` namespace.
- CloudTrail captures API calls for audit.
- IAM context keys can distinguish agent-initiated actions and support read-only or blocked action policies.
- Agent Toolkit for AWS is the recommended successor to AWS Labs MCP servers, plugins, and skills, while AWS Labs continues to work and accept contributions.

Claude Code setup example from AWS:

```bash
claude mcp add-json aws-mcp --scope user \
  '{"command":"uvx","args":["mcp-proxy-for-aws@latest","https://aws-mcp.us-east-1.api.aws/mcp","--metadata","AWS_REGION=us-west-2"]}'
```

Generic MCP configuration:

```json
{
  "mcpServers": {
    "aws-mcp": {
      "command": "uvx",
      "timeout": 100000,
      "transport": "stdio",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata", "AWS_REGION=us-west-2"
      ]
    }
  }
}
```

Management recommendations:

- Start read-only.
- Separate human permissions from agent permissions.
- Use IAM/SCP controls and AWS MCP context keys where available.
- Monitor `AWS-MCP` CloudWatch metrics.
- Review CloudTrail for agent-initiated changes.
- Prefer Agent Toolkit for AWS for managed enterprise rollout; keep AWS Labs MCPs for service-specific local workflows and experimentation.

## Important MCP rules

Security and trust:

- Treat MCP servers as code/data trust boundaries.
- Prefer official servers hosted by the service provider.
- Require approval for sensitive tool calls.
- Use `allowed_tools` or equivalent filtering to reduce tool surface.
- Log/review data sent to third-party MCP servers where policy permits.
- Consider prompt injection especially when tools can read sensitive data or take actions.
- Do not embed or fetch arbitrary URLs from MCP outputs without domain trust checks.
- Do not use broad all-access scopes by default.
- Avoid token passthrough and enforce audience validation.
- For local MCP, show exact commands before execution and sandbox where possible.

Protocol/design:

- Keep servers focused and composable.
- Declare capabilities accurately.
- Do not assume another client supports a capability until negotiated.
- Validate inputs and outputs.
- Separate protocol errors from tool execution errors.
- Use structured output/schema when downstream automation matters.
- Use timeouts, cancellation, and progress for long-running operations.

Operational:

- Remote servers need auth, lifecycle, rate limits, and auditability.
- Local stdio servers are powerful but inherit local process privileges.
- Large tool catalogs increase cost/latency; defer or filter tool loading.
- Server descriptions/tool metadata are model inputs and should be curated.

## Future important points

Likely strategic points:

- Remote MCP will matter more than local-only MCP as organizations standardize agent access to SaaS/internal tools.
- Auth and consent will be the hardest part of production MCP, not JSON-RPC.
- Tool registry/discovery and trust/reputation will become critical.
- Enterprise policy will need to distinguish:
  - approved official MCP servers
  - internally developed MCP servers
  - experimental/community servers
  - blocked/untrusted servers
- MCP Apps and UI-bearing resources may turn MCP from "tools only" into app-like agent interfaces.
- Durable tasks are important for long-running workflows, async operations, and agent handoff.
- Governance/SDK tiering suggests MCP is moving from experimental ecosystem to more formal infrastructure.

## Roadmap themes

Based on current official materials, present roadmap as "direction of travel", not guaranteed product promises:

- Standardization: governance, working groups, SDK tiering, formal registry.
- Remote production deployment: Streamable HTTP, OAuth/OIDC discovery, protected resource metadata.
- Better trust UX: approvals, incremental scopes, least privilege, explicit consent.
- Larger tool ecosystems: registry and connectors.
- Richer agent workflows: elicitation, sampling with tool calling, task/durable execution.
- MCP Apps / UI resources: interactive components inside AI clients.
- Enterprise controls: policy, audit logs, server allowlists, ZDR/data-residency boundary awareness.

## Recommended slide structure

1. Title: MCP: AI agents and external systems need a protocol
2. Why now: agents need live data, tools, workflows, and governance
3. What MCP is: open protocol + JSON-RPC + capability negotiation
4. Architecture: Host / Client / Server
5. Core primitives: Resources / Prompts / Tools
6. Runtime flow: initialize -> discover -> approve -> call -> return
7. Transports: stdio vs Streamable HTTP
8. Auth: OAuth 2.1, Protected Resource Metadata, Resource Indicators, PKCE
9. History: Anthropic launch to current spec/registry
10. Use cases: engineering, enterprise knowledge, business operations, agent platforms
11. Ecosystem: GitHub, Stripe, OpenAI connectors, registry, reference servers
12. Developer MCPs we use: GitHub, Figma, Drive, Slack, Notion, Sentry, Firecrawl, Context7, OpenAI Docs
13. Security rules: approval, least privilege, no token passthrough, trusted servers
14. What changes for us: build once, connect many clients; but operate like production integrations
15. Future points: registry, remote MCP, auth maturity, MCP Apps, durable tasks
16. Summary: MCP is the integration layer for governed agentic work

## Marp slide production method

Current recommended Marp practice is to keep slide content in Markdown and move visual identity into plain CSS:

- Use Marp front matter for deck-wide metadata such as `theme`, `paginate`, `size`, `title`, and `footer`.
- Use a custom Marpit theme CSS file with an `/* @theme ... */` meta comment when the deck needs reusable visual design.
- Use local class directives such as `_class: lead`, `_class: section`, `_class: dense`, or `_class: rank` to vary layouts per slide.
- Prefer CSS Grid/Flexbox, design tokens, `text-wrap: balance/pretty`, bounded typography, and restrained shadows/borders.
- Keep generated HTML/PDF out of the source repo unless the repo explicitly wants built artifacts; document repeatable `marp-cli` commands instead.
- Verify the deck by exporting HTML and representative PNG slides.

Applied design decisions in this deck:

- Added `themes/mcp-modern.css` as a reusable custom Marp theme.
- Kept the Markdown source as the primary artifact.
- Added section-divider slides for Frontend, Cloud, and Developer MCPs.
- Added `compact`, `dense`, `split`, `cards`, and `rank` classes to control information density per slide.
- Used a calm technical palette with teal, vermilion, and violet accents rather than a single-hue theme.
- Verified with `marp-cli` HTML export and PNG export for visual inspection.

## Slide essence

If the presentation must be short, compress to 6 messages:

1. MCP standardizes how agents connect to external context and actions.
2. The architecture is Host -> isolated Client -> Server.
3. The core primitives are Resources, Prompts, and Tools.
4. Transports split into local stdio and remote Streamable HTTP.
5. Production MCP is mostly about trust: OAuth, consent, scopes, auditing, and server allowlists.
6. The future is registry + remote servers + MCP Apps + durable agent tasks.

## Open questions for final deck

- Audience level: general internal audience or engineer-heavy?
- Length: 10 minutes, 20 minutes, or 45 minutes?
- Should examples focus on Codex workflow, Claude/Cursor workflow, or company-wide agent platform?
- Should we include a live demo, such as GitHub/Figma/Sentry/Firecrawl MCP usage?
