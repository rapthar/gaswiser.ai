import { type NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001';

type Context = { params: { path: string[] } };

async function proxy(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const path = params.path.join('/');
  const search = request.nextUrl.search;
  const url = `${BACKEND}/api/v1/${path}${search}`;

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  const ct = request.headers.get('content-type');
  if (auth) headers.set('authorization', auth);
  if (ct) headers.set('content-type', ct);

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url, { method: request.method, headers, body });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }

  // Stream the response back (handles SSE and large payloads)
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Skip headers Next.js manages itself
    if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;

export const dynamic = 'force-dynamic';
