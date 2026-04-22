/**
 * 양쪽 API의 실제 응답 데이터를 나란히 보여주는 스크립트
 */
import dotenv from 'dotenv';
dotenv.config({ path: '../personal-web/.env' });

import { Client } from '@notionhq/client';
import { NotionAPI } from 'notion-client';

const PAGE_ID = '34ac0e4e-369d-803c-9d4a-fda1a4b924cf';
const BLOCK_WITH_COMMENTS = '34ac0e4e-369d-80e1-94b1-f3f90250c303'; // literary salon 블록

// ═══════════════════════════════════════
// 1. 공식 API 응답
// ═══════════════════════════════════════
console.log('═'.repeat(60));
console.log('📘 공식 API (api.notion.com)');
console.log('═'.repeat(60));

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const officialRes = await notion.comments.list({ block_id: BLOCK_WITH_COMMENTS });

console.log('\n요청: GET /v1/comments?block_id=' + BLOCK_WITH_COMMENTS);
console.log('\n응답 (첫 번째 댓글):');
const firstComment = officialRes.results[0];
console.log(JSON.stringify({
  id: firstComment.id,
  discussion_id: firstComment.discussion_id,
  parent: firstComment.parent,
  rich_text: firstComment.rich_text?.map(r => r.plain_text),
  created_by: firstComment.created_by,
}, null, 2));

console.log(`\n⚠️  discussion_id는 있지만, "어떤 텍스트를 선택했는지"는 없음!`);

// ═══════════════════════════════════════
// 2. 비공식 API 응답
// ═══════════════════════════════════════
console.log('\n\n' + '═'.repeat(60));
console.log('🔧 비공식 API (notion.so/api/v3/loadPageChunk)');
console.log('═'.repeat(60));

const api = new NotionAPI();
const pageData = await api.getPage(PAGE_ID.replace(/-/g, ''));

console.log('\n요청: POST /api/v3/loadPageChunk { pageId: "' + PAGE_ID + '" }');
console.log('\n응답에서 discussion 부분 (첫 번째):');

const discussions = pageData.discussion || {};
const firstDiscussion = Object.values(discussions)[0];
const dv = firstDiscussion?.value?.value;

console.log(JSON.stringify({
  id: dv?.id,
  parent_id: dv?.parent_id,
  context: dv?.context,
  comments: dv?.comments,
  resolved: dv?.resolved,
}, null, 2));

console.log(`\n✅ context 필드에 선택한 텍스트가 있음!`);
console.log(`   context[0][0] = "${dv?.context?.[0]?.[0]}"`);

// ═══════════════════════════════════════
// 3. 합치기
// ═══════════════════════════════════════
console.log('\n\n' + '═'.repeat(60));
console.log('🔗 합친 결과 (discussionId로 매칭)');
console.log('═'.repeat(60));

const contextMap = {};
for (const d of Object.values(discussions)) {
  const v = d.value?.value;
  if (v?.context && v.id) {
    contextMap[v.id] = v.context.map(c => c[0]).join('');
  }
}

console.log('\n모든 매핑:');
for (const c of officialRes.results) {
  const ctx = contextMap[c.discussion_id] || '???';
  console.log(`  "${ctx}" → "${c.rich_text?.map(r => r.plain_text).join('').substring(0, 50)}..."`);
}
