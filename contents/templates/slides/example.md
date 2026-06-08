---
marp: true
theme: research
paginate: true
---

<!-- _class: title -->

<div class="eyebrow">research-docs slide templates</div>

# 調査結果を再利用できるスライドにする

<p class="lead">スタイルガイド、レイアウトパターン、視覚検証をセットで運用する。</p>

---

<!-- _class: section -->

<div class="eyebrow">01</div>

# なぜ標準化するのか

<p class="lead">毎回ゼロから作るほど、見た目と論旨のばらつきが増える。</p>

---

<div class="eyebrow">pattern 03</div>

# 2カラム比較

<p class="lead">期待と現実、仮説と検証、現状と提案を並べて差分を見せる。</p>

<div class="grid two">
  <div class="panel strong">
    <h2>期待</h2>
    <ul>
      <li>AIで調査作業が短くなる</li>
      <li>スライド作成も自動化される</li>
      <li>成果物の品質が安定する</li>
    </ul>
  </div>
  <div class="panel teal">
    <h2>現実</h2>
    <ul>
      <li>出典確認と構成判断は残る</li>
      <li>レンダリング後の崩れは起きる</li>
      <li>再利用ルールがないと揺れる</li>
    </ul>
  </div>
</div>

---

<div class="eyebrow">pattern 04</div>

# 3カードの統合

<p class="lead">複数の観点を同じ粒度で並べ、結論へ収束させる。</p>

<div class="grid three">
  <div class="panel">
    <h2>構造</h2>
    <p>タイトル、主張、根拠、出典の位置を固定する。</p>
  </div>
  <div class="panel">
    <h2>表現</h2>
    <p>色と文字サイズを限定し、読み手の注意を誘導する。</p>
  </div>
  <div class="panel">
    <h2>検証</h2>
    <p>HTML/PDF とスクリーンショットで崩れを確認する。</p>
  </div>
</div>

---

<div class="eyebrow">pattern 05</div>

# 2x2リサーチマトリクス

<p class="lead">論点を分解し、未検証領域や次の調査対象を明らかにする。</p>

<div class="matrix">
  <div>
    <h3>既知</h3>
    <p>記事化済み、または一次情報で確認済みの知識。</p>
  </div>
  <div>
    <h3>未確認</h3>
    <p>追加調査や反証確認が必要な仮説。</p>
  </div>
  <div>
    <h3>影響大</h3>
    <p>判断や実装方針を変える可能性がある論点。</p>
  </div>
  <div>
    <h3>影響小</h3>
    <p>補足や背景として扱える論点。</p>
  </div>
</div>

---

<div class="eyebrow">pattern 06</div>

# ステップタイムライン

<p class="lead">作業プロセスや移行計画を、実行順に説明する。</p>

<div class="timeline">
  <div class="step">
    <div class="step-number">1</div>
    <div><strong>構成を決める</strong><br><span class="text-muted">1スライド1メッセージでアウトライン化する。</span></div>
  </div>
  <div class="step">
    <div class="step-number">2</div>
    <div><strong>パターンを選ぶ</strong><br><span class="text-muted">`contents/templates/slides/example.md` から近いレイアウトを使う。</span></div>
  </div>
  <div class="step">
    <div class="step-number">3</div>
    <div><strong>レンダリング確認</strong><br><span class="text-muted">スクリーンショットで余白、重なり、切れを確認する。</span></div>
  </div>
</div>

---

<div class="eyebrow">pattern 07</div>

# 統計ハイライト

<p class="lead">数値を主役にする場合は、カード数を絞って意味を添える。</p>

<div class="stat-grid">
  <div class="stat">
    <span class="stat-value">10</span>
    <p>初期パターン</p>
  </div>
  <div class="stat primary">
    <span class="stat-value">1</span>
    <p>共通テーマ</p>
  </div>
  <div class="stat">
    <span class="stat-value">3</span>
    <p>アクセント色</p>
  </div>
</div>

<p class="caption">注: 数値はこのテンプレート導入時点の構成を示す。</p>

---

<div class="eyebrow">pattern 08</div>

# 根拠と限界を並べる

<p class="lead">調査資料では、主張だけでなく不確実性も同じ画面で扱う。</p>

<div class="grid two">
  <div class="panel teal">
    <h2>根拠</h2>
    <ul>
      <li>出典が明示されている</li>
      <li>再現可能な手順がある</li>
      <li>複数の観点で確認している</li>
    </ul>
  </div>
  <div class="panel amber">
    <h2>限界</h2>
    <ul>
      <li>事例依存の可能性がある</li>
      <li>ツール更新で手順が変わる</li>
      <li>視覚品質は実レンダーで確認する</li>
    </ul>
  </div>
</div>

---

<div class="eyebrow">pattern 09</div>

# 引用と解釈

<blockquote>
コード上の正しさと、スライドとしての見た目の正しさは別に検証する。
</blockquote>

<p class="quote-source">Source note: Qiita 参照記事の視覚的品質検証の考え方を research-docs 向けに要約。</p>

---

<div class="eyebrow">pattern 10</div>

# まとめ

<div class="grid three">
  <div class="panel">
    <h2>言語化</h2>
    <p>スタイルガイドで判断基準を共有する。</p>
  </div>
  <div class="panel">
    <h2>再利用</h2>
    <p>パターン集から選んで一貫性を守る。</p>
  </div>
  <div class="panel">
    <h2>確認</h2>
    <p>レンダリング後の見た目を完了条件にする。</p>
  </div>
</div>
