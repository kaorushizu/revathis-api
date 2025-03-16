const express = require("express");
const SellingPartner = require('amazon-sp-api');
const bodyParser = require('body-parser');
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// SP-APIの設定
let sellingPartner = new SellingPartner({
    region: 'fe',
    refresh_token: process.env.REFRESH_TOKEN,
    credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SELLING_PARTNER_APP_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SELLING_PARTNER_APP_CLIENT_SECRET,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        // AWS_SELLING_PARTNER_ROLE: process.env.AWS_SELLING_PARTNER_ROLE
    }
});

// POST用のSP-APIエンドポイント
app.post("/api/spapi", async (req, res) => {
    try {
        const apiRequest = req.body;
        const apiResponse = await sellingPartner.callAPI(apiRequest);
        res.json(apiResponse);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET用のSP-APIエンドポイント
app.get("/api/spapi", async (req, res) => {
    try {
        const apiRequest = req.query;
        const apiResponse = await sellingPartner.callAPI(apiRequest);
        res.json(apiResponse);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// エクスポート（Vercel用）
module.exports = app;