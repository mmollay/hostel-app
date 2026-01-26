// Basic Auth Middleware for develop.* subdomains
// Only active on develop.gastauferden.at, not on production

const DEVELOP_DOMAINS = ['develop.gastauferden.at'];
const USERNAME = 'develop';
const PASSWORD = 'ssi2025!';

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  
  // Only require auth on develop domains
  if (!DEVELOP_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) {
    return context.next();
  }
  
  // Check for Authorization header
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Development Preview"',
      },
    });
  }
  
  // Decode and verify credentials
  const base64Credentials = authHeader.slice(6);
  const credentials = atob(base64Credentials);
  const [user, pass] = credentials.split(':');
  
  if (user !== USERNAME || pass !== PASSWORD) {
    return new Response('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Development Preview"',
      },
    });
  }
  
  return context.next();
};
