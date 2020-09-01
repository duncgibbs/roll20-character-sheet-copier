# roll20-character-sheet-copier
Puppeteer Scraper to make a copy of character sheets in Roll20 campaigns.

# Installation

To install all dependencies first run

```
npm i
```

You'll also need `imagemagick` cli tools installed. Specifically [magick](https://imagemagick.org/script/magick.php)

# Setup

First, you'll need to create a `.env` file in the root of the project. Populate that file with the variables from the example.

In order to get your `ROLL20_CAMPAIGN_ID`, you'll need to go to Roll20, login and click on the campaign. The url will then have your ID:

```
https://app.roll20.net/campaigns/details/${campaignId}/${campaignName}
```

You'll also need Google Drive credentials. [Follow the instructions here.](https://developers.google.com/drive/api/v3/quickstart/nodejs)

# Running

Once everything is set up, `npm run copy` should scrape the images, convert them to PDFs, and then upload them to Google Drive.