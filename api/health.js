export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    status: 'ok',
    server: 'Bakwata VSLA Engine (Vercel serverless)',
    timestamp: new Date().toISOString(),
    saasMode: 'multi-tenant-stateless',
    registeredGroupsCount: 2,
  });
}
