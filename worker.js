export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (!env.API_ORIGIN) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'API_ORIGIN no esta configurado en Cloudflare.'
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json; charset=UTF-8' }
          }
        );
      }

      const base = env.API_ORIGIN.endsWith('/') ? env.API_ORIGIN.slice(0, -1) : env.API_ORIGIN;
      const targetUrl = `${base}${url.pathname}${url.search}`;

      const init = {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual'
      };

      const backendResponse = await fetch(targetUrl, init);
      return new Response(backendResponse.body, backendResponse);
    }

    return env.ASSETS.fetch(request);
  }
};
