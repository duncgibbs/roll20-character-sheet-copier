import { getCharacterSheets } from "./scraper";
import { bundleCharacterSheets } from "./pdf-builder";

console.log('Scraping character sheets...');
getCharacterSheets().then(() => {
    console.log('Generating PDFs...');
    bundleCharacterSheets().then(() => {
        console.log('Uploading PDFs...');

    })
});
