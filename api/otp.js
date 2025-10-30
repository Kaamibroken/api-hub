const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/otp", async (req, res) => {
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
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

app.listen(3000, () => console.log("✅ API running on http://localhost:3000"));
