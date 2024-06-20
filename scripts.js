const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/keys', { useNewUrlParser: true, useUnifiedTopology: true });

const keySchema = new mongoose.Schema({
    key: String,
    status: String,
    assignedTo: String
});

const Key = mongoose.model('Key', keySchema);

// PayPal webhook endpoint
app.post('/paypal-webhook', async (req, res) => {
    const { event_type, resource } = req.body;

    if (event_type === 'PAYMENT.SALE.COMPLETED') {
        const email = resource.payer.payer_info.email;
        const key = await Key.findOneAndUpdate({ status: 'active' }, { status: 'assigned', assignedTo: email }, { new: true });

        if (key) {
            // Send email with Nodemailer
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'your-email@gmail.com',
                    pass: 'your-email-password'
                }
            });

            const mailOptions = {
                from: 'your-email@gmail.com',
                to: email,
                subject: 'Your License Key',
                text: `Thank you for your purchase. Your license key is: ${key.key}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Email sent: ' + info.response);
            });

            res.sendStatus(200);
        } else {
            res.status(500).send('No active keys available');
        }
    } else {
        res.sendStatus(400);
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});