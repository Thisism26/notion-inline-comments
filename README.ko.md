[🇺🇸 English](./README.md)

# notion-inline-comments

> 노션 인라인 댓글을 **정확한 텍스트 매핑**과 함께 추출합니다.
> 댓글을 달 때 어떤 텍스트를 선택했는지 정확히 알 수 있습니다.

## 문제

노션 공식 API는 댓글 내용은 주지만, **어떤 텍스트를 선택해서 댓글을 달았는지는 알려주지 않습니다**:

```
공식 API 응답:
  ✅ 댓글 내용: "이것은 시각적 기반을 정의합니다..."
  ✅ 블록 ID: "abc123-..."
  ❌ 선택한 텍스트: ??? (알 수 없음)
```

이 패키지는 공식 API와 노션 내부 API를 조합하여 이 문제를 해결합니다:

```
notion-inline-comments 응답:
  ✅ 댓글 내용: "이것은 시각적 기반을 정의합니다..."
  ✅ 블록 ID: "abc123-..."
  ✅ 선택한 텍스트: "디자인 토큰"  ← 사용자가 드래그한 정확한 텍스트
```

## 설치

```bash
npm install notion-inline-comments
```

## 사용법

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const result = await fetchInlineComments({
  pageId: '노션-페이지-ID',
  apiKey: process.env.NOTION_API_KEY,
});

console.log(`${result.mapped}/${result.total}개 댓글 매핑 완료`);

for (const comment of result.comments) {
  console.log(`"${comment.contextText}" → "${comment.text}"`);
}
```

출력:

```
3/3개 댓글 매핑 완료
"디자인 토큰" → "이것은 시각적 기반을 정의합니다..."
"따뜻한 중립 팔레트" → "모든 색상이 따뜻한 톤을 유지..."
"반응형 레이아웃" → "모바일 우선 브레이크포인트를 고려..."
```

## 작동 원리

```
1. 공식 API  →  댓글 내용 + discussionId
2. 비공식 API (notion-client)  →  discussion.context (선택한 텍스트)
3. discussionId로 합치기  →  정확한 1:1 텍스트 ↔ 댓글 매핑
```

노션의 비공식 API(`/api/v3/loadPageChunk`)는 각 댓글 스레드에 대한 `discussion` 객체를 반환합니다. 이 객체에는 댓글을 달 때 **선택한 정확한 텍스트**가 담긴 `context` 필드가 있습니다 — 공식 API에서는 제공하지 않는 데이터입니다.

## API

### `fetchInlineComments(options)`

| 옵션 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `pageId` | `string` | ✅ | 노션 페이지 ID |
| `apiKey` | `string` | ✅ | 노션 Integration API 키 |
| `tokenV2` | `string` | | 브라우저 token_v2 쿠키 (비공개 페이지용) |

반환값 `Promise<InlineCommentResult>`:

```typescript
{
  comments: InlineComment[];  // 텍스트 매핑이 포함된 모든 댓글
  mapped: number;             // 텍스트 매핑에 성공한 댓글 수
  total: number;              // 전체 댓글 수
}
```

각 `InlineComment`:

```typescript
{
  contextText: string | null; // 하이라이트된 정확한 텍스트 (매핑 실패 시 null)
  text: string;               // 댓글 내용
  author: string;             // 작성자 이름
  blockId: string;            // 댓글이 달린 블록 ID
  discussionId: string;       // Discussion ID
  createdAt: string;          // ISO 8601 타임스탬프
}
```

### `groupByBlock(comments)`

댓글을 `blockId`별로 그룹핑합니다.

### `groupByContext(comments)`

댓글을 `contextText`별로 그룹핑합니다 (하이라이트된 텍스트별 툴팁 렌더링에 유용).

## 요구사항

- Node.js >= 18
- 대상 페이지에 접근 가능한 노션 Integration

## 라이선스

MIT
