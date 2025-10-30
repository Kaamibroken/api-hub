import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const PHPSESSID = process.env.PHPSESSID;
    if (!PHPSESSID) {
      return res.status(500).json({ error: "PHPSESSID not set in environment variables" });
    }

    const response = await fetch("http://51.89.99.105/NumberPanel/client/SMSCDRStats", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `PHPSESSID=${PHPSESSID}`
      },
      body: "fdate1=2025-10-30+00%3A00%3A00&fdate2=2025-10-30+23%3A59%3A59&frange=&fnum=&fcli="
    });

    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
