/**
 * notion-inline-comments
 *
 * Combines Notion's official API with its internal API to map
 * inline comments to the exact text they were attached to.
 */

import { Client } from '@notionhq/client';

// ─── Types ─────────────────────────────────────────────

export interface InlineComment {
  /** The exact text the user highlighted */
  contextText: string | null;
  /** Comment body */
  text: string;
  /** Author display name */
  author: string;
  /** Notion highlight color (e.g. "yellow_background") */
  highlightColor: string | null;
  /** Whether the discussion thread is resolved */
  resolved: boolean;
  /** Full text of the block this comment belongs to */
  blockText: string | null;
  /** Block ID */
  blockId: string;
  /** Discussion thread ID */
  discussionId: string;
  /** Individual comment ID */
  commentId: string;
  /** Comment creation time (ISO 8601) */
  createdAt: string;
}

export interface DiscussionThread {
  discussionId: string;
  contextText: string | null;
  highlightColor: string | null;
  resolved: boolean;
  blockId: string;
  blockText: string | null;
  comments: {
    commentId: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
}

export interface InlineCommentResult {
  comments: InlineComment[];
  discussions: DiscussionThread[];
  mapped: number;
  total: number;
}

export interface FetchOptions {
  pageId: string;
  apiKey: string;
  tokenV2?: string;
  includeResolved?: boolean;
}

export interface DatabaseFetchOptions {
  databaseId: string;
  apiKey: string;
  tokenV2?: string;
  includeResolved?: boolean;
  /** Max pages to scan (default: all) */
  limit?: number;
}

export interface DatabaseResult {
  pages: {
    pageId: string;
    title: string;
    result: InlineCommentResult;
  }[];
  totalComments: number;
  totalMapped: number;
  totalPages: number;
}

interface RawComment {
  blockId: string;
  discussionId: string;
  commentId: string;
  text: string;
  author: string;
  createdAt: string;
}

interface DiscussionMeta {
  contextText: string | null;
  highlightColor: string | null;
  resolved: boolean;
  commentIds: string[];
  parentBlockId: string | null;
}

// ─── Rate-limited fetch wrapper ────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelay = 1000 } = {}
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
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
  throw new Error('Unreachable');
}

// ─── Official API: collect comments + block text ───────

