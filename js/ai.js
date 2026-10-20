// AI with automatic fallback: Gemini → Groq → OpenRouter. Keys live only on this phone.

export const DEFAULT_MODELS = { gemini: 'gemini-2.5-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'openrouter/auto' };

async function gemini(key, model, system, msgs) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })) }),
  });
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}
async function openaiLike(url, key, model, system, msgs, extra = {}) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, ...extra },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...msgs], temperature: 0.9 }),
  });
  if (!r.ok) throw new Error(url.includes('groq') ? 'Groq ' + r.status : 'OpenRouter ' + r.status);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

/** msgs: [{role:'user'|'assistant', content}] */
export async function ask(ai, system, msgs) {
  const models = { ...DEFAULT_MODELS, ...(ai.models || {}) };
  const errors = [];
  if (ai.gemini) try { return await gemini(ai.gemini, models.gemini, system, msgs); } catch (e) { errors.push(e.message); }
  if (ai.groq) try { return await openaiLike('https://api.groq.com/openai/v1/chat/completions', ai.groq, models.groq, system, msgs); } catch (e) { errors.push(e.message); }
  if (ai.openrouter) try { return await openaiLike('https://openrouter.ai/api/v1/chat/completions', ai.openrouter, models.openrouter, system, msgs, { 'X-Title': 'MochiBoo' }); } catch (e) { errors.push(e.message); }
  if (!errors.length) throw new Error('Add an AI key in Settings to talk to Bloop.');
  throw new Error('Bloop couldn\'t reach any AI right now (' + errors.join(', ') + ').');
}

/** Name shield: real names are swapped for tokens before anything is sent to an AI, and swapped back in the reply. */
export function shield(names) {
  const pairs = Object.entries(names).filter(([, real]) => real && real.trim().length > 1);
  const re = r => new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return {
    scrub: t => pairs.reduce((s, [tok, real]) => s.replace(re(real.trim()), tok), t),
    unscrub: t => pairs.reduce((s, [tok, real]) => s.split(tok).join(real.trim()), t),
  };
}

/** ask() with every outgoing word passed through the shield. */
export async function askPrivately(ai, system, msgs, sh) {
  const out = await ask(ai, sh.scrub(system), msgs.map(m => ({ ...m, content: sh.scrub(m.content) })));
  return sh.unscrub(out);
}
