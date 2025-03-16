const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {

    console.log("test")
    try {
        const keyword = req.query.keyword;
        if (!keyword) {
            return res.status(400).json({ error: "キーワードを指定してください" });
        }

        const url = `https://aucfree.com/search?from=2015-06&o=t2&q=${encodeURIComponent(keyword)}&to=2030-01`;

        // HTML を取得
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        console.log("Fetched HTML:", response.data); // 500文字だけ出力（デバッグ用）

        const $ = cheerio.load(response.data);
        const results = [];


        const $items = $(".results_bid.hover_on");



        // テキストから最初の数字とドットを削除する関数
        function removeLeadingNumberAndDot(text) {
            return text.replace(/^\d+\.\s*/, '');
        }

        function convertDateToNumber(dateText) {
            return dateText.replace(/(\d+)年(\d+)月(\d+)日/, (_, year, month, day) => {
                return year + String(month).padStart(2, '0') + String(day).padStart(2, '0');
            });
        }



        $items.each(function () {
            // オークションIDをTRにセットしておく（後から何かと使える為）
            const href = $(this).find(".results_bid-image a").attr("href");
            const aid = href.replace("/items/", "");
            $(this).attr("id", aid);
            $(this).addClass("add_item");

            // 長い商品名に置換え & リンク削除
            const longTitle = $(this).find(".results_bid-image img").attr("alt").replace("の1番目の画像", "");
            $(this).find(".item_title").replaceWith('<p class="addItemName" style="cursor:text;">' + longTitle + '</p>');


            // 対象商品の情報を取得
            const $item = $(this).closest(".add_item");

            const copyObj = {
                参照元: "ヤフオク",
                オークションID: $item.attr("id"),
                商品名: $item.find(".addItemName").text().trim(),
                落札金額: $item.find(".item_price").text().replace("円", "").replace(",", "").trim(),
                // カテゴリID: $item.find(".add_catId").text().trim(),
                画像URL: $item.find(".results_bid-image a img").attr("data-src"),
                入札数: $item.find(".results-bid").text().replace(/\r?\n/g, '').replace("件", "").trim(),
                終了日時: $item.find(".results-limit").text().replace(/\r?\n/g, '').trim(),
                // 状態: removeLeadingNumberAndDot($item.find(".add_conditionTag").text().trim()),
                // 送料: $item.find(".add_shipping").text().trim()
            };
            //商品画像はオークファン形式へ切替
            copyObj.画像URL = `https://auctions.afimg.jp/item_data/thumbnail/${convertDateToNumber(copyObj.終了日)}/yahoo/c/${copyObj.オークションID}.jpg`

            results.push(copyObj);

        });





        console.log("Parsed Results:", results); // パース結果をログ出力（デバッグ用）

        res.json(results);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "データの取得に失敗しました" });
    }
};