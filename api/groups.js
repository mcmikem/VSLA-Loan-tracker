import { getBakwataSeed, getKibuliSeed, toGroupSummary } from './_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const groups = [toGroupSummary(getBakwataSeed()), toGroupSummary(getKibuliSeed())];
  return res.status(200).json({ success: true, groups });
}
