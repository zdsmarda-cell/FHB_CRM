import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

if (content.match(/import nodemailer from 'nodemailer';/g)?.length === 1) {
    content = content.replace(/import nodemailer from 'nodemailer';/, '');
    content = "import nodemailer from 'nodemailer';\n" + content;
    fs.writeFileSync('server.ts', content);
}
