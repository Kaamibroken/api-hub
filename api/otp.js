import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const response = await fetch("http://51.89.99.105/NumberPanel/client/SMSCDRStats", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `PHPSESSID=${process.env.PHPSESSID}`,
      },
      body: "fdate1=2025-10-30+00%3A00%3A00&fdate2=2025-10-30+23%3A59%3A59&frange=&fnum=&fcli="
    });

    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
