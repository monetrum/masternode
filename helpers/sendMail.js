'use strict';
const env = registry.get('env');
const logger = registry.get('logger');
const nodeMailer = require('nodemailer');
const smtpPassword = require('aws-smtp-credentials');
const smtpTransport = require('nodemailer-smtp-transport');
//const sesTransport = require('nodemailer-ses-transport');
//const smtpPassword = require('nodemailer-sm')
const transporter = nodeMailer.createTransport(smtpTransport({
    host: String(env.MAIL_HOST),
    port: parseInt(env.MAIL_PORT),
    auth: {
        user: String(env.MAIL_USER),
        pass: smtpPassword(String(env.MAIL_PASSWORD))
    },
    secure: true
}));

/*
const transporter = nodeMailer.createTransport(sesTransport({
    AWSAccessKeyID: env.MAIL_USER,
    AWSSecretKey: env.MAIL_PASSWORD,
    SeviceUrl: env.MAIL_HOST
}));
*/

async function sendMail(from, fromMail, to, title, content){

    const mailOptions = {
        from: `${from} <${fromMail}>`,
        to: to,
        subject: title,
        html: content
    };

    return new Promise(resolve => {
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                logger.error(`mail gönderilemedi ${error}`);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}

module.exports = sendMail;