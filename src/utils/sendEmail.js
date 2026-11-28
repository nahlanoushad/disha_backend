import nodemailer from 'nodemailer';

const credentials = () => ({
    user: process.env.EMAIL_USER || process.env.FROM_EMAIL,
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
});

export const isEmailConfigured = () => {
    const { user, pass } = credentials();
    return Boolean(user && pass);
};

/**
 * Sends an email through Gmail.
 * Env: FROM_EMAIL (sender address), EMAIL_PASSWORD (Gmail App Password).
 * EMAIL_USER is only needed if the login address differs from FROM_EMAIL.
 */
const sendEmail = async (options) => {
    const { user, pass } = credentials();

    if (!user || !pass) {
        throw new Error('Email is not configured. Set FROM_EMAIL and EMAIL_PASSWORD in .env.');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    await transporter.sendMail({
        from: `DISHA <${process.env.FROM_EMAIL || user}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    });
};

export default sendEmail;
