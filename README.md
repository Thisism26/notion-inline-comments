<div align="center">

# 💬 notion-inline-comments

**The missing piece of Notion's API.**

Extract inline comments with the exact text they were attached to.

[![CI](https://github.com/Thisism26/notion-inline-comments/actions/workflows/ci.yml/badge.svg)](https://github.com/Thisism26/notion-inline-comments/actions)
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

## Why Two APIs?

Notion has two separate APIs, and **each knows something the other doesn't**:

| | Official API (`api.notion.com`) | Internal API (`notion.so/api/v3`) |
|---|---|---|
| Comment body | ✅ Full text | ❌ IDs only |
| Author name | ✅ Display name | ❌ User ID only |
| Selected text | ❌ **Not available** | ✅ `discussion.context` |
| Highlight color | ❌ | ✅ |
| Resolved status | ❌ | ✅ |

**This package merges both**, using `discussionId` as the key:

<div align="center">
<img src="./assets/how-it-works.png" alt="3-step flow: Official API + Internal API → Merge" width="520" />
</div>

---

## Install

```bash
npm install notion-inline-comments
```

## Quick Start

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments } = await fetchInlineComments({
  pageId: 'your-page-id',
  apiKey: 'secret_xxx',
});

comments.forEach(c => {
  console.log(c.contextText);     // "design tokens"       ← highlighted text
  console.log(c.text);            // "These define..."      ← comment body
  console.log(c.blockText);       // "The design tokens..." ← full block text
  console.log(c.highlightColor);  // "yellow_background"
  console.log(c.resolved);        // false
});
```

### Scan an Entire Database

```javascript
import { fetchFromDatabase } from 'notion-inline-comments';

const result = await fetchFromDatabase({
  databaseId: 'your-db-id',
  apiKey: 'secret_xxx',
});

console.log(`Scanned ${result.totalPages} pages, ${result.totalMapped} comments mapped`);
result.pages.forEach(p => {
  console.log(`${p.title}: ${p.result.total} comments`);
});
```

### CLI

```bash
# Single page
npx notion-inline-comments <page-id> --api-key secret_xxx

# Export as CSV
npx notion-inline-comments <page-id> --api-key secret_xxx --format csv > comments.csv

# Scan database
npx notion-inline-comments <db-id> --database --api-key secret_xxx
```

### Real-World Use Case

<div align="center">
<img src="./assets/demo-tooltip.png" alt="Hover tooltip on highlighted text" width="480" />
</div>

---

## API

### `fetchInlineComments(options)`

| Option | Required | Description |
|--------|:--------:|-------------|
| `pageId` | ✅ | Page ID from the Notion URL |
| `apiKey` | ✅ | Integration token |
| `tokenV2` | | Browser cookie (private pages only) |
| `includeResolved` | | Include resolved comments (default: `false`) |
| `silent` | | Suppress console warnings (default: `false`) |
| `cachePath` | | File path for caching (e.g. `.nic-cache.json`) |

### `fetchFromDatabase(options)`

| Option | Required | Description |
|--------|:--------:|-------------|
| `databaseId` | ✅ | Database ID |
| `apiKey` | ✅ | Integration token |
| `tokenV2` | | Browser cookie |
| `limit` | | Max pages to scan |
| `silent` | | Suppress console warnings |
| `cachePath` | | File path for caching |

### `InlineComment`

| Field | Type | Description |
|-------|------|-------------|
| `contextText` | `string \| null` | Highlighted text |
| `text` | `string` | Comment body (plain text) |
| `richText` | `RichTextSegment[]` | Rich text with links, mentions, formatting |
| `author` | `string` | Author name |
| `avatarUrl` | `string \| null` | Author profile image URL |
| `blockText` | `string \| null` | Full block text |
| `highlightColor` | `string \| null` | e.g. `"yellow_background"` |
| `resolved` | `boolean` | Resolved status |
| `blockId` | `string` | Block ID |
| `discussionId` | `string` | Thread ID |
| `commentId` | `string` | Comment ID |
| `createdAt` | `string` | ISO 8601 |

### Helpers

```javascript
import {
  groupByBlock,         // { blockId: [comments] }
  groupByContext,        // Map { "text" => [comments] }
  groupByHighlight,      // { "yellow_background": [...] }
  filterResolved,        // resolved only
  filterUnresolved,      // unresolved only
  toCSV,                 // CSV string
  toMarkdown,            // Markdown string
} from 'notion-inline-comments';
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
