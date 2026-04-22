/**
 * notion-inline-comments
 * 
 * 노션의 공식 API와 비공식 API를 조합하여
 * 인라인 댓글이 정확히 어떤 텍스트에 달렸는지 매핑합니다.
 * 
 * 공식 API만으로는 "어떤 텍스트를 선택해서 댓글을 달았는지" 알 수 없습니다.
 * 이 패키지는 비공식 API(notion-client)의 discussion.context 필드를 활용하여
 * 댓글 ↔ 텍스트 1:1 매핑을 제공합니다.
 */

import { Client } from '@notionhq/client';

// ─── Official API: 댓글 수집 ──────────────────────────

/**
 * 페이지의 모든 블록을 순회하며 댓글을 수집합니다.
 * @param {Client} notion - Notion 공식 API 클라이언트
 * @param {string} pageId - 페이지 ID
 * @returns {Promise<Array>} 댓글 목록
 */
async function fetchOfficialComments(notion, pageId) {
  const comments = [];

  async function walkBlocks(parentId) {
    let cursor;
    do {
      const res = await notion.blocks.children.list({
        block_id: parentId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const block of res.results) {
        // 각 블록의 댓글 조회
        try {
          let commentCursor;
          do {
            const cRes = await notion.comments.list({
              block_id: block.id,
              start_cursor: commentCursor,
            });
            for (const c of cRes.results) {
              comments.push({
                blockId: block.id,
                discussionId: c.discussion_id,
                text: c.rich_text?.map(rt => rt.plain_text).join('') || '',
                author: c.created_by?.name || '',
                createdAt: c.created_time,
              });
            }
            commentCursor = cRes.has_more ? cRes.next_cursor : null;
          } while (commentCursor);
        } catch {
          // 댓글 조회 실패 시 무시
        }

        // 하위 블록 재귀
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

// ─── Unofficial API: discussion context ───────────────

/**
 * 비공식 API를 통해 각 discussion의 context(선택된 텍스트)를 가져옵니다.
 * @param {string} pageId - 페이지 ID
 * @param {object} [options] - 옵션
 * @param {string} [options.token] - token_v2 (비공개 페이지용)
 * @returns {Promise<Object>} discussionId → contextText 매핑
 */
async function fetchDiscussionContexts(pageId, options = {}) {
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
    if (!v?.context || !v.id) continue;
    map[v.id] = v.context.map(c => c[0]).join('');
  }

  return map;
}

// ─── Public API ───────────────────────────────────────

/**
 * 노션 페이지의 인라인 댓글을 정확한 텍스트 매핑과 함께 가져옵니다.
 * 
 * @param {Object} options
 * @param {string} options.pageId - 노션 페이지 ID
 * @param {string} options.apiKey - 노션 공식 API 키 (Integration token)
 * @param {string} [options.tokenV2] - 노션 브라우저 token_v2 (비공개 페이지용, 보통 불필요)
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
 * console.log(result.comments);
 * // [
 * //   {
 * //     contextText: "design tokens",
 * //     text: "These define the visual foundation...",
 * //     author: "John",
 * //     blockId: "abc123-...",
 * //     discussionId: "def456-...",
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function fetchInlineComments({ pageId, apiKey, tokenV2 }) {
  if (!pageId) throw new Error('pageId is required');
  if (!apiKey) throw new Error('apiKey is required');

  const notion = new Client({ auth: apiKey });

  // 1. 공식 API로 댓글 수집
  const rawComments = await fetchOfficialComments(notion, pageId);

  if (rawComments.length === 0) {
    return { comments: [], mapped: 0, total: 0 };
  }

  // 2. 비공식 API로 discussion context 수집
  let contextMap = {};
  try {
    contextMap = await fetchDiscussionContexts(pageId, { token: tokenV2 });
  } catch (err) {
    // 비공식 API 실패 시 경고만 — 댓글 내용은 여전히 반환
    console.warn(`[notion-inline-comments] Discussion context fetch failed: ${err.message}`);
  }

  // 3. discussionId로 합치기
  const comments = rawComments.map(c => ({
    contextText: contextMap[c.discussionId] || null,
    text: c.text,
    author: c.author,
    blockId: c.blockId,
    discussionId: c.discussionId,
    createdAt: c.createdAt,
  }));

  const mapped = comments.filter(c => c.contextText !== null).length;

  return {
    comments,
    mapped,    // context가 매핑된 댓글 수
    total: comments.length,
  };
}

/**
 * 댓글 목록을 blockId별로 그룹핑합니다.
 * 
 * @param {Array} comments - fetchInlineComments의 결과.comments
 * @returns {Object} blockId → comments[] 매핑
 * 
 * @example
 * ```javascript
 * const result = await fetchInlineComments({ ... });
 * const byBlock = groupByBlock(result.comments);
 * // { "block-id-1": [...], "block-id-2": [...] }
 * ```
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
 * 댓글 목록을 contextText별로 그룹핑합니다.
 * (같은 텍스트에 여러 댓글이 달린 경우)
 * 
 * @param {Array} comments - fetchInlineComments의 결과.comments
 * @returns {Map} contextText → comments[] 매핑
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
