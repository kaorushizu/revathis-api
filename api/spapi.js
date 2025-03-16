const SellingPartner = require("amazon-sp-api");

module.exports = async (req, res) => {
    try {
        console.log("SPAPI エンドポイントにリクエスト:", req.method);

        // **環境変数が正しく設定されているかチェック**
        if (!process.env.REFRESH_TOKEN) {
            throw new Error("REFRESH_TOKEN が設定されていません。Vercel の環境変数を確認してください。");
        }

        let sellingPartner = new SellingPartner({
            region: "fe",
            refresh_token: process.env.REFRESH_TOKEN,
            credentials: {
                SELLING_PARTNER_APP_CLIENT_ID: process.env.SELLING_PARTNER_APP_CLIENT_ID,
                SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SELLING_PARTNER_APP_CLIENT_SECRET,
                AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
                AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });

        const apiRequest = req.method === "POST" ? req.body : req.query;
        console.log("SP-API リクエスト:", JSON.stringify(apiRequest));

        const apiResponse = await sellingPartner.callAPI(apiRequest);
        console.log("SP-API レスポンス:", apiResponse);
        return res.json(apiResponse);

    } catch (error) {
        console.error("SP-API エラー:", error.stack);
        return res.status(500).json({ error: "SP-API の呼び出しに失敗しました", details: error.message });
    }
};