async function fetchOfficialComments(
  notion: Client,
  pageId: string
): Promise<{ comments: RawComment[]; blockTexts: Record<string, string> }> {
  const comments: RawComment[] = [];
  const blockTexts: Record<string, string> = {};

  async function walkBlocks(parentId: string) {
    let cursor: string | undefined;
    do {
      const res = await withRetry(() =>
        notion.blocks.children.list({
          block_id: parentId,
          start_cursor: cursor,
          page_size: 100,
        })
      );

      for (const block of res.results) {
        const b = block as any;

        // Extract block text from rich_text
        const richText = b[b.type]?.rich_text;
        if (Array.isArray(richText)) {
          blockTexts[b.id] = richText.map((rt: any) => rt.plain_text).join('');
        }

        // Fetch comments for this block
        try {
          let commentCursor: string | undefined;
          do {
            const cRes = await withRetry(() =>
              notion.comments.list({
                block_id: b.id,
                start_cursor: commentCursor,
              })
            );
            for (const c of cRes.results as any[]) {
              comments.push({
                blockId: b.id,
                discussionId: c.discussion_id,
                commentId: c.id,
                text: c.rich_text?.map((rt: any) => rt.plain_text).join('') || '',
                author: c.created_by?.name || '',
                createdAt: c.created_time,
              });
            }
            commentCursor = cRes.has_more ? (cRes.next_cursor ?? undefined) : undefined;
          } while (commentCursor);
        } catch {
          // Ignore blocks that don't support comments
        }

        if (b.has_children) {
          await walkBlocks(b.id);
        }
      }

      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
  }

  await walkBlocks(pageId);
  return { comments, blockTexts };
}

// ─── Internal API: discussion metadata ─────────────────

async function fetchDiscussionData(
  pageId: string,
  options: { token?: string } = {}
): Promise<Record<string, DiscussionMeta>> {
  // @ts-ignore - notion-client types are incomplete
  const { NotionAPI } = await import('notion-client');
  const apiOptions: any = {};
  if (options.token) {
    apiOptions.authToken = options.token;
  }
  const api = new NotionAPI(apiOptions);

  const cleanId = pageId.replace(/-/g, '');
  const data = await api.getPage(cleanId);
  const discussions = (data as any).discussion || {};

  const map: Record<string, DiscussionMeta> = {};
  for (const d of Object.values(discussions) as any[]) {
    const v = d.value?.value;
    if (!v?.id) continue;

    const contextText = v.context
      ? v.context.map((c: any) => c[0]).join('')
      : null;

    let highlightColor: string | null = null;
    if (v.context?.[0]?.[1]) {
      for (const ann of v.context[0][1]) {
        if (ann[0] === 'h') {
          highlightColor = ann[1];
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

// ─── Core merge logic ──────────────────────────────────

function mergeResults(
  rawComments: RawComment[],
  discussionMap: Record<string, DiscussionMeta>,
  blockTexts: Record<string, string>,
  includeResolved: boolean
): InlineCommentResult {
  if (rawComments.length === 0) {
    return { comments: [], discussions: [], mapped: 0, total: 0 };
  }

  const comments: InlineComment[] = rawComments.map(c => {
    const disc = discussionMap[c.discussionId] || ({} as Partial<DiscussionMeta>);
    return {
      contextText: disc.contextText || null,
      text: c.text,
      author: c.author,
      highlightColor: disc.highlightColor || null,
      resolved: disc.resolved || false,
      blockText: blockTexts[c.blockId] || null,
      blockId: c.blockId,
      discussionId: c.discussionId,
      commentId: c.commentId,
      createdAt: c.createdAt,
    };
  });

  const filtered = includeResolved
    ? comments
    : comments.filter(c => !c.resolved);

  const mapped = filtered.filter(c => c.contextText !== null).length;

  const threadMap: Record<string, DiscussionThread> = {};
  for (const c of filtered) {
    if (!threadMap[c.discussionId]) {
      threadMap[c.discussionId] = {
        discussionId: c.discussionId,
        contextText: c.contextText,
        highlightColor: c.highlightColor,
        resolved: c.resolved,
        blockId: c.blockId,
        blockText: c.blockText,
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

  return {
    comments: filtered,
    discussions: Object.values(threadMap),
    mapped,
    total: filtered.length,
  };
}

// ─── Public API ───────────────────────────────────────

/**
 * Fetches inline comments from a Notion page with exact text mapping.
 * Both API calls run in parallel for faster execution.
 */
export async function fetchInlineComments({
  pageId,
  apiKey,
  tokenV2,
  includeResolved = false,
}: FetchOptions): Promise<InlineCommentResult> {
  if (!pageId) throw new Error('pageId is required');
  if (!apiKey) throw new Error('apiKey is required');

  const notion = new Client({ auth: apiKey });

  const [{ comments: rawComments, blockTexts }, discussionMap] = await Promise.all([
    fetchOfficialComments(notion, pageId),
    fetchDiscussionData(pageId, { token: tokenV2 }).catch(err => {
      console.warn(`[notion-inline-comments] Failed to fetch discussion data: ${err.message}`);
      return {} as Record<string, DiscussionMeta>;
    }),
  ]);

  return mergeResults(rawComments, discussionMap, blockTexts, includeResolved);
}

/**
 * Fetches inline comments from ALL pages in a Notion database.
 */
export async function fetchFromDatabase({
  databaseId,
  apiKey,
  tokenV2,
  includeResolved = false,
  limit,
}: DatabaseFetchOptions): Promise<DatabaseResult> {
  if (!databaseId) throw new Error('databaseId is required');
  if (!apiKey) throw new Error('apiKey is required');

  const notion = new Client({ auth: apiKey });

  // Collect all page IDs from the database
  const pages: { id: string; title: string }[] = [];
  let cursor: string | undefined;

  do {
    const res = await withRetry(() =>
      notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      })
    );

    for (const page of res.results as any[]) {
      // Extract title from properties
      const titleProp = Object.values(page.properties || {}).find(
        (p: any) => p.type === 'title'
      ) as any;
      const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';

      pages.push({ id: page.id, title });

      if (limit && pages.length >= limit) break;
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    if (limit && pages.length >= limit) break;
  } while (cursor);

  // Fetch comments for each page
  const results: DatabaseResult['pages'] = [];
  let totalComments = 0;
  let totalMapped = 0;

  for (const page of pages) {
    try {
      const result = await fetchInlineComments({
        pageId: page.id,
        apiKey,
        tokenV2,
        includeResolved,
      });

      if (result.total > 0) {
        results.push({ pageId: page.id, title: page.title, result });
        totalComments += result.total;
        totalMapped += result.mapped;
      }
    } catch (err: any) {
      console.warn(`[notion-inline-comments] Failed to scan page "${page.title}": ${err.message}`);
    }
  }

  return {
    pages: results,
    totalComments,
    totalMapped,
    totalPages: pages.length,
  };
}

// ─── Helpers ──────────────────────────────────────────

export function groupByBlock(comments: InlineComment[]): Record<string, InlineComment[]> {
  const map: Record<string, InlineComment[]> = {};
  for (const c of comments) {
    if (!c.blockId) continue;
    if (!map[c.blockId]) map[c.blockId] = [];
    map[c.blockId].push(c);
  }
  return map;
}

export function groupByContext(comments: InlineComment[]): Map<string, InlineComment[]> {
  const map = new Map<string, InlineComment[]>();
  for (const c of comments) {
    if (!c.contextText) continue;
    if (!map.has(c.contextText)) map.set(c.contextText, []);
    map.get(c.contextText)!.push(c);
  }
  return map;
}

export function filterResolved(comments: InlineComment[]): InlineComment[] {
  return comments.filter(c => c.resolved);
}

export function filterUnresolved(comments: InlineComment[]): InlineComment[] {
  return comments.filter(c => !c.resolved);
}

export function groupByHighlight(comments: InlineComment[]): Record<string, InlineComment[]> {
  const map: Record<string, InlineComment[]> = {};
  for (const c of comments) {
    const color = c.highlightColor || 'none';
    if (!map[color]) map[color] = [];
    map[color].push(c);
  }
  return map;
}

// ─── Export formatters ────────────────────────────────

export function toCSV(comments: InlineComment[]): string {
  const header = 'contextText,text,author,highlightColor,resolved,blockId,discussionId,createdAt';
  const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  const rows = comments.map(c =>
    [
      escape(c.contextText || ''),
      escape(c.text),
      escape(c.author),
      escape(c.highlightColor || ''),
      c.resolved,
      c.blockId,
      c.discussionId,
      c.createdAt,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function toMarkdown(comments: InlineComment[]): string {
  const lines: string[] = ['# Notion Inline Comments\n'];

  const byBlock = groupByBlock(comments);
  for (const [blockId, blockComments] of Object.entries(byBlock)) {
    const blockText = blockComments[0]?.blockText;
    lines.push(`## Block: ${blockText ? blockText.substring(0, 80) : blockId}\n`);

    for (const c of blockComments) {
      const resolved = c.resolved ? ' ~~resolved~~' : '';
      const hl = c.highlightColor ? ` \`${c.highlightColor}\`` : '';
      lines.push(`- **"${c.contextText || '(unmapped)'}"**${hl}${resolved}`);
      lines.push(`  > ${c.text}`);
      lines.push(`  — *${c.author || 'anonymous'}* (${c.createdAt})\n`);
    }
  }

  return lines.join('\n');
}

// ─── Internal export for testing ──────────────────────

export { mergeResults as _mergeResults };
