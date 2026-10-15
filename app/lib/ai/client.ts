import Groq from 'groq-sdk';
import type { Message } from '../types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'openai/gpt-oss-20b';

export async function complete(
  system: string,
  messages: Pick<Message, 'role' | 'content'>[],
  options: { temperature: number; json?: boolean }
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: system }, ...messages],
    temperature: options.temperature,
    ...(options.json ? { response_format: { type: 'json_object' as const } } : {}),
  });
  return completion.choices[0]?.message?.content ?? '';
}
