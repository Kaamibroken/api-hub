const axios = require('axios');

const DATE_START = '2025-11-21 00:00:00';
const DATE_END = '2025-11-21 23:59:59';

const LOGIN_URL = 'http://139.99.63.204/ints/signin';
const DASHBOARD_URL = 'http://139.99.63.204/ints/client/SMSCDRStats';
const BASE_URL = 'http://139.99.63.204/ints/client/res/data_smscdr.php';

const USERNAME = 'Kami527';
const PASSWORD = 'Kami526';
const CAPTCHA_VALUE = '4';

async function getSessionCookie() {
    try {
        const loginData = `username=${USERNAME}&password=${PASSWORD}&capt=${CAPTCHA_VALUE}`;

        const response = await axios.post(LOGIN_URL, loginData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'http://139.99.63.204/ints/login',
            },
            maxRedirects: 0,
            validateStatus: () => true
        });

        const setCookie = response.headers['set-cookie'] || [];
        const sess = setCookie.find(c => c.includes('PHPSESSID'));

        if (sess) return sess.split(';')[0];
    } catch (e) {}

    return null;
}

async function fetchTransformedData() {

    const currentSessionCookie = await getSessionCookie();
    if (!currentSessionCookie) {
        return {
            "sEcho": 1,
            "iTotalRecords": "0",
            "iTotalDisplayRecords": "0",
            "aaData": []
        };
    }

    const headers = {
        'Host': '139.99.63.204',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': DASHBOARD_URL,
        'Cookie': currentSessionCookie,
        'Accept-Encoding': 'gzip, deflate',
    };

    const fullUrl = `${BASE_URL}?fdate1=${encodeURIComponent(DATE_START)}&fdate2=${encodeURIComponent(DATE_END)}&frange=&fnum=&fcli=&fgdate=&fgmonth=&fgrange=&fgnumber=&fgcli=&fg=0&sEcho=1&iColumns=7&sColumns=%2C%2C%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=100&mDataProp_0=0&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=1&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=true&mDataProp_2=2&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=3&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=4&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=true&mDataProp_5=5&sSearch_5=&bRegex_5=false&bSearchable_5=true&bSortable_5=true&mDataProp_6=6&sSearch_6=&bRegex_6=false&bSearchable_6=true&bSortable_6=true&sSearch=&bRegex=false&iSortCol_0=0&sSortDir_0=desc&iSortingCols=1&_=`;

    try {
        const response = await axios.get(fullUrl, { headers });
        return response.data;
    } catch (error) {
        return {
            "sEcho": 1,
            "iTotalRecords": "0",
            "iTotalDisplayRecords": "0",
            "aaData": []
        };
    }
}

module.exports = { fetchTransformedData };
