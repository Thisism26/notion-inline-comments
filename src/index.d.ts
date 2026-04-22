export interface InlineComment {
  /** 사용자가 드래그한 정확한 텍스트. null이면 context 매핑 실패 */
  contextText: string | null;
  /** 댓글 내용 */
  text: string;
  /** 작성자 이름 */
  author: string;
  /** 노션 하이라이트 색상 (e.g. "yellow_background"). null이면 하이라이트 없음 */
  highlightColor: string | null;
  /** 댓글 해결 여부 */
  resolved: boolean;
  /** 댓글이 달린 블록 ID */
  blockId: string;
  /** discussion ID */
  discussionId: string;
  /** 개별 댓글 ID */
  commentId: string;
  /** 댓글 작성 시각 (ISO 8601) */
  createdAt: string;
}

export interface DiscussionThread {
  /** discussion ID */
  discussionId: string;
  /** 선택 텍스트 */
  contextText: string | null;
  /** 하이라이트 색상 */
  highlightColor: string | null;
  /** 해결 여부 */
  resolved: boolean;
  /** 블록 ID */
  blockId: string;
  /** 이 스레드의 모든 댓글 */
  comments: {
    commentId: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
}

export interface InlineCommentResult {
  /** 모든 인라인 댓글 (flat) */
  comments: InlineComment[];
  /** 스레드 단위로 그룹핑된 데이터 */
  discussions: DiscussionThread[];
  /** context 매핑에 성공한 댓글 수 */
  mapped: number;
  /** 전체 댓글 수 */
  total: number;
}

export interface FetchOptions {
  /** 노션 페이지 ID */
  pageId: string;
  /** 노션 공식 API 키 */
  apiKey: string;
  /** 노션 브라우저 token_v2 (비공개 페이지용) */
  tokenV2?: string;
  /** 해결된 댓글도 포함할지 (기본: false) */
  includeResolved?: boolean;
}

export function fetchInlineComments(options: FetchOptions): Promise<InlineCommentResult>;
export function groupByBlock(comments: InlineComment[]): Record<string, InlineComment[]>;
export function groupByContext(comments: InlineComment[]): Map<string, InlineComment[]>;
export function filterResolved(comments: InlineComment[]): InlineComment[];
export function filterUnresolved(comments: InlineComment[]): InlineComment[];
export function groupByHighlight(comments: InlineComment[]): Record<string, InlineComment[]>;
