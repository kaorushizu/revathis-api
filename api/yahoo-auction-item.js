const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Yahoo オークションの商品情報を取得する API
 */

// 定数
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_TAX_RATE = 10;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// URL構築関数
function buildUrl(auctionId) {
  return `https://auctions.yahoo.co.jp/jp/auction/${auctionId}`;
}

// 日付フォーマット関数
function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}時${date.getMinutes()}分`;
}

// 商品データ取得関数
async function fetchItemData(auctionId) {
  const url = buildUrl(auctionId);
  const response = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT },
    timeout: DEFAULT_TIMEOUT
  });
  
  const html = response.data;
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  
  if (!nextDataMatch?.[1]) {
    throw new Error('商品データが見つかりません');
  }
  
  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    return nextData.props?.pageProps?.initialState?.item?.detail;
  } catch (e) {
    console.error('NEXT_DATAのパース中にエラー:', e);
    throw new Error('商品データの解析に失敗しました');
  }
}

// 商品情報取得関数
async function getItemInfo(auctionId) {
  try {
    console.log(`[INFO] 商品ページを取得開始: ${auctionId}`);
    const itemData = await fetchItemData(auctionId);
    console.log('NEXT_DATAから商品情報を取得しました');
    
    // 基本情報
    const {
      title = '',
      keyword = '',
      quantity = 1,
      biddersNum = 0,
      watchListNum = 0,
      price: currentPrice = null,
      initPrice: startPrice = null,
      taxinPrice,
      taxinStartPrice,
      bids: bidCount = null,
      conditionName: condition = null,
      endTime,
      img: images = [],
      descriptionHtml: description = '',
      category,
      brand,
      seller,
      chargeForShipping,
      taxRate = DEFAULT_TAX_RATE,
      taxinPrice: hasTaxIncluded
    } = itemData;

    // 価格情報の処理
    const finalPrice = taxinPrice || currentPrice;
    const finalStartPrice = taxinStartPrice || startPrice;

    // 終了日時の処理
    let endDate = null;
    let endDateUnix = null;
    if (endTime) {
      const endDateTime = new Date(endTime);
      endDate = formatDate(endDateTime);
      endDateUnix = Math.floor(endDateTime.getTime() / 1000);
    }

    // 画像URLの処理
    const uniqueImages = [...new Set(images.map(img => img.image).filter(Boolean))];

    // カテゴリ情報の処理
    const categories = (category?.path || []).map(cat => ({
      name: cat.name || '',
      id: cat.id || ''
    })).filter(cat => cat.name && cat.id);

    // ブランド情報の処理
    const brands = (brand?.path || []).map(b => ({
      name: b.name || '',
      id: b.id || ''
    })).filter(b => b.name && b.id);

    // 出品者情報の処理
    const sellerInfo = seller ? {
      id: seller.id || '',
      name: seller.displayName || '',
      rating: seller.rating?.summary || null,
      isStore: seller.isStore || false
    } : {
      id: '',
      name: '',
      rating: null,
      isStore: false
    };

    // 応答オブジェクトを構成
    return {
      auctionId,
      title,
      keyword,
      quantity,
      biddersNum,
      watchListNum,
      price: finalPrice,
      startPrice: finalStartPrice,
      bidCount,
      condition,
      endDate,
      endDateUnix,
      images: uniqueImages,
      description,
      categories,
      brands,
      seller: sellerInfo,
      shipping: {
        isFree: chargeForShipping === 'seller'
      },
      tax: {
        included: !!hasTaxIncluded,
        rate: taxRate
      },
      url: buildUrl(auctionId)
    };
    
  } catch (error) {
    console.error(`[ERROR] 商品情報の取得に失敗しました: ${error.message}`);
    console.error(`スタックトレース: ${error.stack}`);
    throw error;
  }
}

// APIハンドラー関数
module.exports = async (req, res) => {
  // CORSヘッダーの設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');

  // OPTIONSリクエストに対する応答
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GETリクエスト以外は拒否
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GETメソッドのみ許可されています' });
  }

  try {
    const { auctionId } = req.query;
    
    // パラメータチェック
    if (!auctionId) {
      return res.status(400).json({ error: 'オークションIDが必要です' });
    }
    
    // オークションIDの形式チェック
    if (!/^[a-zA-Z][0-9]+$/.test(auctionId) && !/^[0-9]+$/.test(auctionId)) {
      return res.status(400).json({ error: '無効なオークションID形式です' });
    }
    
    console.log(`[INFO] 商品情報取得リクエスト受信: ${auctionId}`);
    
    // 商品情報の取得
    const itemInfo = await getItemInfo(auctionId);
    
    // 結果を返す
    return res.status(200).json(itemInfo);
    
  } catch (error) {
    console.error(`[ERROR] APIエラー: ${error.message}`);
    return res.status(500).json({ error: error.message || "商品情報の取得に失敗しました" });
  }
}; 