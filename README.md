# notion-inline-comments

> Extract Notion inline comments with **exact text mapping**.
> Know exactly which text was selected when a comment was made.

## The Problem

Notion's official API gives you comments but **doesn't tell you which text was selected** when the comment was created:

```
Official API returns:
  ✅ Comment text: "This defines the visual foundation..."
  ✅ Block ID: "abc123-..."
  ❌ Selected text: ??? (unknown)
```

This package solves that by combining the official API with Notion's internal API:

```
notion-inline-comments returns:
  ✅ Comment text: "This defines the visual foundation..."
  ✅ Block ID: "abc123-..."
  ✅ Selected text: "design tokens"  ← the exact text the user highlighted
```

## Install

```bash
npm install notion-inline-comments
```

## Usage

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const result = await fetchInlineComments({
  pageId: 'your-notion-page-id',
  apiKey: process.env.NOTION_API_KEY,
});

console.log(`${result.mapped}/${result.total} comments mapped to exact text`);

for (const comment of result.comments) {
  console.log(`"${comment.contextText}" → "${comment.text}"`);
}
```

Output:

```
3/3 comments mapped to exact text
"design tokens" → "These define the visual foundation..."
"warm neutral palette" → "All colors maintain a warm tone..."
"responsive layout" → "Consider mobile-first breakpoints..."
```

## API

### `fetchInlineComments(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `pageId` | `string` | ✅ | Notion page ID |
| `apiKey` | `string` | ✅ | Notion Integration API key |
| `tokenV2` | `string` | | Browser token_v2 cookie (for private pages) |

Returns `Promise<InlineCommentResult>`:

```typescript
{
  comments: InlineComment[];  // All comments with text mapping
  mapped: number;             // Comments with successful text mapping
  total: number;              // Total comment count
}
```

Each `InlineComment`:

```typescript
{
  contextText: string | null; // Exact text that was highlighted (null if mapping failed)
  text: string;               // Comment content
  author: string;             // Author name
  blockId: string;            // Block the comment was made on
  discussionId: string;       // Discussion ID (links official ↔ unofficial API)
  createdAt: string;          // ISO 8601 timestamp
}
```

### `groupByBlock(comments)`

Group comments by `blockId`:

```javascript
import { fetchInlineComments, groupByBlock } from 'notion-inline-comments';

const result = await fetchInlineComments({ ... });
const byBlock = groupByBlock(result.comments);
// { "block-id-1": [comment, comment], "block-id-2": [comment] }
```

### `groupByContext(comments)`

Group comments by `contextText`:

```javascript
import { fetchInlineComments, groupByContext } from 'notion-inline-comments';

const result = await fetchInlineComments({ ... });
const byContext = groupByContext(result.comments);
// Map { "design tokens" => [comment], "layout grid" => [comment] }
```

## How It Works

```
1. Official API  →  Comment text + discussionId
2. Unofficial API (notion-client)  →  discussion.context (selected text)
3. Merge by discussionId  →  "design tokens" = "These define the visual foundation..."
```

The unofficial Notion API (`/api/v3/loadPageChunk`) returns a `discussion` object for each comment thread. This object contains a `context` field with the **exact text that was selected** when the comment was created — data the official API doesn't expose.

## Requirements

- Node.js >= 18
- A Notion Integration with access to the target page
- The page must be shared with the Integration

## License

MIT
