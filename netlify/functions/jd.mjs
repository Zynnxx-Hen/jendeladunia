import { getStore } from "@netlify/blobs";
const MAXL = 10;
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clip = (s, n) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

export default async (req) => {
  const store = getStore({ name: "jendeladunia", consistency: "strong" });
  const load = async (k) => (await store.get(k, { type: "json" })) || {};
  if (req.method === "GET") {
    const uid = clip(new URL(req.url).searchParams.get("uid"), 40);
    const [L, C] = await Promise.all([load("likes"), load("comments")]);
    const likes = {};
    for (const a in L) likes[a] = { t: Object.values(L[a]).reduce((s, n) => s + n, 0), m: L[a][uid] || 0 };
    return J({ likes, comments: C });
  }
  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return J({ error: "bad json" }, 400); }
    const aid = String(parseInt(b.aid, 10));
    if (!/^\d{1,4}$/.test(aid)) return J({ error: "bad aid" }, 400);
    if (b.type === "like" || b.type === "unlike") {
      const uid = clip(b.uid, 40); if (!uid) return J({ error: "uid" }, 400);
      const L = await load("likes"); L[aid] = L[aid] || {};
      if (b.type === "like") L[aid][uid] = Math.max(1, Math.min(MAXL, parseInt(b.n, 10) || 1)); else delete L[aid][uid];
      await store.setJSON("likes", L); return J({ ok: true });
    }
    if (b.type === "comment") {
      const name = clip(b.name, 40), text = clip(b.text, 600);
      if (!name || !text) return J({ error: "empty" }, 400);
      const C = await load("comments"); const arr = (C[aid] = C[aid] || []);
      arr.push({ name, text, ts: Date.now() }); if (arr.length > 300) arr.splice(0, arr.length - 300);
      await store.setJSON("comments", C); return J({ ok: true });
    }
  }
  return J({ error: "not found" }, 404);
};
export const config = { path: "/api/jd" };
