---
name: "research-topic"
root: "."
output: "."
questions:
  themeId: "Theme ID in kebab-case, used for filenames and URLs."
  title: "Research theme title."
  description: "One-sentence theme description."
  owner: "Owner name."
---

# `contents/{{ inputs.themeId | kebab }}/themes/{{ inputs.themeId | kebab }}.md`

```markdown
---
title: {{ inputs.title }}
description: {{ inputs.description }}
kind: theme
themeId: {{ inputs.themeId | kebab }}
status: active
owner: {{ inputs.owner }}
updatedAt: {{ date "YYYY-MM-DD" }}
order: 0
---

# {{ inputs.title }}

{{ inputs.description }}

## Artifacts

- Slide deck: [`../slides/{{ inputs.themeId | kebab }}.md`](../slides/{{ inputs.themeId | kebab }}.md)
- Research notes: [`../research/{{ inputs.themeId | kebab }}.md`](../research/{{ inputs.themeId | kebab }}.md)
- Source links: [`../sources/{{ inputs.themeId | kebab }}.md`](../sources/{{ inputs.themeId | kebab }}.md)
- Research tasks: [`../tasks/{{ inputs.themeId | kebab }}.md`](../tasks/{{ inputs.themeId | kebab }}.md)
```

# `contents/{{ inputs.themeId | kebab }}/slides/{{ inputs.themeId | kebab }}.md`

```markdown
---
marp: true
theme: research
paginate: true
size: 16:9
title: {{ inputs.title }}
navTitle: {{ inputs.title }}
description: {{ inputs.description }}
kind: slides
themeId: {{ inputs.themeId | kebab }}
order: 10
footer: "{{ inputs.title }}"
---

<!-- _class: title -->

<div class="eyebrow">research-docs</div>

# {{ inputs.title }}

<p class="lead">{{ inputs.description }}</p>

{{ date "YYYY-MM-DD" }}

---

<!-- _class: section -->

<div class="eyebrow">01</div>

# Key question

<p class="lead">このテーマで明らかにする問いを1文で置く。</p>
```

# `contents/{{ inputs.themeId | kebab }}/research/{{ inputs.themeId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} research notes
description: {{ inputs.description }}
kind: research
themeId: {{ inputs.themeId | kebab }}
order: 20
---

# {{ inputs.title }} research notes

## Research question

{{ inputs.description }}

## Notes

-
```

# `contents/{{ inputs.themeId | kebab }}/sources/{{ inputs.themeId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} source links
description: Source links for {{ inputs.title }}.
kind: sources
themeId: {{ inputs.themeId | kebab }}
order: 30
---

# {{ inputs.title }} source links

## Sources

-
```

# `contents/{{ inputs.themeId | kebab }}/tasks/{{ inputs.themeId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} research tasks
description: Research task checklist for {{ inputs.title }}.
kind: task
themeId: {{ inputs.themeId | kebab }}
order: 40
---

# {{ inputs.title }} research tasks

## Checklist

- [ ] Confirm scope and audience.
- [ ] Collect primary sources.
- [ ] Draft slide outline.
- [ ] Verify rendered deck.
```
