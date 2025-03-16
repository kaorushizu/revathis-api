const axios = require("axios");
const cheerio = require("cheerio");

// 先頭の数字とドットを削除する関数
function removeLeadingNumberAndDot(text) {
    return text.replace(/^\d+\.\s*/, '');
}

// 日付を数値（YYYYMMDD）に変換する関数
function convertDateToNumber(dateText) {
    return dateText.replace(/(\d+)年(\d+)月(\d+)日/, (_, year, month, day) => {
      return year + String(month).padStart(2, '0') + String(day).padStart(2, '0');
    });
}

module.exports = async (req, res) => {
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

    const $ = cheerio.load(response.data);
    const output = [];

    $(".results_box").each(function () {
        // オークション ID
        const href = $(this).find(".results_info a").attr("href");
        const auctionId = href ? href.replace("/items/", "").trim() : "N/A";

        // 商品名
        const title = $(this).find(".results_title").text().trim();

        // 落札金額
        const price = $(this).find(".results_price").text().replace("円", "").replace(",", "").trim();

        // 入札数
        const bids = $(this).find(".results_bid").text().replace(/\r?\n/g, '').replace("件", "").trim();

        // 終了日
        const endDate = $(this).find(".results_date").text().replace(/\r?\n/g, '').trim();

        // 画像URL
        const imageUrl = `https://auctions.afimg.jp/item_data/thumbnail/${convertDateToNumber(endDate)}/yahoo/c/${auctionId}.jpg`;

        output.push({
            オークションID: auctionId,
            商品名: title,
            落札金額: price ? parseInt(price, 10) : null,
            入札数: bids ? parseInt(bids, 10) : null,
            終了日: endDate,
            画像URL: imageUrl
        });
    });

    console.log("Parsed Results:", output); // デバッグ用a

    res.json(output);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
};