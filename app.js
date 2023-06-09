const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const XLSX = require('xlsx');

async function scrapeCompanyData() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const urls = ['https://509fiber.com/', 'https://allegiantnow.com/'];
    const companyData = [];

    for (const url of urls) {
        const data = {
            website: url,
            isp_name_long: '',
            isp_name_short: '',
            isp_slug: '',
            new_website: '',
            new_isp_name_long: '',
            new_isp_name_short: '',
            logo_filename: '',
            closed: '',
            sales_phone: ''
        };

        await page.goto(url, { waitUntil: 'networkidle0' });

        const html = await page.content();
        const $ = cheerio.load(html);

        // Task 1: Verify and update the website URL
        const currentUrl = page.url();
        if (currentUrl !== url) {
            data.new_website = currentUrl;
        }

        // Task 2: Verify company status and ISP classification
        // Task 2: Verify company status and ISP classification
        const pageTitle = $('title').text();
        const isISP = pageTitle.toLowerCase().includes('internet service provider');

        if (!isISP) {
            if (pageTitle.toLowerCase().includes('closed')) {
                data.closed = 'CLOSED';
            } else if (pageTitle.toLowerCase().includes('purchased') || pageTitle.toLowerCase().includes('merged')) {
                data.closed = 'PURCHASED';
                const redirectUrl = page.url();
                data.new_website = redirectUrl;
                const websiteParts = redirectUrl.replace(/(^\w+:|^)\/\//, '').split('.');
                data.new_isp_name_long = websiteParts[0];
            } else {
                data.closed = 'NOT AN ISP';
            }
        }


        // Task 3: Get the logo and save it
        // Implement the logic here to capture and save the logo image
        // Example: Assuming the logo image is available in a <img> tag with class "logo"
        const logoElement = $('.logo');
        if (logoElement.length > 0) {
            const logoSrc = logoElement.attr('src');
            const logoFileName = url.toLowerCase().replace(/(^\w+:|^)\/\//, '') + '-logo.png'; // Example filename generation
            // Implement code to download and save the logo using the logoSrc and logoFileName
            data.logo_filename = logoFileName;
        }

        // Task 4: Collect the phone number
        const phoneNumber = $('body').text().match(/(\d{3}\.\d{3}\.\d{4})/);

        if (phoneNumber) {
            data['sales phone'] = phoneNumber[0]; // Access the matched phone number
        } else {
            data['sales phone'] = 'NOT FOUND';
        }



        companyData.push(data);
    }

    await browser.close();

    // Create a worksheet from the companyData array
    const worksheet = XLSX.utils.json_to_sheet(companyData);

    // Create a new workbook and add the worksheet to it
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Data');

    // Save the workbook to an Excel file
    XLSX.writeFile(workbook, 'company_data.xlsx');
}

scrapeCompanyData();
