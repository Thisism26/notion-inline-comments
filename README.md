<div align="center">

# 💬 notion-inline-comments

**The missing piece of Notion's API.**

Extract inline comments with the exact text they were attached to.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇰🇷 한국어](./README.ko.md)

<br />

<img src="./assets/hero.png" alt="Notion page with highlighted comments being extracted to structured data" width="640" />

</div>

---

## Why?

When you highlight text in Notion and add a comment, Notion knows *exactly* which words you selected.

**But the official API doesn't give you that information.**

```diff
  Official API response:
  ✅ comment:  "This is a key design decision..."
  ✅ block:    "abc123..."
- ❌ selected: ???
```

This package gets it back:

```diff
  notion-inline-comments:
  ✅ comment:  "This is a key design decision..."
  ✅ block:    "abc123..."
+ ✅ selected: "design tokens"  ← the exact highlighted text
```

---

## Install

```bash
npm install notion-inline-comments
```

## Usage

**3 lines is all you need:**

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments } = await fetchInlineComments({
  pageId: 'your-page-id',      // from the Notion URL
  apiKey: 'secret_xxx',         // from notion.so/my-integrations
});

// That's it. Each comment now has .contextText
comments.forEach(c => {
  console.log(c.contextText);   // "design tokens"  ← highlighted text
  console.log(c.text);          // "These define..." ← comment body
});
```

### Real-World Example

Use it to render Notion comments as hover tooltips — each mapped to the exact source text:

<div align="center">
<img src="./assets/demo-tooltip.png" alt="Hover tooltip showing Notion comment on the exact highlighted text" width="640" />
<br />
<em>Hover on "literary salon" → shows only that comment's content</em>
</div>

---

## How It Works

```
  Official Notion API              Unofficial Internal API
  ─────────────────────            ──────────────────────────
  "This is a key decision..."      discussion.context:
   + discussionId: abc-123          "design tokens"
   + blockId: def-456               + discussionId: abc-123
         │                                │
         └────────── merge by ID ─────────┘
                        │
                        ▼
              ┌─────────────────────────────┐
              │  contextText: "design tokens"│
              │  text: "This is a key        │
              │        design decision..."   │
              └─────────────────────────────┘
```

The Notion web app uses an internal endpoint (`/api/v3/loadPageChunk`) that returns `discussion` objects, each with a `context` field containing the selected text. We merge this with official API data using `discussionId`.

---

## API Reference

### `fetchInlineComments(options)` → `Promise<Result>`

| Option | Type | Required | Description |
|--------|------|:--------:|-------------|
| `pageId` | `string` | ✅ | Page ID from the Notion URL |
| `apiKey` | `string` | ✅ | Integration token from [notion.so/my-integrations](https://notion.so/my-integrations) |
| `tokenV2` | `string` | | Browser cookie for private pages |

**Result:**

```typescript
{
  comments: [{
    contextText: string | null,  // highlighted text (null if unmapped)
    text: string,                // comment body
    author: string,              // who wrote it
    blockId: string,
    discussionId: string,
    createdAt: string,           // ISO 8601
  }],
  mapped: number,  // comments with contextText
  total: number,   // all comments
}
```

### Helpers

```javascript
import { groupByBlock, groupByContext } from 'notion-inline-comments';

// Group by block
groupByBlock(comments);   // { "block-1": [...], "block-2": [...] }

// Group by highlighted text
groupByContext(comments);  // Map { "design tokens" => [...] }
```

---

## Requirements

- **Node.js** ≥ 18
- A [Notion Integration](https://www.notion.so/my-integrations) with access to the page

> **Note:** This package uses [`notion-client`](https://github.com/NotionX/react-notion-x) (unofficial API) for discussion context. Internal APIs can change without notice.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
