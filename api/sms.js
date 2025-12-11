const https = require("https");
const http = require("http");
const zlib = require("zlib");
const fetch = require("node-fetch");

const PANEL_USERNAME = "Kami527";
const PANEL_PASSWORD = "Kami526";
const BASE_URL = "http://51.89.99.105/NumberPanel";

let CURRENT_COOKIE = null;

// ---------------- LOGIN FUNCTION ---------------- //
async function performLogin() {
  return new Promise(async (resolve, reject) => {
    try {
      const loginPage = await fetch(`${BASE_URL}/login`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const html = await loginPage.text();

      const match = html.match(/What is (\d+) \+ (\d+) = \?/);
      if (!match) return reject("Captcha not found");

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
          console.log("✅ Login Successful!", CURRENT_COOKIE);
          resolve(true);
          return;
        }
      }
      reject("Login failed");
    } catch (e) {
      reject(e);
    }
  });
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

  return res.json();
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

// ---------------- EXPORT HANDLER ---------------- //
module.exports = async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const type = url.searchParams.get("type");

  if (!type) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Missing ?type parameter" }));
  }

  try {
    let data;
    if (type === "numbers") {
      data = await fetchAPI(getNumbersUrl());
    } else if (type === "otp") {
      data = await fetchAPI(getOtpUrl());
    } else {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Invalid type (numbers or otp)" }));
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server error", details: err.message }));
  }
};
