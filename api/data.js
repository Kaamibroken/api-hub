const http = require("http");
const https = require("https");
const zlib = require("zlib");
const querystring = require("querystring");
const { URL } = require("url");

const BASE_URL = "http://51.89.99.105/NumberPanel";
const PANEL_USERNAME = "Kami527";
const PANEL_PASSWORD = "Kami526";

let CURRENT_COOKIE = null;

// Simple GET request with gzip/deflate support
const getRequest = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const encoding = res.headers["content-encoding"];
        try {
          if (encoding === "gzip") zlib.gunzip(buffer, (e, d) => (e ? reject(e) : resolve(d.toString())));
          else if (encoding === "deflate") zlib.inflate(buffer, (e, d) => (e ? reject(e) : resolve(d.toString())));
          else resolve(buffer.toString());
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });

// Simple POST request
const postRequest = (url, data, headers = {}) =>
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

// Perform login and store PHPSESSID
async function performLogin() {
  const loginPage = await getRequest(`${BASE_URL}/login`, { "User-Agent": "Mozilla/5.0" });
  const match = /What is (\d+) \+ (\d+) \= \?/.exec(loginPage);
  if (!match) throw new Error("Captcha not found");
  const answer = parseInt(match[1]) + parseInt(match[2]);
  const payload = { username: PANEL_USERNAME, password: PANEL_PASSWORD, capt: answer };

  const res = await postRequest(`${BASE_URL}/signin`, payload, {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: `${BASE_URL}/login`,
    Origin: BASE_URL,
  });

  const cookies = res.headers["set-cookie"];
  if (!cookies) throw new Error("Login failed, no cookies returned");
  const sessionCookie = cookies.find((c) => c.startsWith("PHPSESSID="));
  if (!sessionCookie) throw new Error("PHPSESSID not found");
  CURRENT_COOKIE = sessionCookie.split(";")[0];
  console.log("✅ Login successful:", CURRENT_COOKIE);
}

// API handler for Vercel
module.exports = async (req, res) => {
  try {
    const params = Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
    const { type } = params;
    if (!type) return res.end(JSON.stringify({ error: "Missing ?type" }));

    if (!CURRENT_COOKIE) await performLogin();

    const headers = {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: CURRENT_COOKIE,
    };

    const timestamp = Date.now();
    let url;

    if (type === "numbers") {
      url = `${BASE_URL}/client/res/data_smsnumbers.php?frange=&fclient=&sEcho=3&iColumns=6&sColumns=%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=-1&mDataProp_0=0&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=1&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=true&mDataProp_2=2&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=3&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=4&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=true&mDataProp_5=5&sSearch_5=&bRegex_5=false&bSearchable_5=true&bSortable_5=true&sSearch=&bRegex=false&iSortCol_0=0&sSortDir_0=asc&iSortingCols=1&_=${timestamp}`;
      headers.Referer = `${BASE_URL}/client/MySMSNumbers`;
    } else if (type === "sms") {
      const today = new Date();
      const pad = (n) => (n < 10 ? "0" + n : n);
      const date_start = encodeURIComponent(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())} 00:00:00`);
      const date_end = encodeURIComponent(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())} 23:59:59`);
      url = `${BASE_URL}/client/res/data_smscdr.php?fdate1=${date_start}&fdate2=${date_end}&frange=&fnum=&fcli=&fgdate=&fgmonth=&fgrange=&fgnumber=&fgcli=&fg=0&sEcho=4&iColumns=7&sColumns=%2C%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=50&mDataProp_0=0&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=1&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=true&mDataProp_2=2&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=3&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=4&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=true&mDataProp_5=5&sSearch_5=&bRegex_5=false&bSearchable_5=true&bSortable_5=true&mDataProp_6=6&sSearch_6=&bRegex_6=false&bSearchable_6=true&bSortable_6=true&sSearch=&bRegex=false&iSortCol_0=0&sSortDir_0=desc&iSortingCols=1&_=${timestamp}`;
      headers.Referer = `${BASE_URL}/client/SMSCDRStats`;
    } else {
      return res.end(JSON.stringify({ error: "Invalid type" }));
    }

    let data = await getRequest(url, headers);

    // If login expired, retry login once
    if (data.toLowerCase().includes("login")) {
      await performLogin();
      headers.Cookie = CURRENT_COOKIE;
      data = await getRequest(url, headers);
    }

    res.setHeader("Content-Type", "application/json");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
