import http from 'http';

const targetPort = parseInt(process.env.TARGET_PORT || '3000', 10);
const listenPort = parseInt(process.env.LISTEN_PORT || '3001', 10);

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;"><h3>Nexora Dev Server Memulai...</h3><p>Server sedang inisialisasi di port 3000. Halaman akan termuat otomatis dalam beberapa detik.</p><script>setTimeout(() => location.reload(), 2000);</script></body></html>');
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`[Proxy] Port ${listenPort} forwarding to port ${targetPort}`);
});
