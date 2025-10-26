// api/get-smsranges.js

export default async function handler(req, res) {
  try {
    // URL build kar rahe hain with query params
    const max = req.query.max || 25;
    const page = req.query.page || 1;

    const url = `http://51.89.99.105/NumberPanel/client/res/aj_smsranges.php?max=${max}&page=${page}`;

    // Fetch headers same jaise original request me the
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; V2040) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.209 Mobile Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "http://51.89.99.105/NumberPanel/client/SMSCDRStats",
        "Cookie": "PHPSESSID=t8h3om8cf77qpgp55qt33i7gvh"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: "Failed to fetch data from source." });
    }

    const data = await response.text(); // Source may return HTML or JSON
    res.status(200).send(data);

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
