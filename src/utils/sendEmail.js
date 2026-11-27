import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    const user = (process.env.EMAIL_USER || process.env.EMAILUSER || '').trim();
    const pass = (process.env.EMAIL_PASS || process.env.EMAILPASS || '').trim().replace(/\s+/g, '');

    if (!user) {
        throw new Error('EMAIL_USER is missing in .env. Please specify your Gmail address (e.g. EMAIL_USER=yourname@gmail.com).');
    }
    if (!pass) {
        throw new Error('EMAIL_PASS is missing in .env. Please specify your 16-character Gmail App Password.');
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Standard service, assumes standard App Password usage
        auth: {
            user,
            pass
        }
    });

    // Define the email options
    const mailOptions = {
        from: `DISHA Support <${user}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // Actually send the email
    await transporter.sendMail(mailOptions);
};

export default sendEmail;
