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
                commentId: c.id,
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

// ─── Unofficial API: discussion 전체 데이터 ──────────────

/**
 * 비공식 API를 통해 각 discussion의 전체 메타데이터를 가져옵니다.
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

    // context 텍스트 추출
    const contextText = v.context
      ? v.context.map(c => c[0]).join('')
      : null;

    // 하이라이트 색상 추출 (annotation "h" = highlight)
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
 * 노션 페이지의 인라인 댓글을 정확한 텍스트 매핑과 함께 가져옵니다.
 * 
 * @param {Object} options
 * @param {string} options.pageId - 노션 페이지 ID
 * @param {string} options.apiKey - 노션 공식 API 키 (Integration token)
 * @param {string} [options.tokenV2] - 노션 브라우저 token_v2 (비공개 페이지용)
 * @param {boolean} [options.includeResolved=false] - 해결된 댓글도 포함할지
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
 * //     highlightColor: "yellow_background",
 * //     resolved: false,
 * //     blockId: "abc123-...",
 * //     discussionId: "def456-...",
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function fetchInlineComments({ pageId, apiKey, tokenV2, includeResolved = false }) {
  if (!pageId) throw new Error('pageId is required');
  if (!apiKey) throw new Error('apiKey is required');

  const notion = new Client({ auth: apiKey });

  // 1. 공식 API로 댓글 수집
  const rawComments = await fetchOfficialComments(notion, pageId);

  if (rawComments.length === 0) {
    return { comments: [], discussions: [], mapped: 0, total: 0 };
  }

  // 2. 비공식 API로 discussion 전체 데이터 수집
  let discussionMap = {};
  try {
    discussionMap = await fetchDiscussionData(pageId, { token: tokenV2 });
  } catch (err) {
    console.warn(`[notion-inline-comments] Discussion data fetch failed: ${err.message}`);
  }

  // 3. discussionId로 합치기
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

  // resolved 필터링
  const filtered = includeResolved
    ? comments
    : comments.filter(c => !c.resolved);

  const mapped = filtered.filter(c => c.contextText !== null).length;

  // 4. discussion 단위로 그룹핑 (스레드)
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
    discussions,   // 스레드 단위로 그룹핑된 데이터
    mapped,
    total: filtered.length,
  };
}

/**
 * 댓글 목록을 blockId별로 그룹핑합니다.
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
 * 해결된 댓글만 필터링합니다.
 */
export function filterResolved(comments) {
  return comments.filter(c => c.resolved);
}

/**
 * 미해결 댓글만 필터링합니다.
 */
export function filterUnresolved(comments) {
  return comments.filter(c => !c.resolved);
}

/**
 * 하이라이트 색상별로 그룹핑합니다.
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
