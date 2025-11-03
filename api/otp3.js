import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';


const LOGIN_URL = 'https://d-group.stats.direct/user-management/auth/login';
const SMS_URL = 'https://d-group.stats.direct/sms-records/index?PartitionSmsInboundAllocationSearch%5Bdate_range%5D=2025-11-02+00%3A00%3A00+-+2025-11-02+23%3A59%3A59';
const USERNAME = 'Kami528';
const PASSWORD = 'Kami527'; 
export default async function handler(req, res) {
    try {
        
        const cookieJar = new CookieJar();
        
        
        const loginPageResponse = await gotScraping(LOGIN_URL, {
            cookieJar,
            responseType: 'buffer'
        });
        
        const loginHtml = loginPageResponse.body.toString('utf8');
        let $ = cheerio.load(loginHtml);
        const csrfToken = $('input[name="_csrf-frontend"]').val();
        
        if (!csrfToken) {
            throw new Error('CSRF Error');
        }

        
        await gotScraping.post(LOGIN_URL, {
            cookieJar,
            form: {
                '_csrf-frontend': csrfToken,
                'LoginForm[username]': USERNAME,
                'LoginForm[password]': PASSWORD,
                'LoginForm[rememberMe]': 0
            },
            followRedirect: true
        });

        
        const smsPageResponse = await gotScraping(SMS_URL, {
            cookieJar,
            responseType: 'buffer'
        });

        const smsHtml = smsPageResponse.body.toString('utf8');
        $ = cheerio.load(smsHtml);

        const aaData = [];
        $('#cdrs-pjax tbody tr').each((index, element) => {
            const cells = $(element).find('td');
            if (cells.length > 0) {
                
                
                const rawMessage = $(cells[9]).text();
                
                const cleanMessage = rawMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim();
                
                const record = [
                    $(cells[0]).text().trim(), 
                    $(cells[1]).text().trim(), 
                    $(cells[3]).text().trim(), 
                    $(cells[2]).text().trim(), 
                    cleanMessage,             
                    "$", 0.01
                ];
                aaData.push(record);
            }
        });

        
        const outputJson = {
            "sEcho": 1,
            "iTotalRecords": aaData.length.toString(),
            "iTotalDisplayRecords": aaData.length.toString(),
            "aaData": aaData
        };

        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
        
        res.status(200).json(outputJson);

    } catch (error) {
        console.error('--- ❌ مکمل عمل میں خرابی ---', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error during automatic login or scraping',
            error_details: error.message 
        });
    }
}
