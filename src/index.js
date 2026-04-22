/**
 * notion-inline-comments
 * 
 * Combines Notion's official API with its internal API to map
 * inline comments to the exact text they were attached to.
 * 
 * The official API alone cannot tell you "which text was selected
 * when a comment was created." This package uses the discussion.context
 * field from the internal API (via notion-client) to provide
 * a 1:1 comment ↔ text mapping.
 */

import { Client } from '@notionhq/client';

// ─── Rate-limited fetch wrapper ────────────────────────

/**
 * Retries a function on 429 (rate limit) errors with exponential backoff.
 */
async function withRetry(fn, { maxRetries = 3, baseDelay = 1000 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.code === 'rate_limited';
      if (!isRateLimit || attempt === maxRetries) throw err;

      const retryAfter = err?.headers?.['retry-after'];
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : baseDelay * Math.pow(2, attempt);

      console.warn(`[notion-inline-comments] Rate limited, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── Official API: collect comments ────────────────────

/**
 * Walks all blocks in a page and collects their comments.
 * Handles rate limiting automatically.
 */
async function fetchOfficialComments(notion, pageId) {
  const comments = [];

  async function walkBlocks(parentId) {
    let cursor;
    do {
      const res = await withRetry(() =>
        notion.blocks.children.list({
          block_id: parentId,
          start_cursor: cursor,
          page_size: 100,
        })
      );

      for (const block of res.results) {
        // Fetch comments for each block
        try {
          let commentCursor;
          do {
            const cRes = await withRetry(() =>
              notion.comments.list({
                block_id: block.id,
                start_cursor: commentCursor,
              })
            );
            for (const c of cRes.results) {
              comments.push({
                blockId: block.id,
                discussionId: c.discussion_id,
                commentId: c.id,
                text: c.rich_text?.map(rt => rt.plain_text).join('') || '',
                author: c.created_by?.name || '',
                createdAt: c.created_time,
              });
            }
            commentCursor = cRes.has_more ? cRes.next_cursor : null;
          } while (commentCursor);
        } catch {
          // Ignore blocks that don't support comments
        }

        // Recurse into child blocks
        if (block.has_children) {
          await walkBlocks(block.id);
        }
      }

      cursor = res.has_more ? res.next_cursor : null;
    } while (cursor);
  }

  await walkBlocks(pageId);
  return comments;
}

// ─── Internal API: discussion metadata ─────────────────

/**
 * Fetches full discussion metadata via the internal API,
 * including context (selected text), highlight color, and resolved status.
 */
async function fetchDiscussionData(pageId, options = {}) {
  const { NotionAPI } = await import('notion-client');
  const apiOptions = {};
  if (options.token) {
    apiOptions.authToken = options.token;
  }
  const api = new NotionAPI(apiOptions);

  const cleanId = pageId.replace(/-/g, '');
  const data = await api.getPage(cleanId);
  const discussions = data.discussion || {};

  const map = {};
  for (const d of Object.values(discussions)) {
    const v = d.value?.value;
    if (!v?.id) continue;

    // Extract context text from annotation array
    const contextText = v.context
      ? v.context.map(c => c[0]).join('')
      : null;

    // Extract highlight color from annotation "h" (highlight)
    let highlightColor = null;
    if (v.context?.[0]?.[1]) {
      for (const ann of v.context[0][1]) {
        if (ann[0] === 'h') {
          highlightColor = ann[1]; // e.g. "yellow_background"
        }
      }
    }

    map[v.id] = {
      contextText,
      highlightColor,
      resolved: v.resolved || false,
      commentIds: v.comments || [],
      parentBlockId: v.parent_id || null,
    };
  }

  return map;
}

// ─── Public API ───────────────────────────────────────

/**
 * Fetches inline comments from a Notion page with exact text mapping.
 * Both API calls run in parallel for faster execution.
 * Rate limiting is handled automatically with exponential backoff.
 * 
 * @param {Object} options
 * @param {string} options.pageId - Notion page ID
 * @param {string} options.apiKey - Notion Integration API key
 * @param {string} [options.tokenV2] - Browser token_v2 cookie (for private pages)
 * @param {boolean} [options.includeResolved=false] - Include resolved comments
 * @returns {Promise<InlineCommentResult>}
 * 
 * @example
 * ```javascript
 * import { fetchInlineComments } from 'notion-inline-comments';
 * 
 * const result = await fetchInlineComments({
 *   pageId: 'your-notion-page-id',
 *   apiKey: process.env.NOTION_API_KEY,
 * });
 * 
 * result.comments.forEach(c => {
 *   console.log(c.contextText);     // "design tokens"
 *   console.log(c.text);            // "These define the visual foundation..."
 *   console.log(c.highlightColor);  // "yellow_background"
 *   console.log(c.resolved);        // false
 * });
 * ```
 */
export async function fetchInlineComments({ pageId, apiKey, tokenV2, includeResolved = false }) {
  if (!pageId) throw new Error('pageId is required');
  if (!apiKey) throw new Error('apiKey is required');

  const notion = new Client({ auth: apiKey });

  // Run both API calls in parallel
  const [rawComments, discussionMap] = await Promise.all([
    fetchOfficialComments(notion, pageId),
    fetchDiscussionData(pageId, { token: tokenV2 }).catch(err => {
      console.warn(`[notion-inline-comments] Failed to fetch discussion data: ${err.message}`);
      return {};
    }),
  ]);

  if (rawComments.length === 0) {
    return { comments: [], discussions: [], mapped: 0, total: 0 };
  }

  // Merge by discussionId
  const comments = rawComments.map(c => {
    const disc = discussionMap[c.discussionId] || {};
    return {
      contextText: disc.contextText || null,
      text: c.text,
      author: c.author,
      highlightColor: disc.highlightColor || null,
      resolved: disc.resolved || false,
      blockId: c.blockId,
      discussionId: c.discussionId,
      commentId: c.commentId,
      createdAt: c.createdAt,
    };
  });

  // Filter by resolved status
  const filtered = includeResolved
    ? comments
    : comments.filter(c => !c.resolved);

  const mapped = filtered.filter(c => c.contextText !== null).length;

  // Group into discussion threads
  const threadMap = {};
  for (const c of filtered) {
    if (!threadMap[c.discussionId]) {
      threadMap[c.discussionId] = {
        discussionId: c.discussionId,
        contextText: c.contextText,
        highlightColor: c.highlightColor,
        resolved: c.resolved,
        blockId: c.blockId,
        comments: [],
      };
    }
    threadMap[c.discussionId].comments.push({
      commentId: c.commentId,
      text: c.text,
      author: c.author,
      createdAt: c.createdAt,
    });
  }
  const discussions = Object.values(threadMap);

  return {
    comments: filtered,
    discussions,
    mapped,
    total: filtered.length,
  };
}

/**
 * Group comments by blockId.
 */
export function groupByBlock(comments) {
  const map = {};
  for (const c of comments) {
    if (!c.blockId) continue;
    if (!map[c.blockId]) map[c.blockId] = [];
    map[c.blockId].push(c);
  }
  return map;
}

/**
 * Group comments by contextText.
 */
export function groupByContext(comments) {
  const map = new Map();
  for (const c of comments) {
    if (!c.contextText) continue;
    if (!map.has(c.contextText)) map.set(c.contextText, []);
    map.get(c.contextText).push(c);
  }
  return map;
}

/**
 * Filter to resolved comments only.
 */
export function filterResolved(comments) {
  return comments.filter(c => c.resolved);
}

/**
 * Filter to unresolved comments only.
 */
export function filterUnresolved(comments) {
  return comments.filter(c => !c.resolved);
}

/**
 * Group comments by highlight color.
 */
export function groupByHighlight(comments) {
  const map = {};
  for (const c of comments) {
    const color = c.highlightColor || 'none';
    if (!map[color]) map[color] = [];
    map[color].push(c);
  }
  return map;
}
