const nodemailer = require('nodemailer');

const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL/TLS for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    return transporter;
};

const sendEmail = async (options) => {
    const transporter = createTransporter();

    try {
        // Verify connection configuration
        await transporter.verify();
        console.log('[MAIL] SMTP connection verified!');

        const mailOptions = {
            from: `"Truck Management" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[MAIL] Email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('❌ Email operation failed:', err.message);
        throw err;
    }
};

module.exports = { sendEmail };
