// server.js
const express = require("express");
const axios = require("axios");
const qs = require("qs");
const cheerio = require("cheerio");

const app = express();
app.use(express.json());

const PANEL_USERNAME = "Kami527";
const PANEL_PASSWORD = "Kami526";

const BASE_URL = "http://51.89.99.105/NumberPanel";
const URL_LOGIN_PAGE = `${BASE_URL}/login`;
const URL_SIGNIN = `${BASE_URL}/signin`;

let CURRENT_COOKIE = null;

// ---------------- LOGIN FUNCTION ---------------- //
async function performLogin() {
  try {
    const loginPage = await axios.get(URL_LOGIN_PAGE, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    // Solve captcha: "What is X + Y = ?"
    const $ = cheerio.load(loginPage.data);
    const captchaMatch = /What is (\d+) \+ (\d+) = \?/.exec(loginPage.data);
    let captchaAnswer = 0;
    if (captchaMatch) {
      captchaAnswer = parseInt(captchaMatch[1]) + parseInt(captchaMatch[2]);
    }

    const payload = qs.stringify({
      username: PANEL_USERNAME,
      password: PANEL_PASSWORD,
      capt: captchaAnswer
    });

    const response = await axios.post(URL_SIGNIN, payload, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": BASE_URL,
        "Referer": URL_LOGIN_PAGE
      },
      maxRedirects: 0,
      validateStatus: null
    });

    const cookies = response.headers["set-cookie"];
    if (cookies) {
      const sessionCookie = cookies.find(c => c.startsWith("PHPSESSID"));
      if (sessionCookie) {
        CURRENT_COOKIE = sessionCookie.split(";")[0];
        console.log("✅ Login Successful!", CURRENT_COOKIE);
        return true;
      }
    }
  } catch (e) {
    console.log("❌ Login Error:", e.message);
  }
  return false;
}

// ---------------- HELPER FUNCTIONS ---------------- //
function getHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": `${BASE_URL}/client/MySMSNumbers`,
    "Cookie": CURRENT_COOKIE || ""
  };
}

function getNumbersUrl() {
  const timestamp = Date.now();
  return `${BASE_URL}/client/res/data_smsnumbers.php?frange=&fclient=&sEcho=3&iColumns=6&sColumns=%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=-1&mDataProp_0=0&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=1&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=true&mDataProp_2=2&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=3&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=4&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=true&mDataProp_5=5&sSearch_5=&bRegex_5=false&bSearchable_5=true&bSortable_5=true&sSearch=&bRegex=false&iSortCol_0=0&sSortDir_0=asc&iSortingCols=1&_=${timestamp}`;
}

function getOtpUrl() {
  const today = new Date();
  const date_start = encodeURIComponent(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")} 00:00:00`
  );
  const date_end = encodeURIComponent(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")} 23:59:59`
  );
  const timestamp = Date.now();
  return `${BASE_URL}/client/res/data_smscdr.php?fdate1=${date_start}&fdate2=${date_end}&frange=&fnum=&fcli=&fgdate=&fgmonth=&fgrange=&fgnumber=&fgcli=&fg=0&sEcho=4&iColumns=7&sColumns=%2C%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=50&mDataProp_0=0&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=1&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=true&mDataProp_2=2&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=3&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=4&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=true&mDataProp_5=5&sSearch_5=&bRegex_5=false&bSearchable_5=true&bSortable_5=true&mDataProp_6=6&sSearch_6=&bRegex_6=false&bSearchable_6=true&bSortable_6=true&sSearch=&bRegex=false&iSortCol_0=0&sSortDir_0=desc&iSortingCols=1&_=${timestamp}`;
}

async function safeApiRequest(url) {
  if (!CURRENT_COOKIE) await performLogin();
  try {
    const res = await axios.get(url, { headers: getHeaders() });
    if (res.data.aaData) return res.data;
    // maybe session expired
    await performLogin();
    const retry = await axios.get(url, { headers: getHeaders() });
    return retry.data;
  } catch (e) {
    console.log("API Error:", e.message);
    return null;
  }
}

// ---------------- API ROUTES ---------------- //
app.get("/numbers", async (req, res) => {
  const data = await safeApiRequest(getNumbersUrl());
  if (!data) return res.status(500).json({ error: "Failed to fetch numbers" });
  res.json(data);
});

app.get("/sms", async (req, res) => {
  const data = await safeApiRequest(getOtpUrl());
  if (!data) return res.status(500).json({ error: "Failed to fetch SMS/OTP" });
  res.json(data);
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Node.js API running on port ${PORT}`));
