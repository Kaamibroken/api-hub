const http = require("http");
const https = require("https");
const querystring = require("querystring");

function GET(url, headers) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let data = [];
      res.on("data", (c) => data.push(c));
      res.on("end", () => {
        const body = Buffer.concat(data).toString();
        resolve({ body, headers: res.headers });
      });
    });
    req.on("error", reject);
  });
}

function POST(url, headers, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "POST", headers }, (res) => {
      let data = [];
      res.on("data", (c) => data.push(c));
      res.on("end", () => {
        const body = Buffer.concat(data).toString();
        resolve({ body, headers: res.headers });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getSession() {
  const postData = querystring.stringify({
    username: "Kami527",
    password: "Kami526",
    capt: "4",
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": Buffer.byteLength(postData),
    "User-Agent": "Mozilla/5.0",
    Referer: "http://139.99.63.204/ints/login",
  };

  const resp = await POST("http://139.99.63.204/ints/signin", headers, postData);
  const set = resp.headers["set-cookie"] || [];
  const cookie = set.find((c) => c.includes("PHPSESSID"));
  return cookie ? cookie.split(";")[0] : null;
}

module.exports = async (req, res) => {
  const query = Object.fromEntries(
    new URL(req.url, "http://localhost").searchParams
  );

  const type = query.type;
  if (!type) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Missing ?type" }));
  }

  const session = await getSession();
  if (!session) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Session error" }));
  }

  let url;
  let referer;

  if (type === "sms") {
    url =
      "http://139.99.63.204/ints/client/res/data_smscdr.php?fdate1=2025-11-21%2000:00:00&fdate2=2025-11-21%2023:59:59&frange=&fnum=&fcli=&fgdate=&fgmonth=&fgrange=&fgnumber=&fgcli=&fg=0&sEcho=1&iColumns=7&sColumns=%2C%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=200&iSortCol_0=0&sSortDir_0=desc&iSortingCols=1";
    referer = "http://139.99.63.204/ints/client/SMSCDRStats";
  } else if (type === "numbers") {
    url =
      "http://139.99.63.204/ints/client/res/data_smsnumbers.php?frange=&fclient=&sEcho=1&iColumns=6&sColumns=%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=200";
    referer = "http://139.99.63.204/ints/client/MySMSNumbers";
  } else {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Invalid type" }));
  }

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Referer: referer,
    Cookie: session,
  };

  try {
    const result = await GET(url, headers);
    res.setHeader("Content-Type", "application/json");
    res.end(result.body);
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Fetch failed" }));
  }
};
