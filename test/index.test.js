/**
 * Unit tests for notion-inline-comments
 * Uses mock data — no Notion API calls needed.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  _mergeResults,
  groupByBlock,
  groupByContext,
  groupByHighlight,
  filterResolved,
  filterUnresolved,
  toCSV,
  toMarkdown,
} from '../dist/index.js';

// ─── Mock data ────────────────────────────────────────

const mockRawComments = [
  {
    blockId: 'block-1',
    discussionId: 'disc-1',
    commentId: 'comment-1',
    text: 'This is a key design decision.',
    author: 'Alice',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    blockId: 'block-1',
    discussionId: 'disc-2',
    commentId: 'comment-2',
    text: 'Consider using warmer tones.',
    author: 'Bob',
    createdAt: '2024-01-15T11:00:00Z',
  },
  {
    blockId: 'block-2',
    discussionId: 'disc-3',
    commentId: 'comment-3',
    text: 'Resolved issue.',
    author: 'Charlie',
    createdAt: '2024-01-15T12:00:00Z',
  },
];

const mockDiscussionMap = {
  'disc-1': {
    contextText: 'design tokens',
    highlightColor: 'yellow_background',
    resolved: false,
    commentIds: ['comment-1'],
    parentBlockId: 'block-1',
  },
  'disc-2': {
    contextText: 'warm palette',
    highlightColor: 'blue_background',
    resolved: false,
    commentIds: ['comment-2'],
    parentBlockId: 'block-1',
  },
  'disc-3': {
    contextText: 'old bug',
    highlightColor: null,
    resolved: true,
    commentIds: ['comment-3'],
    parentBlockId: 'block-2',
  },
};

const mockBlockTexts = {
  'block-1': 'The design tokens define the warm palette for the entire project.',
  'block-2': 'Fixed the old bug in the rendering pipeline.',
};

// ─── Tests ────────────────────────────────────────────

describe('mergeResults', () => {
  it('maps contextText correctly', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(result.comments[0].contextText, 'design tokens');
    assert.equal(result.comments[1].contextText, 'warm palette');
    assert.equal(result.comments[2].contextText, 'old bug');
  });

  it('maps blockText correctly', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.ok(result.comments[0].blockText?.includes('design tokens'));
    assert.ok(result.comments[2].blockText?.includes('old bug'));
  });

  it('maps highlightColor correctly', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(result.comments[0].highlightColor, 'yellow_background');
    assert.equal(result.comments[1].highlightColor, 'blue_background');
    assert.equal(result.comments[2].highlightColor, null);
  });

  it('excludes resolved by default', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, false);
    assert.equal(result.total, 2);
    assert.ok(result.comments.every(c => !c.resolved));
  });

  it('includes resolved when includeResolved=true', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(result.total, 3);
    assert.ok(result.comments.some(c => c.resolved));
  });

  it('counts mapped correctly', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(result.mapped, 3);
  });

  it('groups discussions correctly', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(result.discussions.length, 3);
    assert.equal(result.discussions[0].comments.length, 1);
  });

  it('handles empty input', () => {
    const result = _mergeResults([], {}, {}, false);
    assert.equal(result.total, 0);
    assert.equal(result.mapped, 0);
    assert.deepEqual(result.comments, []);
  });

  it('handles missing discussion data gracefully', () => {
    const result = _mergeResults(mockRawComments, {}, mockBlockTexts, true);
    assert.equal(result.total, 3);
    assert.equal(result.mapped, 0);
    assert.equal(result.comments[0].contextText, null);
  });
});

describe('groupByBlock', () => {
  it('groups comments by blockId', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    const grouped = groupByBlock(result.comments);
    assert.equal(Object.keys(grouped).length, 2);
    assert.equal(grouped['block-1'].length, 2);
    assert.equal(grouped['block-2'].length, 1);
  });
});

describe('groupByContext', () => {
  it('groups comments by contextText', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    const grouped = groupByContext(result.comments);
    assert.equal(grouped.size, 3);
    assert.equal(grouped.get('design tokens')?.length, 1);
  });
});

describe('groupByHighlight', () => {
  it('groups comments by highlight color', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    const grouped = groupByHighlight(result.comments);
    assert.equal(grouped['yellow_background'].length, 1);
    assert.equal(grouped['blue_background'].length, 1);
    assert.equal(grouped['none'].length, 1);
  });
});

describe('filterResolved / filterUnresolved', () => {
  it('filters resolved comments', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    assert.equal(filterResolved(result.comments).length, 1);
    assert.equal(filterUnresolved(result.comments).length, 2);
  });
});

describe('toCSV', () => {
  it('generates valid CSV', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    const csv = toCSV(result.comments);
    const lines = csv.split('\n');
    assert.equal(lines[0], 'contextText,text,author,highlightColor,resolved,blockId,discussionId,createdAt');
    assert.equal(lines.length, 4); // header + 3 rows
    assert.ok(lines[1].includes('design tokens'));
  });

  it('escapes quotes in CSV', () => {
    const comments = [{
      ...mockRawComments[0],
      contextText: 'with "quotes"',
      text: 'has "special" chars',
      author: 'Alice',
      highlightColor: null,
      resolved: false,
      blockText: null,
      blockId: 'block-1',
      discussionId: 'disc-1',
      commentId: 'comment-1',
      createdAt: '2024-01-15T10:00:00Z',
    }];
    const csv = toCSV(comments);
    assert.ok(csv.includes('""quotes""'));
  });
});

describe('toMarkdown', () => {
  it('generates valid markdown', () => {
    const result = _mergeResults(mockRawComments, mockDiscussionMap, mockBlockTexts, true);
    const md = toMarkdown(result.comments);
    assert.ok(md.includes('# Notion Inline Comments'));
    assert.ok(md.includes('**"design tokens"**'));
    assert.ok(md.includes('~~resolved~~'));
  });
});
