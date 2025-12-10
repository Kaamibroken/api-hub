// api/numbers.js (Vercel Serverless)
const axios = require("axios");
const qs = require("qs");
const cheerio = require("cheerio");

const PANEL_USERNAME = "Kami527";
const PANEL_PASSWORD = "Kami526";
const BASE_URL = "http://51.89.99.105/NumberPanel";
const URL_LOGIN_PAGE = `${BASE_URL}/login`;
const URL_SIGNIN = `${BASE_URL}/signin`;

let CURRENT_COOKIE = null;

// Login function
async function performLogin() {
  try {
    const loginPage = await axios.get(URL_LOGIN_PAGE, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const match = /What is (\d+) \+ (\d+) = \?/.exec(loginPage.data);
    let captchaAnswer = 0;
    if (match) captchaAnswer = parseInt(match[1]) + parseInt(match[2]);

    const payload = qs.stringify({
      username: PANEL_USERNAME,
      password: PANEL_PASSWORD,
      capt: captchaAnswer
    });

    const res = await axios.post(URL_SIGNIN, payload, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": BASE_URL,
        "Referer": URL_LOGIN_PAGE
      },
      maxRedirects: 0,
      validateStatus: null
    });

    const cookies = res.headers["set-cookie"];
    if (cookies) {
      const sessionCookie = cookies.find(c => c.startsWith("PHPSESSID"));
      if (sessionCookie) {
        CURRENT_COOKIE = sessionCookie.split(";")[0];
        return true;
      }
    }
  } catch (e) {
    console.log("Login error:", e.message);
  }
  return false;
}

// Build numbers URL
function getNumbersUrl() {
  const timestamp = Date.now();
  return `${BASE_URL}/client/res/data_smsnumbers.php?frange=&fclient=&sEcho=3&iColumns=6&_=${timestamp}`;
}

// Headers with current cookie
function getHeaders() {
  return {
    "User-Agent": "Mozilla/5.0",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": `${BASE_URL}/client/MySMSNumbers`,
    "Cookie": CURRENT_COOKIE || ""
  };
}

// Safe request with login refresh
async function safeApiRequest(url) {
  if (!CURRENT_COOKIE) await performLogin();
  try {
    const res = await axios.get(url, { headers: getHeaders() });
    if (!res.data.aaData) {
      await performLogin();
      return (await axios.get(url, { headers: getHeaders() })).data;
    }
    return res.data;
  } catch {
    await performLogin();
    return (await axios.get(url, { headers: getHeaders() })).data;
  }
}

// Vercel handler
export default async function handler(req, res) {
  const data = await safeApiRequest(getNumbersUrl());
  if (!data) return res.status(500).json({ error: "Failed to fetch numbers" });
  res.status(200).json(data);
}
