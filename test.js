const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const XLSX = require('xlsx');
const fs = require('fs');
const sharp = require('sharp');
const axios = require('axios');



async function scrapeCompanyData() {
    const browser = await puppeteer.launch({ headless: "new" }, {
        ignoreHTTPSErrors: true,
        args: ['--ignore-certificate-errors']
    });
    const page = await browser.newPage();

    const urls = ['https://509fiber.com/', 'https://allegiantnow.com/', 'https://www.altitudeisp.com/', 'https://www.barryelectric.com/', 'https://www.wikipedia.com/']; // Replace with your list of URLs
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
            sales_phone: '',
        };

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Task 1: Verify and update the website URL
        const currentUrl = page.url();
        if (currentUrl !== url) {
            data.new_website = currentUrl;
        }

        // Log the result
        console.log(`URL: ${url}`);
        console.log(`New Website: ${data.new_website}`);
        console.log('---------------------------');


        // Task 1: Verify and update the website URL
        const currentUrlPage = page.url();
        if (currentUrlPage !== url) {
            const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 5000 });
            const redirectedUrl = response.url();
            if (redirectedUrl !== currentUrlPage) {
                data.new_website = redirectedUrl;
            }
        }


        // Extract ISP name from the URL
        // const urlRegex = /^(?:https?:\/\/)?(?:www\.)?(.*?)\.(?:com|net|org|edu|gov|mil|co|io|ai|app|tech|online|store|us|ca|uk)$/i;
        // const urlRegex = /^(?:https?:\/\/)?(?:www\.)?([^./]+)\.[^.]+$/i;
        // const urlMatch = url.match(urlRegex);
        // const ispName = urlMatch ? urlMatch[1] : '';
        // const pname = await page.content();
        // const p = cheerio.load(pname);
        // const pTitle = p('meta[property="og:title"]').attr('content');

        // // Extract the URL from the title
        // const urlRegex = /^(?:https?:\/\/)?(?:www\.)?([^./]+)\.[^.]+$/i;
        // const extractedUrl = pTitle.match(urlRegex);

        // // Remove text before and including the pipe character (|) if it exists and doesn't match the URL
        // const cleanedTitle = extractedUrl ? pTitle.replace(/^.*?\|\s*/, '') : pTitle;

        // // Split the cleaned title at the pipe character (|) and extract the first part
        // const splitTitle = cleanedTitle.split('|');
        // const extractedName = splitTitle[0].trim();

        // // Assign ISP name to isp_name_long and isp_name_short
        // data.isp_name_long = extractedName;
        // data.isp_name_short = extractedName.replace(/-/g, ' ');

        // // Example: Convert "altitude-isp" to "Altitude ISP"
        // data.isp_name_short = data.isp_name_short.replace(/\b\w/g, match => match.toUpperCase());

        // console.log('ISP Name (Long):', data.isp_name_long);
        // console.log('ISP Name (Short):', data.isp_name_short);


        const pname = await page.content();
        const p = cheerio.load(pname);
        const pTitle = p('meta[property="og:title"]').attr('content');

        // Check if pTitle is defined and contains the pipe character (|)
        let extractedNames = [];
        if (pTitle && pTitle.includes('|')) {
            extractedNames = pTitle.split('|').map(name => name.trim());
        } else if (pTitle && pTitle.includes(',')) {
            extractedNames = pTitle.split(',').map(name => name.trim());
        } else {
            extractedNames = [pTitle ? pTitle.trim() : ''];
        }

        // Assign ISP name to isp_name_long and isp_name_short
        data.isp_name_long = extractedNames.length > 1 ? extractedNames[1] : extractedNames[0];
        data.isp_name_short = extractedNames.length > 1 ? extractedNames[1] : extractedNames[0];
        data.isp_name_short = data.isp_name_short.replace(/-/g, ' ');

        console.log('ISP Name (Long):', data.isp_name_long);
        console.log('ISP Name (Short):', data.isp_name_short);





        // Assign ISP name to isp_name_long and isp_name_short
        data.isp_name_long = extractedNames.length > 1 ? extractedNames[1] : extractedNames[0];
        data.isp_name_short = extractedNames.length > 1 ? extractedNames[1] : extractedNames[0];
        data.isp_name_short = data.isp_name_short.replace(/-/g, ' ');

        // Generate isp_slug based on isp_name_short or isp_name_long
        data.isp_slug = generateSlug(data.isp_name_short);

        console.log('ISP Slug:', data.isp_slug);

        // Function to generate a slug from a given string
        function generateSlug(name) {
            return name.toLowerCase().replace(/\s+/g, '-');
        }

        console.log('ISP Slug:', data.isp_slug);










        // Task 2: Verify company status and ISP classification
        const html = await page.content();
        const $ = cheerio.load(html);

        const pageTitle = $('meta[property="og:title"]').attr('content');
        console.log("pageTitle", pageTitle);

        if (pageTitle) {
            const isISP = pageTitle.toLowerCase().includes('internet service provider') || pageTitle.includes('isp') || pageTitle.includes('ISP');

            if (!isISP) {
                if (pageTitle.toLowerCase().includes('closed')) {
                    data.closed = 'CLOSED';
                } else if (pageTitle.toLowerCase().includes('purchased') || pageTitle.toLowerCase().includes('merged')) {
                    data.closed = 'PURCHASED';
                    // Add logic to get new entity's website and name
                    const matches = currentUrl.match(/:\/\/(.[^/]+)/);
                    if (matches && matches.length > 1) {
                        data.new_website = matches[1];
                        data.new_isp_name_long = matches[1];
                    }
                } else {
                    data.closed = 'NOT AN ISP';
                }
            }
        } else {
            data.closed = 'NOT AN ISP';
        }



        // Task 3: Get the logo and save it
        // const minLogoWidth = 80;
        // const maxLogoWidth = 400;
        // const imageFormats = ['.png', '.jpg', '.jpeg']; // Add more formats if needed
        // const logoWidth = 1080;
        // const logoHeight = Math.round(logoWidth * (9 / 16)); // Assuming a 16:9 aspect ratio

        // const logoElements = await page.$$('img[src$="' + imageFormats.join('"], img[src$="') + '"]');
        // // console.log("logoElements: ", logoElements);

        // let logoElementFiltered = null;

        // for (const element of logoElements) {
        //     const logoBoundingBox = await element.boundingBox();

        //     if (
        //         logoBoundingBox &&
        //         logoBoundingBox.width >= minLogoWidth &&
        //         logoBoundingBox.width <= maxLogoWidth
        //     ) {
        //         logoElementFiltered = element;
        //         break;
        //     }
        // }

        // if (logoElementFiltered) {
        //     const logoBoundingBox = await logoElementFiltered.boundingBox();
        //     const logoScreenshot = await page.screenshot({
        //         clip: {
        //             x: logoBoundingBox.x,
        //             y: logoBoundingBox.y,
        //             width: logoBoundingBox.width,
        //             height: logoBoundingBox.height,
        //         },
        //     });

        //     const logoResized = await sharp(logoScreenshot)
        //         .resize(logoWidth, logoHeight, { fit: 'inside' }) // Set resize options to fit the image content
        //         .flatten({ background: { r: 255, g: 255, b: 255 } }) // Set background color to white
        //         .toBuffer();

        //     if (!data.closed.toLowerCase().includes('not an isp')) {
        //         const logoFilename = `${data.isp_slug}-logo.png`;
        //         fs.writeFileSync(logoFilename, logoResized);
        //         data.logo_filename = logoFilename;
        //     } else {
        //         data.logo_filename = '';
        //     }
        // }

        // console.log('Logo Filename:', data.logo_filename);


        // const firstLogoElement = await page.$('img[src]');
        // if (firstLogoElement) {
        //     const src = await firstLogoElement.evaluate((node) => node.getAttribute('src'));
        //     console.log('Logo Source URL:', src);

        //     let modifiedSrc = src;
        //     if (src.startsWith('//')) {
        //         modifiedSrc = `https:${src}`;
        //     } else if (!src.startsWith('http://') && !src.startsWith('https://')) {
        //         try {
        //             modifiedSrc = `${currentUrl}${src}`;
        //           } catch (error) {
        //             modifiedSrc = `https://${src}`;
        //           }
        //     } else{
        //         console.log("error: url invalid");
        //     }

        //     console.log("modifiedSrc: ",modifiedSrc);

        //     await page.goto(modifiedSrc);
        //     const screenshot = await page.screenshot();

        //     const logoFilename = `${data.isp_slug}-logo.png`;
        //     fs.writeFileSync(logoFilename, screenshot);

        //     console.log('Logo Screenshot Saved:', logoFilename);
        // }

        const minLogoWidth = 80;
        const maxLogoWidth = 400;
        const imageFormats = ['.png', '.jpg', '.jpeg']; // Add more formats if needed
        const logoWidth = 1080;
        const logoHeight = Math.round(logoWidth * (9 / 16)); // Assuming a 16:9 aspect ratio

        const logoElements = await page.$$('img[src$="' + imageFormats.join('"], img[src$="') + '"]');
        let logoElementFiltered = null;

        for (const element of logoElements) {
            const logoBoundingBox = await element.boundingBox();

            if (logoBoundingBox && logoBoundingBox.width >= minLogoWidth && logoBoundingBox.width <= maxLogoWidth) {
                logoElementFiltered = element;
                break;
            }
        }

        if (logoElementFiltered) {
            const logoBoundingBox = await logoElementFiltered.boundingBox();
            const logoScreenshot = await page.screenshot({
                clip: {
                    x: logoBoundingBox.x,
                    y: logoBoundingBox.y,
                    width: logoBoundingBox.width,
                    height: logoBoundingBox.height,
                },
            });

            const logoResized = await sharp(logoScreenshot)
                .resize(logoWidth, logoHeight, { fit: 'inside' }) // Set resize options to fit the image content
                .flatten({ background: { r: 255, g: 255, b: 255 } }) // Set background color to white
                .toBuffer();

            if (!data.closed.toLowerCase().includes('not an isp')) {
                const logoFilename = `${data.isp_slug}-logo.png`;
                fs.writeFileSync(logoFilename, logoResized);
                data.logo_filename = logoFilename;
            } else {
                data.logo_filename = '';
            }
        }

        console.log('Logo Filename:', data.logo_filename);













        // Task 4: Collect the phone number
        const htmlPhone = await page.content();
        const $p = cheerio.load(htmlPhone);

        const phoneNumberRegex = /(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]\d{4}/g;

        const salesPhoneNumbers = new Set();
        $p('body').each((index, element) => {
            const text = $(element).text();
            const styleText = $(element).find('style').text();
            const matches = text.match(phoneNumberRegex);
            if (matches) {
                matches.forEach((phone) => {
                    if (
                        phone.replace(/\D/g, '').length <= 10 &&
                        !styleText.includes(phone)
                    ) {
                        salesPhoneNumbers.add(phone.replace(/\s/g, '.'));
                    }
                });
            }
        });

        if (salesPhoneNumbers.size > 0) {
            data.sales_phone = Array.from(salesPhoneNumbers).join(', ');
        }

        console.log('Sales Phone:', data.sales_phone);



        companyData.push(data);
    }

    console.log(companyData);

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
