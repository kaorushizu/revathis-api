const axios = require("axios");
const cheerio = require("cheerio");

// 定数
const ITEMS_PER_PAGE = 50;
const BASE_URL = "https://aucfree.com/search";
const IMAGE_PROXY_URL = "https://image-proxy.shizu-8bd.workers.dev/?url=";

/**
 * オークフリーのAPI
 */
module.exports = async (req, res) => {
    try {
        // パラメータ取得
        const {
            keyword,
            page = 1,
            negative_keyword = "",
            status = "",
            seller = "",
            min = "",
            max = ""
        } = req.query;

        // ページ番号を数値に変換
        const currentPage = Number(page);
        
        // 検索URLの構築
        const url = buildSearchUrl({
            keyword,
            currentPage,
            negative_keyword,
            status,
            seller,
            min,
            max
        });
        
        // HTMLを取得
        const html = await fetchHtml(url);
        
        // HTMLをパース
        const result = parseHtml(html);
        
        // レスポンスを返す
        res.json(result);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            error: "データの取得に失敗しました", 
            message: error.message 
        });
    }
};

/**
 * 検索URLを構築する
 */
function buildSearchUrl({ keyword, currentPage, negative_keyword, status, seller, min, max }) {
    return `${BASE_URL}?from=2015-06&o=t2&q=${encodeURIComponent(keyword || "")}&to=2030-01&p=${currentPage}&nq=${encodeURIComponent(negative_keyword)}&itemstatus=${status}&seller=${seller}&l=${min}&u=${max}`;
}

/**
 * HTMLを取得する
 */
async function fetchHtml(url) {
    console.log("Requesting URL:", url);
    
    const response = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    });
    
    return response.data;
}

/**
 * HTMLをパースして結果を返す
 */
function parseHtml(html) {
    const $ = cheerio.load(html);
    
    // 合計アイテム数取得
    const itemsTotal = Number($(".page_nav:nth-of-type(1) p span:nth-of-type(3)").text().replaceAll(",", "") || 0);
    
    // 合計ページ数計算
    const pageTotal = Math.ceil(itemsTotal / ITEMS_PER_PAGE);
    
    // アイテム一覧を取得
    const items = parseItems($);
    
    return {
        current_page: Number($(".page_nav:nth-of-type(1) span.current").text() || 1),
        page_total: pageTotal,
        items_total: itemsTotal,
        items: items
    };
}

/**
 * アイテム一覧をパースする
 */
function parseItems($) {
    const items = [];
    const $items = $(".results_bid.hover_on");
    
    $items.each(function (index) {
        try {
            const item = parseItem($, $(this), index);
            if (item) {
                items.push(item);
            }
        } catch (error) {
            console.error("Error parsing item:", error);
        }
    });
    
    return items;
}

/**
 * 個別のアイテムをパースする
 */
function parseItem($, $element, index) {
    // オークションIDを取得
    const href = $element.find(".results_bid-image a").attr("href");
    if (!href) return null;
    
    const auctionId = href.replace("/items/", "");
    
    // 商品名を取得
    const title = $element.find(".results_bid-image img").attr("alt")?.replace("の1番目の画像", "") || "";
    
    // 価格を取得
    const price = Number($element.find(".item_price").text().replace("円", "").replace(/,/g, "").trim() || 0);
    
    // 画像URLを取得
    const imageUrl = index === 0
        ? $element.find(".results_bid-image a img").attr("src")
        : $element.find(".results_bid-image a img").attr("data-src");
    
    // 入札数を取得
    const bidCount = Number($element.find(".results-bid").text().replace(/\r?\n/g, '').replace("件", "").trim() || 0);
    
    // 終了日を取得
    const endDate = $element.find(".results-limit").text().replace(/\r?\n/g, '').trim();
    
    return {
        オークションID: auctionId,
        商品名: title,
        落札金額: price,
        画像URL: `${IMAGE_PROXY_URL}${imageUrl}`,
        入札数: bidCount,
        終了日: endDate
    };
}
