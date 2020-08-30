import * as im from 'imagemagick';
import * as fs from 'fs';

export const bundleCharacterSheets = async () => {
    await fs.promises.mkdir(`./character-sheets/pdfs`).catch(err => {
        if (err.code !== 'EEXIST') {
            console.log('Error!');
            console.log(err);
        }
    });
    for await (const character of await fs.promises.readdir('./character-sheets')) {
        if (character !== 'pdfs') {
            im.convert([`./character-sheets/${character}/*.png`, `./character-sheets/pdfs/${character}.pdf`], (err) => {
                if (err) {
                    console.log(`Error converting ${character}!`);
                    console.log(err);
                }
            });
        }
    }
};
