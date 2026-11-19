// موقع الشات: يستقبل الرسائل من السيرفر، يفلترها، يسجلها، ويرجعها
// ما يحتاج أي مكتبات (npm install فاضي)
const http = require("http");

const KEY = process.env.SITE_KEY || "change_me"; // لازم يطابق SiteKey بسكربت السيرفر
const PORT = process.env.PORT || 3000;

// ===== قائمة الكلمات الممنوعة (عدّل عليها) =====
const WORDS = [
  "غبي", "حمار", "احمق", "تافه", "كس", "شرموط", "اركب", "امك", "كواد", "قواد",
  "ختك", "نيك", "كحب", "سكس", "مص", "لحس", "طيز", "عرض", "لعن", "مازوخ", "غنج",
  "زب", "ايري", "خزق", "نكح", "سيكس", "مرج", "خرق", "قضيب", "اغتصاب", "اغتصب",
  "قذف", "cum", "مني", "ass", "dick", "sex", "رقم", "خرا", "يبن",
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(
  [...WORDS].sort((a, b) => b.length - a.length).map(esc).join("|"),
  "giu"
);
const mask = (t) => t.replace(re, (m) => "#".repeat([...m].length));

// ===== السجل (بالذاكرة، آخر 300 سطر) =====
const logs = [];
const log = (s) => {
  logs.push(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
  if (logs.length > 300) logs.shift();
};

const readBody = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > 10000) req.destroy();
    });
    req.on("end", () => resolve(b));
  });

const send = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");

    // صفحة فحص (لـ UptimeRobot)
    if (url.pathname === "/") return send(res, 200, { ok: true });

    if (req.headers["x-key"] !== KEY) return send(res, 401, { ok: false });

    try {
      if (req.method === "POST" && url.pathname === "/msg") {
        const d = JSON.parse(await readBody(req));
        const text = mask(String(d.text || "").slice(0, 200));
        // الخاص يتفلتر بس ما ينسجل
        if (d.channel !== "private") log(`${d.name}(${d.userId}) [${d.channel}]: ${text}`);
        return send(res, 200, { ok: true, text });
      }

      if (req.method === "POST" && url.pathname === "/report") {
        const d = JSON.parse(await readBody(req));
        log(
          `🚩 ${d.reporter} -> ${d.target} | ${String(d.kind).slice(0, 40)} | ${String(d.reason).slice(0, 200)} | msg: ${String(d.message || "-").slice(0, 200)}`
        );
        return send(res, 200, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/logs") {
        const n = Math.min(Math.max(+url.searchParams.get("n") || 15, 1), 40);
        return send(res, 200, { ok: true, lines: logs.slice(-n) });
      }
    } catch (e) {
      return send(res, 400, { ok: false });
    }

    send(res, 404, { ok: false });
  })
  .listen(PORT, () => console.log("chat site running on", PORT));
