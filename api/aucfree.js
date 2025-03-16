const axios = require("axios");
const cheerio = require("cheerio");

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

    console.log("Fetched HTML:", response.data); // 500文字だけ出力（デバッグ用）

    const $ = cheerio.load(response.data);
    const results = [];

    $(".results_box").each(function () {
        console.log("Element found:", $(this).html()); // 取得した要素をログ出力

        const auctionId = $(this).find(".results_info a").attr("href")?.replace("/items/", "").trim() || "N/A";
        const title = $(this).find(".results_title").text().trim();
        const price = $(this).find(".results_price").text().replace("円", "").replace(",", "").trim();
        const bids = $(this).find(".results_bid").text().replace(/\r?\n/g, '').replace("件", "").trim();
        const endDate = $(this).find(".results_date").text().replace(/\r?\n/g, '').trim();
        const imageUrl = $(this).find(".results_img img").attr("src") || "N/A";

        results.push({
            オークションID: auctionId,
            商品名: title,
            落札金額: price ? parseInt(price, 10) : null,
            入札数: bids ? parseInt(bids, 10) : null,
            終了日: endDate,
            画像URL: imageUrl
        });
    });

    console.log("Parsed Results:", results); // パース結果をログ出力（デバッグ用）

    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
};