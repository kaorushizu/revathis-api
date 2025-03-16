const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const keyword = req.query.keyword;
    if (!keyword) {
      return res.status(400).json({ error: "キーワードを指定してください" });
    }

    const url = `https://aucfree.com/search?from=2015-06&o=t2&q=${encodeURIComponent(keyword)}&to=2030-01`;
    const response = await axios.get(url);
    
    res.send(response.data);
  } catch (error) {
    console.error("HTML取得エラー:", error);
    res.status(500).json({ error: error.toString() });
  }
};