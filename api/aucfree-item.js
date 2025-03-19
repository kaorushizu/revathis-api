const axios = require("axios");
const cheerio = require("cheerio");

// 定数定義
const CONFIG = {
  TIMEOUT: 10000,
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  BASE_URL: "https://aucfree.com/items"
};

// セレクタ定義
const SELECTORS = {
  TITLE: "#item_tl_h1 h1",
  PRICE: "li:contains('落札価格')",
  START_PRICE: "li:contains('開始価格')",
  BID_COUNT: "li:contains('入札件数')",
  CONDITION: "li:contains('商品状態')",
  END_DATE: "#item_info_box dt",
  IMAGES: "#item_imgs li.itemimage img.item_img",
  DESCRIPTION: "#item_desc > center",
  CATEGORIES: "#category_path a"
};

/**
 * オークションIDからURLを構築する関数
 * @param {string} auctionId - オークションID
 * @returns {string} 完全なURL
 */
function buildUrl(auctionId) {
  return `${CONFIG.BASE_URL}/${auctionId}`;
}

/**
 * 日付文字列をUNIXタイムスタンプに変換する関数
 * @param {string} dateText - 日付文字列（例：2021年11月21日 23時10分）
 * @returns {number} UNIXタイムスタンプ
 */
function dateToUnix(dateText) {
  if (!dateText) return null;
  
  const match = dateText.match(/(\d+)年(\d+)月(\d+)日\s*(\d+)時(\d+)分/);
  if (match) {
    const [_, year, month, day, hour, minute] = match;
    const date = new Date(year, month - 1, day, hour, minute);
    return Math.floor(date.getTime() / 1000);
  }
  
  return null;
}

/**
 * 数値文字列から数値を抽出する関数
 * @param {string} text - 数値が含まれる文字列
 * @returns {string} 抽出された数値文字列
 */
function extractNumber(text) {
  return text.match(/([0-9,]+)/)?.[1]?.replace(/,/g, '') || '';
}

/**
 * 商品情報を取得する関数
 * @param {string} auctionId - オークションID
 * @returns {Object} 商品情報オブジェクト
 */
async function fetchItemData(auctionId) {
  const url = buildUrl(auctionId);
  console.log(`商品ページの取得を開始: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": CONFIG.USER_AGENT },
      timeout: CONFIG.TIMEOUT
    });
    
    const $ = cheerio.load(response.data);
    
    // 商品タイトル
    const title = $(SELECTORS.TITLE).clone().find('span').remove().end().text().trim();
    
    // 価格情報
    const price = extractNumber($(SELECTORS.PRICE).text().trim());
    const startPrice = extractNumber($(SELECTORS.START_PRICE).text().trim());
    
    // 入札情報
    const bidCount = extractNumber($(SELECTORS.BID_COUNT).text().trim());
    const biddersNum = bidCount;
    const watchListNum = 0;
    
    // 商品状態
    const condition = $(SELECTORS.CONDITION).text().trim().split('商品状態')[1]?.trim() || '';
    
    // 日時情報
    let endDate = '';
    $(SELECTORS.END_DATE).each((i, el) => {
      if ($(el).text().trim() === '終了日時') {
        endDate = $(el).next('dd').text().trim();
        return false;
      }
    });
    const endDateUnix = dateToUnix(endDate);
    
    // 商品画像
    const images = [];
    $(SELECTORS.IMAGES).each((i, el) => {
      const imgSrc = $(el).attr('data-src-original') || $(el).attr('src');
      if (imgSrc && !imgSrc.includes('loading.svg')) {
        images.push(imgSrc);
      }
    });
    
    // 商品説明
    const description = $(SELECTORS.DESCRIPTION).html().trim();
    
    // カテゴリ情報
    const categories = [];
    $(SELECTORS.CATEGORIES).each((i, el) => {
      const categoryName = $(el).text().trim();
      const href = $(el).attr('href');
      const categoryId = href?.match(/c=(\d+)/)?.[1] || String(i);
      if (categoryName && categoryName !== 'トップ') {
        categories.push({
          name: categoryName,
          id: categoryIdモデル
        });
      }
    });
    
    return {
      auctionId,
      title,
      keyword: null,
      quantity: 1,
      biddersNum: Number(biddersNum) || 0,
      watchListNum,
      price: Number(price) || null,
      startPrice: Number(startPrice) || null,
      bidCount: Number(bidCount) || null,
      condition,
      endDate,
      endDateUnix,
      images,
      description,
      categories,
      brands: null,
      seller: null,
      shipping: null,
      tax: null,
      url
    };
    
  } catch (error) {
    console.error(`商品情報の取得に失敗しました: ${error.message}`);
    throw error;
  }
}

/**
 * オークションIDの形式を検証する関数
 * @param {string} auctionId - オークションID
 * @returns {boolean} 有効な形式かどうか
 */
function isValidAuctionId(auctionId) {
  return /^[a-zA-Z][0-9]+$/.test(auctionId);
}

// APIハンドラー関数
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GETメソッドのみ許可されています' });
  }

  try {
    const { auctionId } = req.query;
    
    if (!auctionId) {
      return res.status(400).json({ error: 'オークションIDが必要です' });
    }
    
    if (!isValidAuctionId(auctionId)) {
      return res.status(400).json({ error: '無効なオークションID形式です' });
    }
    
    console.log(`商品情報取得開始: ${auctionId}`);
    const itemInfo = await fetchItemData(auctionId);
    console.log(`商品情報取得完了: ${itemInfo.title}`);
    
    return res.status(200).json(itemInfo);
    
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "商品情報の取得に失敗しました" });
  }
}; 