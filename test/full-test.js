/**
 * 새 기능 전체 테스트
 */
import dotenv from 'dotenv';
dotenv.config({ path: '../personal-web/.env' });

import { fetchInlineComments, groupByHighlight, filterResolved, filterUnresolved } from '../dist/index.js';

const result = await fetchInlineComments({
  pageId: '34ac0e4e-369d-803c-9d4a-fda1a4b924cf',
  apiKey: process.env.NOTION_API_KEY,
  includeResolved: true,  // 해결된 것도 포함
});

console.log(`✅ ${result.mapped}/${result.total} comments mapped\n`);

// === 새 필드 확인 ===
console.log('─── 댓글 상세 (첫 3개) ───');
for (const c of result.comments.slice(0, 3)) {
  console.log(`  "${c.contextText}"`);
  console.log(`    text: "${c.text.substring(0, 40)}..."`);
  console.log(`    highlight: ${c.highlightColor}`);
  console.log(`    resolved: ${c.resolved}`);
  console.log(`    commentId: ${c.commentId}`);
  console.log('');
}

// === 스레드(discussion) ===
console.log('─── 스레드 단위 ───');
console.log(`  ${result.discussions.length}개 discussion`);
for (const d of result.discussions.slice(0, 2)) {
  console.log(`  "${d.contextText}" → ${d.comments.length}개 답글`);
}

// === 하이라이트 색상별 ===
console.log('\n─── 하이라이트 색상별 ───');
const byHL = groupByHighlight(result.comments);
for (const [color, comments] of Object.entries(byHL)) {
  console.log(`  ${color}: ${comments.length}개`);
}

// === resolved/unresolved ===
console.log('\n─── 해결 상태 ───');
console.log(`  미해결: ${filterUnresolved(result.comments).length}개`);
console.log(`  해결됨: ${filterResolved(result.comments).length}개`);
