<div align="center">

# 💬 notion-inline-comments

**노션 API의 빠진 퍼즐 조각.**

인라인 댓글을 정확히 어떤 텍스트에 달렸는지와 함께 추출합니다.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇺🇸 English](./README.md)

<br />

<img src="./assets/hero.png" alt="노션 페이지 → notion-inline-comments → 구조화된 데이터" width="600" />

</div>

---

## 문제

노션에서 텍스트를 드래그하고 댓글을 달면, 노션은 어떤 단어를 선택했는지 정확히 알고 있습니다 — **하지만 공식 API는 그 정보를 주지 않습니다.**

```diff
- 공식 API:    댓글 ✅  블록 ✅  선택 텍스트 ❌
+ 이 패키지:   댓글 ✅  블록 ✅  선택 텍스트 ✅
```

---

## 설치

```bash
npm install notion-inline-comments
```

## 사용법

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments } = await fetchInlineComments({
  pageId: '페이지-ID',
  apiKey: 'secret_xxx',
});

comments.forEach(c => {
  console.log(c.contextText);  // "디자인 토큰"  ← 하이라이트한 텍스트
  console.log(c.text);         // "이것은..."   ← 댓글 내용
});
```

### 실제 활용 예시

노션 댓글을 호버 툴팁으로 렌더링 — 정확한 텍스트 위치에 매핑:

<div align="center">
<img src="./assets/demo-tooltip.png" alt="하이라이트 텍스트 위 호버 툴팁" width="480" />
</div>

---

## 작동 원리

<div align="center">
<img src="./assets/how-it-works.png" alt="3단계: 공식 API + 내부 API → 합치기" width="560" />
</div>

<br />

> 노션 웹앱은 `discussion` 객체를 반환하는 내부 엔드포인트를 사용합니다. 각 객체에는 선택한 정확한 텍스트가 담긴 `context` 필드가 있습니다. 이것을 `discussionId`로 공식 API 데이터와 합칩니다.

---

## API

### `fetchInlineComments({ pageId, apiKey, tokenV2? })`

| 옵션 | 필수 | 설명 |
|------|:----:|------|
| `pageId` | ✅ | 노션 URL의 페이지 ID |
| `apiKey` | ✅ | Integration 토큰 |
| `tokenV2` | | 브라우저 쿠키 (비공개 페이지용) |

**반환값:**

```typescript
{
  comments: [{
    contextText: string | null,  // 하이라이트한 텍스트
    text: string,                // 댓글 내용
    author: string,
    blockId: string,
    discussionId: string,
    createdAt: string,
  }],
  mapped: number,
  total: number,
}
```

### 헬퍼 함수

```javascript
groupByBlock(comments);    // { blockId: [comments] }
groupByContext(comments);  // Map { "텍스트" => [comments] }
```

---

## 요구사항

- **Node.js** ≥ 18
- 페이지 접근 권한이 있는 [노션 Integration](https://www.notion.so/my-integrations)

> **참고:** discussion context를 위해 [`notion-client`](https://github.com/NotionX/react-notion-x)(비공식 API)를 사용합니다. 내부 API는 예고 없이 변경될 수 있습니다.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
