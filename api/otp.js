import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const cookie = process.env.PHPSESSID;
    if (!cookie) {
      return res.status(500).json({ error: "Missing PHPSESSID in environment variables." });
    }

    const response = await fetch("http://51.89.99.105/NumberPanel/client/SMSCDRStats", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `PHPSESSID=${cookie}`,
      },
      body: "fdate1=2025-10-30+00%3A00%3A00&fdate2=2025-10-30+23%3A59%3A59&frange=&fnum=&fcli="
    });

    const text = await response.text();
    return res.status(200).send(text);
  } catch (err) {
    console.error("❌ API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
