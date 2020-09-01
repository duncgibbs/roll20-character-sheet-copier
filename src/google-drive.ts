import * as fs from 'fs';
import * as readline from 'readline';
import { google, drive_v3 } from 'googleapis';
type Credentials = typeof google.auth.OAuth2.prototype.credentials;
type OAuth2Client = typeof google.auth.OAuth2.prototype;

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = './token.json';

export default class GoogleDrive {

    drive!: drive_v3.Drive;

    public async init() {
        return this.getAuth().then(auth => {
            if (auth) {
                this.drive = google.drive({
                    version: 'v3',
                    auth: auth
                })
            } else {
                this.drive = google.drive({
                    version: 'v3'
                });
            }
        });
    }

    public replaceFiles(driveFolder: string, sheetPaths: string[]) {
        this.getFolderId(driveFolder).then(id => {
            if (id) {
                this.removeFiles(id).then(() => {
                    this.uploadFiles(id, sheetPaths);
                })
            }
        });
    }

    private getAuth(): Promise<OAuth2Client | null> {
        return fs.promises.readFile('./credentials.json').then(credentials => {
            const parsedCredentials = JSON.parse(credentials.toString()).installed;
            const oAuth2Client = new google.auth.OAuth2(
                parsedCredentials.client_id,
                parsedCredentials.client_secret,
                parsedCredentials.redirect_uris[0]
            );
            return this.getAccessToken(oAuth2Client).then(token => {
                if (token) {
                    oAuth2Client.setCredentials(token);
                    return oAuth2Client;
                } else {
                    return null;
                }
            });
        }).catch(err => {
            console.log('Error reading credentials file.', err);
            return null;
        });
    }

    private getAccessToken(oAuth2Client): Promise<Credentials | null> {
        return fs.promises.readFile(TOKEN_PATH).then(tokens => {
            return JSON.parse(tokens.toString()).tokens;
        }).catch(err => {
            if (err.code === 'ENOENT') {
                return this.generateAccessToken(oAuth2Client);
            } else {
                console.log(err);
                return null;
            }
        })
    }

    private generateAccessToken(oAuth2Client: OAuth2Client): Promise<Credentials | null> {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log(`Authorize this app by visiting this url:\n${authUrl}\n`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve, reject) => {
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                return oAuth2Client.getToken(code).then((token) => {
                    // Store the token to disk for later program executions
                    return fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token)).then(() => {
                        console.log('Token stored to', TOKEN_PATH);
                        resolve(token.tokens);
                    }).catch(err => {
                        console.log('Error saving token.', err);
                        resolve(null);
                    });
                }).catch(err => {
                    console.error('Error retrieving access token', err);
                    resolve(null);
                });
            });
        });
    }

    private async uploadFiles(driveFolderId: string, paths: string[]) {
        console.log('Uploading character sheets...');
        for await (const characterSheet of paths) {
            const fileName = characterSheet.split('/').pop();
            await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [driveFolderId]
                },
                media: {
                    body: fs.createReadStream(characterSheet)
                }
            }).then(response => {
                console.log(`\tCreated ${response.data.name}`);
            });
        }
    }

    private removeFiles(driveFolderId: string) {
        console.log('Deleting existing sheets...')
        return this.drive.files.list({
            q: `'${driveFolderId}' in parents`
        }).then(async response => {
            if (response.data.files) {
                for await (const file of response.data.files) {
                    await this.drive.files.delete({
                        fileId: file.id
                    }).then(() => {
                        console.log(`\tDeleted ${file.name}`);
                    });
                }
            }
        }).catch(err => {
            console.log('Error listing files', err);
        });
    }

    private getFolderId(driveFolder: string) {
        return this.drive.files.list({
            q: `name = '${driveFolder}'`
        }).then(response => {
            if (response.data.files?.length) {
                return response.data.files[0].id;
            } else {
                return this.drive.files.create({
                    requestBody: {
                        name: driveFolder,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                }).then(response => {
                    return response.data.id;
                });
            }
        }).catch(err => {
            console.log('Error listing files', err);
            return null;
        });
    }
}
