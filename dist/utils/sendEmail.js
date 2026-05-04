"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async (options) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    if (!emailUser || !emailPass) {
        throw new Error('Missing email credentials. Set EMAIL_USER and EMAIL_PASSWORD.');
    }
    const transporter = nodemailer_1.default.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 2525,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
    const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'no-reply@biologyplatform.com';
    const fromName = process.env.FROM_NAME;
    const mailOptions = {
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };
    await transporter.sendMail(mailOptions);
};
exports.default = sendEmail;
