/**
 * POST /api/progress — lesson progress upsert (resume support).
 * Body: { lessonId: string, status?: 'started' | 'completed', positionSeconds?: number }
 * Uses the caller's OWN RLS-scoped client: the database policy enforces both
 * ownership and content access.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession, sameOriginOk } from '../../lib/access';

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  const session = await getSession(ctx);
  if (!session.user) return new Response(JSON.stringify({ error: 'sign_in_required' }), { status: 401 });

  let body: { lessonId?: string; status?: string; positionSeconds?: number };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.slice(0, 60) : '';
  const status = body.status === 'completed' ? 'completed' : 'started';
  const position =
    typeof body.positionSeconds === 'number' && Number.isFinite(body.positionSeconds)
      ? Math.max(0, Math.min(Math.round(body.positionSeconds), 24 * 3600))
      : null;
  if (!lessonId) return new Response(JSON.stringify({ error: 'missing_lesson' }), { status: 400 });

  const { error } = await session.supabase.from('course_progress').upsert(
    {
      user_id: session.user.id,
      lesson_id: lessonId,
      status,
      position_seconds: position,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );

  if (error) {
    // RLS denial => the user does not own this content. Fail closed.
    return new Response(JSON.stringify({ error: 'denied' }), { status: 403 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
