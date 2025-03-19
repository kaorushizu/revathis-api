const axios = require("axios");
const cheerio = require("cheerio");

// 定数定義
const DEFAULT_TIMEOUT = 10000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

/**
 * オークションIDからURLを構築する関数
 * @param {string} auctionId - オークションID
 * @returns {string} 完全なURL
 */
function buildUrl(auctionId) {
  return `https://aucfree.com/items/${auctionId}`;
}

/**
 * 日付文字列を数値形式に変換する関数
 * @param {string} dateText - 日付文字列（例：2021年11月21日 23時10分）
 * @returns {string} 数値形式の日付（例：20211121）
 */
function formatDate(dateText) {
  if (!dateText) return '';
  
  const match = dateText.match(/(\d+)年(\d+)月(\d+)日/);
  if (match) {
    const [_, year, month, day] = match;
    return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  }
  
  return '';
}

/**
 * オークフリーの商品ページから商品情報を取得する関数
 * @param {string} auctionId - オークションID
 * @returns {Object} 商品情報オブジェクト
 */
async function fetchItemData(auctionId) {
  const url = buildUrl(auctionId);
  console.log(`商品ページの取得を開始: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: DEFAULT_TIMEOUT
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // 商品タイトル
    const titleElement = $('h1').filter(function() {
      return $(this).text().includes('の商品情報');
    }).prev('h1');
    const title = titleElement.length > 0 ? titleElement.text().trim() : '';
    
    // 価格情報
    const priceText = $('li:contains("落札価格")').text().trim();
    const price = priceText.match(/([0-9,]+)円/)?.[1]?.replace(/,/g, '') || '';
    
    const startPriceText = $('li:contains("開始価格")').text().trim();
    const startPrice = startPriceText.match(/([0-9,]+)円/)?.[1]?.replace(/,/g, '') || '';
    
    // 入札情報
    const bidCountText = $('li:contains("入札件数")').text().trim();
    const bidCount = bidCountText.match(/([0-9]+)/)?.[1] || '';
    
    // 商品状態
    const conditionText = $('li:contains("商品状態")').text().trim();
    const condition = conditionText.split('商品状態')[1]?.trim() || '';
    
    // 日時情報
    const startDateText = $('li:contains("開始日時")').text().trim();
    const startDate = startDateText.replace('開始日時', '').trim().split('\n')[0].trim();
    
    const endDateText = $('li:contains("終了日時")').text().trim();
    const endDate = endDateText.replace('終了日時', '').trim().split('\n')[0].trim();
    
    // 商品画像
    const images = [];
    $('h2:contains("商品画像")').next().find('img').each((i, el) => {
      const imgSrc = $(el).attr('src');
      if (imgSrc && !images.includes(imgSrc)) {
        images.push(imgSrc);
      }
    });
    
    // 商品説明
    let description = '';
    const descTable = $('table').filter((i, el) => {
      return $(el).text().includes('【商品説明】');
    });
    
    if (descTable.length > 0) {
      description = descTable.text().trim();
    }
    
    // カテゴリ情報
    const categories = [];
    $('h2:contains("の統計データ情報")').each((i, el) => {
      const categoryText = $(el).text().trim();
      const match = categoryText.match(/「(.+?)」の統計データ情報/);
      if (match && match[1]) {
        categories.push(match[1]);
      }
    });
    
    // サムネイルURL
    let thumbnailUrl = '';
    if (endDate) {
      const formattedDate = formatDate(endDate);
      thumbnailUrl = `https://auctions.afimg.jp/item_data/thumbnail/${formattedDate}/yahoo/c/${auctionId}.jpg`;
    }
    
    return {
      auctionId,
      title,
      price: Number(price) || null,
      startPrice: Number(startPrice) || null,
      bidCount: Number(bidCount) || null,
      condition,
      startDate,
      endDate,
      images,
      thumbnailUrl,
      description,
      categories,
      url
    };
    
  } catch (error) {
    console.error(`商品情報の取得に失敗しました: ${error.message}`);
    throw error;
  }
}

// APIハンドラー関数
module.exports = async (req, res) => {
  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GETメソッドのみ許可されています' });
  }

  try {
    const { auctionId } = req.query;
    
    // オークションIDパラメータが必須
    if (!auctionId) {
      return res.status(400).json({ error: 'オークションIDが必要です' });
    }
    
    // オークションIDの形式チェック
    if (!/^[a-zA-Z][0-9]+$/.test(auctionId)) {
      return res.status(400).json({ error: '無効なオークションID形式です' });
    }
    
    console.log(`商品情報取得開始: ${auctionId}`);
    
    // 商品情報を取得
    const itemInfo = await fetchItemData(auctionId);
    
    console.log(`商品情報取得完了: ${itemInfo.title}`);
    
    // 結果を返す
    return res.status(200).json(itemInfo);
    
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "商品情報の取得に失敗しました" });
  }
}; 