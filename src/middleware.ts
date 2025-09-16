import { defineMiddleware } from 'astro:middleware';
import type { APIContext } from 'astro';

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Bot detection patterns
const botUserAgents = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /rogerbot/i,
    /linkedinbot/i,
    /embedly/i,
    /quora/i,
    /showyoubot/i,
    /outbrain/i,
    /pinterest/i,
    /developers\.google\.com/i,
];

// Suspicious patterns
const suspiciousPatterns = [
    /\.(php|asp|jsp|cgi)$/i,
    /\/wp-admin/i,
    /\/wp-content/i,
    /\/admin/i,
    /\.env$/i,
    /\/\.git/i,
    /\/config/i,
    /\/phpMyAdmin/i,
    /\/phpmyadmin/i,
    /\/xmlrpc\.php/i,
];

// Security headers
const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// CSP for different page types
const getCSP = (pathname: string): string => {
    const baseCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: blob: https: http:",
        "media-src 'self' blob: data:",
        "connect-src 'self' https://api.github.com https://www.google-analytics.com https://api.resend.com",
        "worker-src 'self' blob:",
        "child-src 'self' blob:",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "manifest-src 'self'",
    ];

    // Relax CSP for contact form page
    if (pathname === '/contact' || pathname.startsWith('/api/')) {
        baseCSP[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://cdnjs.cloudflare.com";
    }

    return baseCSP.join('; ');
};

// Rate limiting function
const isRateLimited = (clientIP: string, limit = 100, windowMs = 15 * 60 * 1000): boolean => {
    const now = Date.now();
    const clientData = rateLimitStore.get(clientIP);

    if (!clientData) {
        rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs });
        return false;
    }

    if (now > clientData.resetTime) {
        rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs });
        return false;
    }

    if (clientData.count >= limit) {
        return true;
    }

    clientData.count++;
    return false;
};

// Get client IP
const getClientIP = (request: Request): string => {
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    const xRealIP = request.headers.get('x-real-ip');
    const xForwardedFor = request.headers.get('x-forwarded-for');

    if (cfConnectingIP) return cfConnectingIP;
    if (xRealIP) return xRealIP;
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

    return 'unknown';
};

// Bot detection
const isBot = (userAgent: string): boolean => {
    return botUserAgents.some(pattern => pattern.test(userAgent));
};

// Suspicious request detection
const isSuspiciousRequest = (url: URL): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(url.pathname));
};

// Performance monitoring
const performanceLog = (
    method: string,
    pathname: string,
    statusCode: number,
    duration: number,
    clientIP: string,
    userAgent: string
) => {
    const logLevel = statusCode >= 400 ? 'ERROR' : statusCode >= 300 ? 'WARN' : 'INFO';
    const timestamp = new Date().toISOString();

    console.log(JSON.stringify({
        timestamp,
        level: logLevel,
        method,
        pathname,
        statusCode,
        duration: `${duration}ms`,
        clientIP,
        userAgent: userAgent.substring(0, 100), // Truncate long user agents
        type: 'request'
    }));
};

// Clean up old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export const onRequest = defineMiddleware(async (context: APIContext, next) => {
    const start = Date.now();
    const { request, url } = context;
    const method = request.method;
    const pathname = url.pathname;
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        // Handle preflight OPTIONS requests
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Block suspicious requests immediately
        if (isSuspiciousRequest(url)) {
            const duration = Date.now() - start;
            performanceLog(method, pathname, 403, duration, clientIP, userAgent);

            return new Response('Forbidden', {
                status: 403,
                headers: {
                    'Content-Type': 'text/plain',
                    ...securityHeaders,
                },
            });
        }

        // Rate limiting (more lenient for bots)
        const limit = isBot(userAgent) ? 200 : 100;
        if (isRateLimited(clientIP, limit)) {
            const duration = Date.now() - start;
            performanceLog(method, pathname, 429, duration, clientIP, userAgent);

            return new Response('Too Many Requests', {
                status: 429,
                headers: {
                    'Content-Type': 'text/plain',
                    'Retry-After': '900', // 15 minutes
                    ...securityHeaders,
                },
            });
        }

        // API route specific handling
        if (pathname.startsWith('/api/')) {
            // Additional rate limiting for API routes
            if (isRateLimited(`api_${clientIP}`, 30, 10 * 60 * 1000)) { // 30 requests per 10 minutes
                return new Response(JSON.stringify({ error: 'API rate limit exceeded' }), {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '600',
                        ...securityHeaders,
                    },
                });
            }

            // Validate content type for POST requests
            if (method === 'POST') {
                const contentType = request.headers.get('content-type');
                if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
                    return new Response(JSON.stringify({ error: 'Invalid content type' }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            ...securityHeaders,
                        },
                    });
                }
            }
        }

        // Process the request
        const response = await next();
        const duration = Date.now() - start;

        // Clone response to modify headers
        const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });

        // Add security headers
        Object.entries(securityHeaders).forEach(([key, value]) => {
            modifiedResponse.headers.set(key, value);
        });

        // Add CSP header
        modifiedResponse.headers.set('Content-Security-Policy', getCSP(pathname));

        // Add performance headers
        modifiedResponse.headers.set('X-Response-Time', `${duration}ms`);
        modifiedResponse.headers.set('X-Served-By', 'Astro-Middleware');

        // Cache control for static assets
        if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
            modifiedResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (pathname === '/' || pathname.endsWith('.html')) {
            modifiedResponse.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        } else {
            modifiedResponse.headers.set('Cache-Control', 'public, max-age=300');
        }

        // Log successful requests
        performanceLog(method, pathname, response.status, duration, clientIP, userAgent);

        return modifiedResponse;

    } catch (error) {
        const duration = Date.now() - start;

        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            method,
            pathname,
            clientIP,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: `${duration}ms`,
            type: 'middleware_error'
        }));

        performanceLog(method, pathname, 500, duration, clientIP, userAgent);

        return new Response('Internal Server Error', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                ...securityHeaders,
            },
        });
    }
});