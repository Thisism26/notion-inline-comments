<div align="center">

# 💬 notion-inline-comments

**The missing piece of Notion's API.**

Extract inline comments with the exact text they were attached to.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇰🇷 한국어](./README.ko.md)

</div>

---

## Why?

When you highlight text in Notion and leave a comment, Notion knows *exactly* which text you selected.

But the official API **throws that information away**:

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

## How?

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
              ┌─────────────────────┐
              │ "design tokens"     │
              │  → "This is a key   │
              │    design decision" │
              └─────────────────────┘
```

The Notion web app uses an internal API endpoint (`/api/v3/loadPageChunk`) that returns `discussion` objects — each containing a `context` field with the **exact selected text**. We merge this with official API comment data using `discussionId` as the key.

---

## Quick Start

```bash
npm install notion-inline-comments
```

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments, mapped, total } = await fetchInlineComments({
  pageId: 'your-notion-page-id',
  apiKey: process.env.NOTION_API_KEY,
});

console.log(`✅ ${mapped}/${total} comments mapped`);

for (const c of comments) {
  console.log(`"${c.contextText}" → "${c.text}"`);
}
```

```
✅ 3/3 comments mapped
"design tokens"        → "These define the visual foundation..."
"warm neutral palette" → "All colors should maintain warmth..."
"responsive layout"    → "Consider mobile-first breakpoints..."
```

---

## API

### `fetchInlineComments(options)`

The main function. Fetches all inline comments from a Notion page with text mapping.

```typescript
const result = await fetchInlineComments({
  pageId: string,    // Notion page ID (required)
  apiKey: string,    // Integration API key (required)
  tokenV2?: string,  // Browser cookie for private pages (optional)
});
```

**Returns:**

```typescript
{
  comments: InlineComment[],
  mapped: number,   // how many comments have contextText
  total: number,    // total comments found
}
```

**`InlineComment`:**

| Field | Type | Description |
|-------|------|-------------|
| `contextText` | `string \| null` | The exact highlighted text. `null` if mapping failed |
| `text` | `string` | The comment body |
| `author` | `string` | Who wrote it |
| `blockId` | `string` | Which block it belongs to |
| `discussionId` | `string` | Links official ↔ internal API data |
| `createdAt` | `string` | ISO 8601 timestamp |

---

### Helpers

#### `groupByBlock(comments)`

```javascript
import { groupByBlock } from 'notion-inline-comments';

const blocks = groupByBlock(result.comments);
// { "block-1": [comment, comment], "block-2": [comment] }
```

#### `groupByContext(comments)`

```javascript
import { groupByContext } from 'notion-inline-comments';

const contexts = groupByContext(result.comments);
// Map { "design tokens" => [comment], "layout" => [comment] }
```

---

## Use Cases

**🎨 Portfolio / Blog** — Show Notion comments as hover tooltips on the exact text they reference

**📝 Documentation** — Extract annotation context for review workflows

**🔍 Content Analysis** — Map feedback to specific phrases in your writing

---

## Requirements

- **Node.js** ≥ 18
- A [Notion Integration](https://www.notion.so/my-integrations) with page access

## Limitations

> This package uses [`notion-client`](https://github.com/NotionX/react-notion-x) (unofficial API) to access discussion context data. While widely used and actively maintained, internal APIs can change without notice.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
