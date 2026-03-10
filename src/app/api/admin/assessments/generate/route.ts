import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUser } from '@/lib/auth';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const schema = z.object({
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters'),
  roleType:       z.string().optional(),
  numQuestions:   z.number().int().min(3).max(20).default(10),
  difficulty:     z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const body = schema.parse(await req.json());

    const prompt = `You are an expert technical interviewer and assessment designer.

Analyse the following job description and generate a structured technical assessment with exactly ${body.numQuestions} questions.

JOB DESCRIPTION:
${body.jobDescription}

REQUIREMENTS:
- Difficulty distribution: ${body.difficulty === 'mixed' ? 'roughly 30% easy, 50% medium, 20% hard' : `all ${body.difficulty}`}
- Include a mix of question types where appropriate: multiple_choice, short_answer, coding_challenge, scenario, debugging_challenge
- Each question must directly test a skill or technology mentioned or implied in the JD
- For multiple_choice questions, always provide 4 options (A/B/C/D) with one correct answer and a brief explanation
- For coding_challenge questions, provide starter code and the language expected
- Make questions practical — test real work scenarios, not trivia

Respond with ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "Senior React Developer Assessment",
  "description": "Tests React, TypeScript, performance optimisation, and API design as outlined in the JD",
  "roleType": "react-developer",
  "timeLimit": 60,
  "passingScore": 70,
  "sections": [
    {
      "title": "Core Skills",
      "description": "Fundamental knowledge required for the role",
      "questions": [
        {
          "type": "MULTIPLE_CHOICE",
          "title": "Short title for the question",
          "body": "Full question text here",
          "points": 10,
          "difficulty": "medium",
          "evaluator": "multiple_choice",
          "skillTags": ["react", "hooks"],
          "config": {
            "options": [
              {"label": "Option A text", "value": "A"},
              {"label": "Option B text", "value": "B"},
              {"label": "Option C text", "value": "C"},
              {"label": "Option D text", "value": "D"}
            ],
            "correct": "B",
            "explanation": "Brief explanation of why B is correct"
          }
        },
        {
          "type": "CODING_CHALLENGE",
          "title": "Short title",
          "body": "Full question text with context and requirements",
          "points": 20,
          "difficulty": "hard",
          "evaluator": "code",
          "skillTags": ["javascript", "algorithms"],
          "config": {
            "language": "javascript",
            "starterCode": "// starter code here\\nfunction solution() {\\n  // your code\\n}",
            "testCases": []
          }
        },
        {
          "type": "SHORT_ANSWER",
          "title": "Short title",
          "body": "Full question text",
          "points": 15,
          "difficulty": "medium",
          "evaluator": "manual",
          "skillTags": ["architecture"],
          "config": {}
        },
        {
          "type": "SCENARIO",
          "title": "Short title",
          "body": "Full scenario description and question",
          "points": 25,
          "difficulty": "hard",
          "evaluator": "manual",
          "skillTags": ["system-design"],
          "config": {
            "rubric": [
              {"criterion": "Criterion description", "maxPoints": 10, "guidance": "What a good answer includes"}
            ]
          }
        }
      ]
    }
  ]
}

The "sections" array should have 2-3 logical sections that group related questions.
Use only these question types: MULTIPLE_CHOICE, SHORT_ANSWER, LONG_ANSWER, CODING_CHALLENGE, SQL_CHALLENGE, DEBUGGING_CHALLENGE, SCENARIO, ARCHITECTURE.
The evaluator field must be: "multiple_choice" for MULTIPLE_CHOICE, "multi_select" for MULTI_SELECT, "code" for CODING_CHALLENGE/SQL_CHALLENGE/DEBUGGING_CHALLENGE, "manual" for everything else.`;

    // Use streaming for reliability with long outputs
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const finalMessage = await stream.finalMessage();

    // Extract text content (skip thinking blocks)
    const textContent = finalMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Claude did not return valid JSON' }, { status: 500 });
    }

    const generated = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ assessment: generated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[Generate API]', err.status, err.message);
      if (err.status === 401) {
        return NextResponse.json({ error: 'Invalid Anthropic API key. Set ANTHROPIC_API_KEY in .env' }, { status: 500 });
      }
    }
    console.error('[Generate POST]', err);
    return NextResponse.json({ error: 'Generation failed. Check server logs.' }, { status: 500 });
  }
}
