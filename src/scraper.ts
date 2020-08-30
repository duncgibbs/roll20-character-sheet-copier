import './env';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';

export const getCharacterSheets = async () => {
    if (process.env.ROLL20_USERNAME && process.env.ROLL20_PASSWORD && process.env.ROLL20_CAMPAIGN_ID) {
        const browser = await puppeteer.launch({
            // headless: false,
            // slowMo: 200,
            defaultViewport: {
                width: 1000,
                height: 1000
            }
        });
        const page = await browser.newPage();

        await login(page);
    
        await page.goto(`https://app.roll20.net/editor/setcampaign/${process.env.ROLL20_CAMPAIGN_ID}`);
    
        await page.waitForSelector('li[aria-controls="journal"]');
        await page.click('li[aria-controls="journal"]');
    
        await page.waitForSelector('ol.dd-list');
    
        const characters = await page.$$('li.journalitem.dd-item.character');
    
        browser.on('targetcreated', handleCharacterPopup);
    
        for await (const character of characters) {
            character.click();
    
            await page.waitForSelector('button.showpopout.btn.pictos');
            await page.click('button.showpopout.btn.pictos');
    
            await page.waitFor(7000);
        }
    
        await browser.close();
    } else {
        console.log('Set:');
        if (!process.env.ROLL20_USERNAME) console.log('ROLL20_USERNAME');
        if (!process.env.ROLL20_PASSWORD) console.log('ROLL20_PASSWORD');
        if (!process.env.ROLL20_CAMPAIGN_ID) console.log('ROLL20_CAMPAIGN_ID');
        console.log('In the ./.env file.');
        return;
    }
};

const login = async (page: puppeteer.Page) => {
    console.log('Logging on...');
    await page.goto('https://roll20.net/');

    await page.waitForSelector('ul.navbar-nav.navbar-notifications');

    await page.evaluate((username, password) => {
        // const signInButton = document.querySelector('ul.navbar-nav.navbar-notifications') as HTMLElement;
        // signInButton.click();

        const usernameField = document.querySelector('#input_login-email') as HTMLInputElement;
        usernameField.value = username;

        const passwordField = document.querySelector('#input_login-password') as HTMLInputElement;
        passwordField.value = password;

        const submitButton = document.querySelector('button.btn.btn-primary.btn-sm') as HTMLElement;
        submitButton.click();
    }, process.env.ROLL20_USERNAME!, process.env.ROLL20_PASSWORD!);

    await page.waitForSelector('a.userprofile');
};

const handleCharacterPopup = async (target: puppeteer.Target) => {
    if (await target.url() === 'https://app.roll20.net/editor/popout') {
        const characterSheetPage = await target.page();

        await characterSheetPage.waitForSelector('a[data-tab="charsheet"]');

        await characterSheetPage.evaluate(() => {
            const characterSheetButton = document.querySelector('a[data-tab="charsheet"]') as HTMLElement;
            characterSheetButton.click();
        });

        let character = '';

        for (let pageNum = 1; pageNum < 5; pageNum++) {
            if (pageNum === 1) {
                character = await characterSheetPage.$('input[name="attr_character_name"]').then(async elem => {
                    return await (await elem?.getProperty('value'))?.jsonValue() as string;
                });

                console.log(`Grabbing character sheets for: ${character}`);

                await fs.promises.mkdir(`./character-sheets/${character}`).catch(err => {
                    if (err.code !== 'EEXIST') {
                        console.log('Error!');
                        console.log(err);
                    }
                });
            }
            await characterSheetPage.waitForSelector(`input.sheet-pages.sheet-page${pageNum}`);
            await characterSheetPage.click(`input.sheet-pages.sheet-page${pageNum}`);

            const { bodyHeight, bodyWidth } = await characterSheetPage.$eval('div.tab-content', elem => {
                return {
                    bodyHeight: elem.scrollHeight,
                    bodyWidth: elem.scrollWidth 
                }
            });
            await characterSheetPage.setViewport({ width: bodyWidth, height: bodyHeight + 50 });

            await characterSheetPage.waitFor(500);

            await characterSheetPage.screenshot({
                fullPage: true,
                path: `./character-sheets/${character}/${pageNum}.png`
            });
            console.log(`\tPage ${pageNum}`);
        }

        await characterSheetPage.close();
    }
};
