const SellingPartner = require("amazon-sp-api");

module.exports = async (req, res) => {
    try {
        console.log("カタログ検索API リクエスト:", req.method);

        // クエリパラメータ `keywords` を取得
        const keywords = req.query.keywords;
        if (!keywords) {
            return res.status(400).json({ error: "検索キーワードを指定してください。?keywords=アイリスオーヤマ+サーキュレーター" });
        }

        console.log("検索キーワード:", keywords);

        // **環境変数が正しく設定されているかチェック**
        if (!process.env.REFRESH_TOKEN) {
            throw new Error("REFRESH_TOKEN が設定されていません。Vercel の環境変数を確認してください。");
        }

        // **SP-API クライアントを初期化**
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

        // **SP-API の商品カタログ検索をリクエスト**
        const apiResponse = await sellingPartner.callAPI({
            operation: "searchCatalogItems",
            endpoint: "catalogItems",
            query: {
                includedData: ["images", "summaries"],
                marketplaceIds: ["A1VC38T7YXB528"], // 日本のマーケットプレイス
                keywords: keywords
            },
            options: { version: "2022-04-01" }
        });

        console.log("SP-API 商品検索レスポンス:", apiResponse);
        return res.json(apiResponse);

    } catch (error) {
        console.error("SP-API エラー:", error.stack);
        return res.status(500).json({ error: "SP-API の商品検索に失敗しました", details: error.message });
    }
};