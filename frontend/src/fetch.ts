// Advanced Routing (Astro 7): pintu masuk request pipeline.
// Semua request /api/* dan /health diteruskan ke backend Go (single origin,
// cookie sesi admin aman tanpa CORS).
import { astro, FetchState, middleware, sessions } from 'astro/fetch';

const backendURL = import.meta.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8080';

export default {
  async fetch(request: Request): Promise<Response> {
    const state = new FetchState(request);

    if (state.url.pathname === '/health' || state.url.pathname.startsWith('/api/')) {
      const target = new URL(state.url.pathname + state.url.search, backendURL);
      const forwarded = new Request(target, request);
      // Backend memakai X-Forwarded-For untuk rate limit per IP.
      forwarded.headers.set('X-Forwarded-For', request.headers.get('X-Forwarded-For') || state.clientAddress || '');
      return fetch(forwarded);
    }

    sessions(state);
    return middleware(state, (s) => astro(s));
  },
};