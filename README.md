<div align="center">

# 💬 notion-inline-comments

**The missing piece of Notion's API.**

Extract inline comments with the exact text they were attached to.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇰🇷 한국어](./README.ko.md)

<br />

<img src="./assets/hero.png" alt="Notion page → notion-inline-comments → structured data" width="600" />

</div>

---

## The Problem

When you highlight text in Notion and add a comment, Notion knows *exactly* which words you selected — **but the official API doesn't give you that information.**

```diff
- Official API:  comment ✅  block ✅  selected text ❌
+ This package:  comment ✅  block ✅  selected text ✅
```

---

## Install

```bash
npm install notion-inline-comments
```

## Usage

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments } = await fetchInlineComments({
  pageId: 'your-page-id',
  apiKey: 'secret_xxx',
});

comments.forEach(c => {
  console.log(c.contextText);  // "design tokens"  ← highlighted text
  console.log(c.text);         // "These define..." ← comment body
});
```

### Real-World Use Case

Render Notion comments as hover tooltips — each on the exact text they were attached to:

<div align="center">
<img src="./assets/demo-tooltip.png" alt="Hover tooltip on highlighted text" width="480" />
</div>

---

## How It Works

<div align="center">
<img src="./assets/how-it-works.png" alt="3-step flow: Official API + Internal API → Merge" width="560" />
</div>

<br />

> The Notion web app uses an internal endpoint that returns `discussion` objects with a `context` field — the exact selected text. We merge this with official API data using `discussionId`.

---

## API

### `fetchInlineComments({ pageId, apiKey, tokenV2? })`

| Option | Required | Description |
|--------|:--------:|-------------|
| `pageId` | ✅ | Page ID from the Notion URL |
| `apiKey` | ✅ | Integration token |
| `tokenV2` | | Browser cookie (private pages only) |

**Returns:**

```typescript
{
  comments: [{
    contextText: string | null,  // highlighted text
    text: string,                // comment body
    author: string,
    blockId: string,
    discussionId: string,
    createdAt: string,
  }],
  mapped: number,
  total: number,
}
```

### Helpers

```javascript
groupByBlock(comments);    // { blockId: [comments] }
groupByContext(comments);  // Map { "text" => [comments] }
```

---

## Requirements

- **Node.js** ≥ 18
- A [Notion Integration](https://www.notion.so/my-integrations) with page access

> **Note:** Uses [`notion-client`](https://github.com/NotionX/react-notion-x) (unofficial) for discussion context. Internal APIs can change without notice.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
