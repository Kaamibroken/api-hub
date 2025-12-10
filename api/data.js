const express = require("express");
const fetch = require("node-fetch");
const pycountry = require("pycountry");
const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "http://51.89.99.105/NumberPanel";
const PANEL_USERNAME = "Kami527";
const PANEL_PASSWORD = "Kami526";

let CURRENT_COOKIE = null;

// ---------------- LOGIN FUNCTION ---------------- //
async function performLogin() {
  const loginPage = await fetch(`${BASE_URL}/login`, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await loginPage.text();

  const match = html.match(/What is (\d+) \+ (\d+) = \?/);
  if (!match) throw new Error("Captcha not found");

  const answer = parseInt(match[1]) + parseInt(match[2]);
  const params = new URLSearchParams();
  params.append("username", PANEL_USERNAME);
  params.append("password", PANEL_PASSWORD);
  params.append("capt", answer);

  const res = await fetch(`${BASE_URL}/signin`, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/login`,
    },
    body: params.toString(),
  });

  const cookies = res.headers.raw()["set-cookie"];
  if (cookies) {
    const phpsess = cookies.find((c) => c.startsWith("PHPSESSID"));
    if (phpsess) {
      CURRENT_COOKIE = phpsess.split(";")[0];
      console.log("✅ Login Successful!");
      return true;
    }
  }
  throw new Error("Login failed");
}

// ---------------- API FETCH ---------------- //
async function fetchAPI(url) {
  if (!CURRENT_COOKIE) await performLogin();

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: CURRENT_COOKIE,
    },
  });

  if (res.status === 302 || res.url.includes("login")) {
    // session expired
    await performLogin();
    return fetchAPI(url);
  }

  const data = await res.json();
  if (!data.aaData) throw new Error("Invalid JSON response");
  return data;
}

// ---------------- DYNAMIC URLS ---------------- //
function getNumbersUrl() {
  const timestamp = Date.now();
  return `${BASE_URL}/client/res/data_smsnumbers.php?frange=&fclient=&sEcho=3&iColumns=6&iDisplayStart=0&iDisplayLength=-1&_=${timestamp}`;
}

function getOtpUrl() {
  const today = new Date().toISOString().slice(0, 10);
  const dateStart = encodeURIComponent(`${today} 00:00:00`);
  const dateEnd = encodeURIComponent(`${today} 23:59:59`);
  const timestamp = Date.now();
  return `${BASE_URL}/client/res/data_smscdr.php?fdate1=${dateStart}&fdate2=${dateEnd}&iDisplayLength=50&_=${timestamp}`;
}

// ---------------- COUNTRY FLAG ---------------- //
function getFlagEmoji(countryName) {
  try {
    const country = pycountry.countries.find((c) => c.name.toLowerCase() === countryName.toLowerCase());
    if (!country) return "🏳️";
    const code = country.alpha_2;
    const OFFSET = 127397;
    return code.split("").map((c) => String.fromCharCode(c.charCodeAt(0) + OFFSET)).join("");
  } catch {
    return "🏳️";
  }
}

// ---------------- EXPRESS ROUTES ---------------- //
app.get("/numbers", async (req, res) => {
  try {
    const data = await fetchAPI(getNumbersUrl());
    let numbers = data.aaData.map((item) => {
      const full = item[0].trim();
      const number = item[2];
      const countryName = full.split("-")[0].trim();
      return { number, country: countryName, flag: getFlagEmoji(countryName) };
    });

    if (req.query.random === "true" && numbers.length) {
      numbers = [numbers[Math.floor(Math.random() * numbers.length)]];
    }

    res.json({ success: true, data: numbers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/otp", async (req, res) => {
  try {
    const data = await fetchAPI(getOtpUrl());
    const otps = [];

    for (const item of data.aaData) {
      const number = item[2];
      const msg = (item[4] || "").trim();
      if (msg && msg !== "0" && msg.toLowerCase() !== "null" && msg.length > 1) {
        otps.push({ number, message: msg });
      }
    }

    res.json({ success: true, data: otps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- START SERVER ---------------- //
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
