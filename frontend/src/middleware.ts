import { defineMiddleware } from 'astro:middleware';

// ANSI color escape codes
const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RED = '\x1b[31m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_WHITE = '\x1b[37m';
const ANSI_GRAY = '\x1b[90m';
const ANSI_MAGENTA = '\x1b[35m';

function colorizeMethod(method: string): string {
  let color = ANSI_WHITE;
  switch (method) {
    case 'GET':
      color = ANSI_CYAN;
      break;
    case 'POST':
      color = ANSI_GREEN;
      break;
    case 'PUT':
    case 'PATCH':
      color = ANSI_YELLOW;
      break;
    case 'DELETE':
      color = ANSI_RED;
      break;
  }
  return `${ANSI_BOLD}${color}${method.padEnd(6)}${ANSI_RESET}`;
}

function colorizeStatus(status: number): string {
  let color = ANSI_WHITE;
  let label = `${status}`;
  switch (status) {
    case 200:
      label = '200 OK';
      color = ANSI_GREEN;
      break;
    case 201:
      label = '201 Created';
      color = ANSI_GREEN;
      break;
    case 204:
      label = '204 No Content';
      color = ANSI_GREEN;
      break;
    case 301:
      label = '301 Moved';
      color = ANSI_CYAN;
      break;
    case 302:
      label = '302 Found';
      color = ANSI_CYAN;
      break;
    case 304:
      label = '304 Not Modified';
      color = ANSI_CYAN;
      break;
    case 400:
      label = '400 Bad Request';
      color = ANSI_YELLOW;
      break;
    case 401:
      label = '401 Unauthorized';
      color = ANSI_YELLOW;
      break;
    case 403:
      label = '403 Forbidden';
      color = ANSI_YELLOW;
      break;
    case 404:
      label = '404 Not Found';
      color = ANSI_YELLOW;
      break;
    case 429:
      label = '429 Too Many';
      color = ANSI_YELLOW;
      break;
    case 500:
      label = '500 Server Error';
      color = ANSI_RED;
      break;
    default:
      if (status >= 500) color = ANSI_RED;
      else if (status >= 400) color = ANSI_YELLOW;
      else if (status >= 300) color = ANSI_CYAN;
      else if (status >= 200) color = ANSI_GREEN;
  }
  return `${ANSI_BOLD}${color}${label.padEnd(16)}${ANSI_RESET}`;
}

function colorizeDuration(ms: number): string {
  let color = ANSI_GREEN;
  if (ms >= 500) {
    color = ANSI_RED;
  } else if (ms >= 100) {
    color = ANSI_YELLOW;
  }
  const formatted = ms < 1 ? '<1ms' : `${ms.toFixed(1)}ms`;
  return `${color}(${formatted})${ANSI_RESET}`;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Forward API dan health check ke backend Go Fiber v3
  const backendURL = import.meta.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8080';
  if (pathname === '/health' || pathname.startsWith('/api/')) {
    const target = new URL(pathname + context.url.search, backendURL);
    const forwarded = new Request(target, context.request);
    forwarded.headers.set('X-Forwarded-For', context.request.headers.get('X-Forwarded-For') || context.clientAddress || '');
    try {
      return await fetch(forwarded);
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: 'Server backend sedang memulai, silakan muat ulang sejenak.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Lewati file static internal vite/astro agar log terminal tetap bersih dan fokus
  const isInternalAsset =
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/@fs/') ||
    pathname.startsWith('/@vite/') ||
    pathname.endsWith('.map') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js');

  const start = performance.now();
  let response: Response;
  try {
    response = await next();
  } catch (err) {
    const duration = performance.now() - start;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    console.error(
      `${ANSI_GRAY}${timeStr}${ANSI_RESET} ${ANSI_BOLD}${ANSI_RED}[FE:ERROR]${ANSI_RESET} ${colorizeMethod(
        context.request.method
      )} ${ANSI_BOLD}${pathname}${ANSI_RESET} ${colorizeStatus(500)} ${colorizeDuration(duration)} - Error: ${err}`
    );
    throw err;
  }

  // =========================================================================
  // 1. CLOUDFLARE CDN EDGE CACHING OPTIMIZATION HEADERS
  // =========================================================================
  if (
    pathname.startsWith('/_astro/') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf')
  ) {
    // Cache Abadi untuk Aset Statis Ber-hash di Browser dan Cloudflare Edge
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('CDN-Cache-Control', 'max-age=31536000');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
  } else if (pathname.startsWith('/pusdatin') || pathname.startsWith('/api/')) {
    // Bypass Cache untuk Panel Admin & API Mutasi
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  } else {
    // Halaman Publik (HTML): Edge Cache 5 Menit dengan Background Stale Revalidation 24 Jam
    response.headers.set(
      'Cache-Control',
      'public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=86400'
    );
    response.headers.set('CDN-Cache-Control', 'max-age=300, stale-while-revalidate=86400');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=300, stale-while-revalidate=86400');
  }

  // =========================================================================
  // 2. ENTERPRISE SECURITY & WAF HEADERS
  // =========================================================================
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Alt-Svc', 'h3=":443"; ma=86400, h3-29=":443"; ma=86400');

  // CSP Enterprise (Cloudflare Turnstile, Cloudflare Beacon, R2, GA4/GTM, Google Fonts)
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://c98eb02b668a13c16b14ebff0ef6a37c.r2.cloudflarestorage.com https://*.r2.cloudflarestorage.com https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://db.kemenag-baritoutara.com https://challenges.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://*.r2.cloudflarestorage.com",
      "frame-src https://challenges.cloudflare.com https://www.googletagmanager.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );

  if (isInternalAsset) {
    return response;
  }

  // =========================================================================
  // 3. LOGGING TERMINAL DEV (DILENGKAPI CLOUDFLARE RAY & REAL IP)
  // =========================================================================
  const duration = performance.now() - start;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const methodStr = colorizeMethod(context.request.method);
  const pathStr = `${ANSI_BOLD}${pathname.padEnd(24)}${ANSI_RESET}`;
  const statusStr = colorizeStatus(response.status);
  const durationStr = colorizeDuration(duration);

  // Resolusi file route tujuan
  let routeLabel = '';
  if (pathname === '/') {
    routeLabel = 'src/pages/index.astro';
  } else if (pathname.startsWith('/admin')) {
    routeLabel = `src/pages${pathname.replace(/\/$/, '')}.astro`;
  } else {
    routeLabel = `src/pages${pathname.replace(/\/$/, '')}.astro`;
  }

  // Cloudflare metadata (jika request datang melalui Cloudflare Edge)
  const cfRay = context.request.headers.get('cf-ray');
  const cfCountry = context.request.headers.get('cf-ipcountry');
  const cfConnectingIp = context.request.headers.get('cf-connecting-ip');

  const extras: string[] = [];
  if (cfConnectingIp) extras.push(`cf-ip=${cfConnectingIp}`);
  if (cfCountry) extras.push(`geo=${cfCountry}`);
  if (cfRay) extras.push(`ray=${cfRay}`);

  const cfInfo = extras.length > 0 ? ` ${ANSI_MAGENTA}[${extras.join(' ')}]${ANSI_RESET}` : '';
  const routeInfo = `${ANSI_GRAY}[${routeLabel}]${ANSI_RESET}`;

  console.log(
    `${ANSI_GRAY}${timeStr}${ANSI_RESET} ${ANSI_BOLD}${ANSI_CYAN}[FE:PAGE]${ANSI_RESET} ${methodStr} ${pathStr} ${statusStr} ${durationStr} ${routeInfo}${cfInfo}`
  );

  return response;
});
