// Interview question counting (BUG-002: questions with the same wording but different code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countAnsweredQuestions, extractQuestion, getUniqueQuestions } from '../app/lib/questionAnalysis';
import type { Message } from '../app/lib/types';

const q = (text: string, code?: string): Message => ({
  role: 'assistant',
  content: `> Good.\n\n**Next Question:** ${text}${code ? `\n\n\`\`\`python\n${code}\n\`\`\`` : ''}`,
});
const a = (text: string): Message => ({ role: 'user', content: text });

test('questions with the same sentence but different code are different questions', () => {
  const history = [
    q('What will be printed by the following code?', 'for i in range(3):\n    print(i)'), a('0 1 2'),
    q('What will be printed by the following code?', 'x = 10\nprint(x > 5)'), a('True'),
    q('What will be printed by the following code?', 'a = 3\nb = 4\nprint(a + b)'), a('7'),
  ];
  assert.equal(countAnsweredQuestions(history), 3);
});

test('a question repeated after an off-topic reply is counted once', () => {
  const history = [
    q('What is a list in Python?'), a('What is the weather today?'),
    { role: 'assistant' as const, content: "> That's off-topic.\n\n**Question:** What is a list in Python?" }, a('An ordered, mutable collection.'),
    q('What does len() return?'), a('The number of items.'),
  ];
  assert.equal(getUniqueQuestions(history.filter((m) => m.role === 'assistant')).length, 2);
  assert.equal(countAnsweredQuestions(history), 2);
});

test('a trailing unanswered question is not counted', () => {
  assert.equal(countAnsweredQuestions([q('What is a tuple?'), a('Immutable sequence.'), q('What is a set?')]), 1);
});

test('code is part of the extracted question; labels and fences are removed', () => {
  const text = extractQuestion(q('What is printed?', 'print(1)').content);
  assert.match(text, /what is printed\?/);
  assert.match(text, /print\(1\)/);
  assert.doesNotMatch(text, /```|next question/i);
});

test('falls back to the first "?" sentence when there is no label', () => {
  assert.equal(extractQuestion('Nice answer. Now, what is a generator?'), 'now, what is a generator?');
});

test('the level-change note before the label does not change the question', () => {
  const plain = q('Explain decorators.');
  const withNote: Message = { role: 'assistant', content: plain.content.replace('**Next Question:**', '*Very good, let us move up to Intermediate level.*\n\n**Next Question:**') };
  assert.equal(extractQuestion(withNote.content), extractQuestion(plain.content));
});
