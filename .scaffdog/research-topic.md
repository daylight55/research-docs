---
name: "research-topic"
root: "."
output: "."
questions:
  topicId: "Topic ID in kebab-case, used for filenames and URLs."
  title: "Research topic title."
  description: "One-sentence topic description."
  owner: "Owner name."
---

# `contents/{{ inputs.topicId | kebab }}/overview/{{ inputs.topicId | kebab }}.md`

```markdown
---
title: {{ inputs.title }}
description: {{ inputs.description }}
kind: topic
topicId: {{ inputs.topicId | kebab }}
status: active
owner: {{ inputs.owner }}
updatedAt: {{ date "YYYY-MM-DD" }}
order: 0
---

# {{ inputs.title }}

{{ inputs.description }}

## Artifacts

- Slide deck: [`../slides/{{ inputs.topicId | kebab }}.md`](../slides/{{ inputs.topicId | kebab }}.md)
- Research notes: [`../research/{{ inputs.topicId | kebab }}.md`](../research/{{ inputs.topicId | kebab }}.md)
- Source links: [`../sources/{{ inputs.topicId | kebab }}.md`](../sources/{{ inputs.topicId | kebab }}.md)
- Research tasks: [`../tasks/{{ inputs.topicId | kebab }}.md`](../tasks/{{ inputs.topicId | kebab }}.md)
```

# `contents/{{ inputs.topicId | kebab }}/slides/{{ inputs.topicId | kebab }}.md`

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
topicId: {{ inputs.topicId | kebab }}
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

<p class="lead">このトピックで明らかにする問いを1文で置く。</p>
```

# `contents/{{ inputs.topicId | kebab }}/research/{{ inputs.topicId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} research notes
description: {{ inputs.description }}
kind: research
topicId: {{ inputs.topicId | kebab }}
order: 20
---

# {{ inputs.title }} research notes

## Research question

{{ inputs.description }}

## Notes

-
```

# `contents/{{ inputs.topicId | kebab }}/sources/{{ inputs.topicId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} source links
description: Source links for {{ inputs.title }}.
kind: sources
topicId: {{ inputs.topicId | kebab }}
order: 30
---

# {{ inputs.title }} source links

## Sources

-
```

# `contents/{{ inputs.topicId | kebab }}/tasks/{{ inputs.topicId | kebab }}.md`

```markdown
---
title: {{ inputs.title }} research tasks
description: Research task checklist for {{ inputs.title }}.
kind: task
topicId: {{ inputs.topicId | kebab }}
order: 40
---

# {{ inputs.title }} research tasks

## Checklist

- [ ] Confirm scope and audience.
- [ ] Collect primary sources.
- [ ] Draft slide outline.
- [ ] Verify rendered deck.
```
