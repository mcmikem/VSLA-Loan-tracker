export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { network, phone, amount, memberName, purpose } = req.body || {};
  const prefix = network === 'Airtel' ? 'AIRTEL-UG-' : 'MTN-UG-';
  const transId = prefix + Math.floor(100000 + Math.random() * 900000);

  return res.status(200).json({
    success: true, transactionId: transId, status: 'confirmed',
    network, phone, amount, memberName, purpose,
    timestamp: new Date().toISOString(),
    ussdMessage: `Payment of UGX ${Number(amount).toLocaleString()} from ${memberName} confirmed. Box updated.`,
  });
}
