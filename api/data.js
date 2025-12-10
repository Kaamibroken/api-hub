const http = require("http");
const https = require("https");
const zlib = require("zlib");
const querystring = require("querystring");
const { URL } = require("url");

// ---------------- CONFIG ----------------
const BASE_URL = "http://51.89.99.105/NumberPanel";
const PANEL_USERNAME = "Kami527"; // your username
const PANEL_PASSWORD = "Kami526"; // your password

let CURRENT_COOKIE = null;

// ---------------- HELPER ----------------
const get = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const enc = res.headers["content-encoding"];
        try {
          if (enc === "gzip") zlib.gunzip(buffer, (e, d) => (e ? reject(e) : resolve(d.toString())));
          else if (enc === "deflate") zlib.inflate(buffer, (e, d) => (e ? reject(e) : resolve(d.toString())));
          else resolve(buffer.toString());
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });

const post = (url, data, headers = {}) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === "https:" ? https : http;

    const options = {
      method: "POST",
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers,
    };

    const req = lib.request(options, (res) => {
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ body: Buffer.concat(chunks).toString(), headers: res.headers }));
    });

    req.on("error", reject);
    req.write(querystring.stringify(data));
    req.end();
  });

// ---------------- LOGIN ----------------
async function performLogin() {
  try {
    const loginPage = await get(`${BASE_URL}/login`, {
      "User-Agent": "Mozilla/5.0",
    });

    const match = /What is (\d+) \+ (\d+) \= \?/.exec(loginPage);
    if (!match) throw new Error("Captcha not found");

    const answer = parseInt(match[1]) + parseInt(match[2]);
    const payload = { username: PANEL_USERNAME, password: PANEL_PASSWORD, capt: answer };

    const res = await post(`${BASE_URL}/signin`, payload, {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE_URL}/login`,
      Origin: BASE_URL,
    });

    const cookies = res.headers["set-cookie"];
    if (!cookies) throw new Error("Login failed, no cookies returned");

    const sessionCookie = cookies.find((c) => c.startsWith("PHPSESSID="));
    if (!sessionCookie) throw new Error("PHPSESSID not found in cookies");

    CURRENT_COOKIE = sessionCookie.split(";")[0];
    console.log("✅ Login successful. PHPSESSID:", CURRENT_COOKIE);
    return true;
  } catch (err) {
    console.error("Login Error:", err.message);
    return false;
  }
}

// ---------------- MAIN VERCEL HANDLER ----------------
module.exports = async (req, res) => {
  const params = Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
  const { type } = params;

  if (!type) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Missing ?type parameter" }));
  }

  // ensure logged in
  if (!CURRENT_COOKIE) {
    const ok = await performLogin();
    if (!ok) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Login failed" }));
    }
  }

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: CURRENT_COOKIE,
  };

  let url;
  if (type === "numbers") {
    url = `${BASE_URL}/client/res/data_smsnumbers.php?_=${Date.now()}`;
    headers.Referer = `${BASE_URL}/client/MySMSNumbers`;
  } else if (type === "sms") {
    url = `${BASE_URL}/client/res/data_smscdr.php?_=${Date.now()}`;
    headers.Referer = `${BASE_URL}/client/SMSCDRStats`;
  } else {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Invalid type (use sms or numbers)" }));
  }

  try {
    let data = await get(url, headers);

    // check if session expired
    if (data.toLowerCase().includes("login") || data.toLowerCase().includes("direct script access")) {
      await performLogin(); // refresh cookie
      headers.Cookie = CURRENT_COOKIE;
      data = await get(url, headers);
    }

    res.setHeader("Content-Type", "application/json");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Fetch failed", details: err.message }));
  }
};
