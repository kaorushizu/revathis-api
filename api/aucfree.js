const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
// test

    try {
        const keyword = req.query.keyword;
        // if (!keyword) {
        //     return res.status(400).json({ error: "キーワードを指定してください" });
        // }
        const page = Number(req.query.page ?? 1);
        const negative_keyword = req.query.negative_keyword ?? "";
        const status = req.query.status ?? "";
        const seller = req.query.seller ?? "";
        const min = req.query.min ?? "";
        const max = req.query.max ?? "";

        const url = `https://aucfree.com/search?from=2015-06&o=t2&q=${encodeURIComponent(keyword)}&to=2030-01&p=${page}&nq=${encodeURIComponent(negative_keyword)}&itemstatus=${status}&seller=${seller}&l=${min}&u=${max}`;
        console.log( url )

        // HTML を取得
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        console.log("Fetched HTML:", response.data); // 500文字だけ出力（デバッグ用）

        const $ = cheerio.load(response.data);
        
        //合計数取得
        const pageTotal = Number($(".page_nav:nth-of-type(1) p span:nth-of-type(3)").text().replaceAll(",",""));        

        let items = [];

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

            const itemObj = {
                オークションID: $item.attr("id"),
                商品名: $item.find(".addItemName").text().trim(),
                落札金額: Number($item.find(".item_price").text().replace("円", "").replace(",", "").trim() ),
                // カテゴリID: $item.find(".add_catId").text().trim(),
                画像URL: $item.find(".results_bid-image a img").attr("data-src"),
                入札数: Number( $item.find(".results-bid").text().replace(/\r?\n/g, '').replace("件", "").trim() ),
                終了日: $item.find(".results-limit").text().replace(/\r?\n/g, '').trim(),
                // 状態: removeLeadingNumberAndDot($item.find(".add_conditionTag").text().trim()),
                // 送料: $item.find(".add_shipping").text().trim()
            };
            //商品画像はオークファン形式へ切替
            itemObj.画像URL = `https://auctions.afimg.jp/item_data/thumbnail/${convertDateToNumber(itemObj.終了日)}/yahoo/c/${itemObj.オークションID}.jpg`

            items.push(itemObj);

        });


        const output = {
            "page":page,
            "page_total":pageTotal,
            "items":items
        }
        console.log("Parsed Results:", output); // パース結果をログ出力（デバッグ用）


        res.json(output);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "データの取得に失敗しました" });
    }
};

// // API パラメーター仕様書

// ## エンドポイント
// `GET /api/aucfree`

// ## パラメーター

// ### keyword (必須)
// - 説明: 検索キーワード
// - 型: `string`
// - 例: `laptop`

// ### page (任意)
// - 説明: ページ番号
// - 型: `number`
// - デフォルト: `1`
// - 例: `2`

// ### negative_keyword (任意)
// - 説明: 除外するキーワード
// - 型: `string`
// - デフォルト: `""`
// - 例: `used`

// ### status (任意)
// - 説明: 商品の状態
// - 型: `string`
// - デフォルト: `""`
// - 例: `new`

// ### seller (任意)
// - 説明: 出品者のID
// - 型: `string`
// - デフォルト: `""`
// - 例: `seller123`

// ### min (任意)
// - 説明: 最低価格
// - 型: `string`
// - デフォルト: `""`
// - 例: `1000`

// ### max (任意)
// - 説明: 最高価格
// - 型: `string`
// - デフォルト: `""`
// - 例: `5000`

// ## レスポンス

// ### 成功時 (200 OK)
// - 説明: 検索結果を返します。
// - 型: `application/json`
// - 例:
//   ```json
//   {
//       "page": 1,
//       "page_total": 10,
//       "items": [
//           {
//               "オークションID": "123456789",
//               "商品名": "Example Product",
//               "落札金額": 1500,
//               "画像URL": "https://example.com/image.jpg",
//               "入札数": 5,
//               "終了日": "2023-10-01"
//           }
//       ]
//   }
//   ```

// ### 失敗時 (500 Internal Server Error)
// - 説明: データの取得に失敗した場合のエラーメッセージを返します。
// - 型: `application/json`
// - 例:
//   ```json
//   {
//       "error": "データの取得に失敗しました"
//   }
//   ```