// Vercel serverless function. Set ANTHROPIC_API_KEY in your project's environment variables.
const SYSTEM = `You convert a person's free-text description into CV data.
Return ONLY valid JSON, no markdown fences, in this shape:
{"name":"","email":"","phone":"","location":"","links":[""],"summary":"",
"skills":[""],
"experience":[{"title":"","company":"","location":"","dates":"","bullets":[""]}],
"projects":[{"name":"","bullets":[""]}],
"education":[{"degree":"","school":"","dates":"","details":""}],
"certifications":[""]}
Rules: never invent employers, dates, numbers or facts that are not in the input. Leave a field empty if unknown.
Rewrite bullets in concise, action-verb style (past tense for past roles). Keep the summary to 2-3 sentences.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const text = String((req.body && req.body.text) || '').slice(0, 8000);
  if (text.trim().length < 30) return res.status(400).json({ error: 'Please add more detail about yourself.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 2500,
        system: SYSTEM,
        messages: [{ role: 'user', content: text }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'AI request failed.' });
    const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    return res.status(500).json({ error: 'Could not build your CV. Try again.' });
  }
}
