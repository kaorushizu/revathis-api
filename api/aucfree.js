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

    console.log("Fetched HTML:", response.data.substring(0, 500)); // 500文字だけ出力（デバッグ用）

    const $ = cheerio.load(response.data);
    const results = [];

    $(".results_box").each((index, element) => {
      const auctionId = $(element).find(".results_info a").attr("href")?.split("/").pop() || "N/A";
      const title = $(element).find(".results_title").text().trim();
      const price = $(element).find(".results_price").text().replace(/[^\d]/g, ""); // 数字のみ取得
      const bids = $(element).find(".results_bid").text().replace(/[^\d]/g, ""); // 入札数
      const endDate = $(element).find(".results_date").text().trim();
      const imageUrl = $(element).find(".results_img img").attr("src") || "N/A";

      results.push({
        auctionId,
        title,
        price: price ? parseInt(price, 10) : null,
        bids: bids ? parseInt(bids, 10) : null,
        endDate,
        imageUrl
      });
    });

    console.log("Parsed Results:", results); // デバッグ用ログ

    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
};