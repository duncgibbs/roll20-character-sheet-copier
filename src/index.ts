import { getCharacterSheets } from "./scraper";
import { bundleCharacterSheets } from "./pdf-builder";
import GoogleDrive from "./google-drive";
import * as fs from 'fs';
import './env';

console.log('Scraping character sheets from Roll20...');
getCharacterSheets().then(() => {
    console.log('Generating PDFs...');
    bundleCharacterSheets().then(() => {
        if (process.env.GOOGLE_DRIVE_FOLDER) {
            console.log('Uploading PDFs...');
            const drive = new GoogleDrive();
            drive.init().then(() => {
                fs.promises.readdir('./character-sheets/pdfs/').then(pdfs => {
                    drive.replaceFiles(
                        process.env.GOOGLE_DRIVE_FOLDER!,
                        pdfs.map(pdf => `./character-sheets/pdfs/${pdf}`)
                    );
                });
            });
        } else {
            console.log('No Google Drive Folder specified in the .env file.');
        }
    })
});
