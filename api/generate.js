// Vercel serverless function (Gemini version). Set GEMINI_API_KEY in Vercel environment variables.
const SYSTEM = `You convert a person's free-text description into CV data.
Return ONLY valid JSON in this shape:
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
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2500 }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error(JSON.stringify(data));
      return res.status(502).json({ error: 'AI request failed. Check your GEMINI_API_KEY.' });
    }
    const raw = data.candidates[0].content.parts.map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not build your CV. Try again.' });
  }
}
