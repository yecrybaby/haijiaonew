/*
 * 海角社区 
 * 解锁付费会员视频
 * 需要Vip2-3权限的视频未解锁
 * 2025-04-04
#!name=海角
[rewrite_local]
^https?:\/\/haijiao\.com\/api\/(topic\/\d+|banner\/banner_list)$ url script-response-body https://raw.githubusercontent.com/yecrybaby/haijiaonew/refs/heads/main/haijiaonew.js

[mitm]
hostname = haijiao.com
*/

/*
 * 海角社区 Surge 融合增强稳定版
 * 原版主干 + 叠加增强功能
 */

(() => {
  var w;
  var x = $response.body;
  var B = $request.url;

  var z = typeof $httpClient !== "undefined";
  var A = typeof $task !== "undefined";

  // =========================
  // base64（原版逻辑）
  // =========================
  function D(H) {
    return decodeURIComponent(escape(atob(H)));
  }

  function E(H) {
    return btoa(unescape(encodeURIComponent(H)));
  }

  // =========================
  // unlock（原版 + 增强）
  // =========================
  function unlock(obj) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach(unlock);
      return;
    }

    // 原版字段
    if ("is_buy" in obj) obj.is_buy = true;
    if ("buy_index" in obj) obj.buy_index = 9999;
    if ("vipLimit" in obj) obj.vipLimit = 0;

    // 你的增强字段
    if ("price" in obj) obj.price = 0;

    // sale增强
    if (obj.sale) {
      obj.sale.is_buy = true;
      obj.sale.buy_index = 9999;
    }

    for (let k in obj) {
      if (typeof obj[k] === "object") unlock(obj[k]);
    }
  }

  // =========================
  // m3u8 fallback（你的增强）
  // =========================
  function fetchText(url) {
    return new Promise((resolve, reject) => {
      if (z) {
        $httpClient.get(url, (err, resp, body) => {
          if (err) reject(err);
          else resolve(body);
        });
      } else if (A) {
        $task.fetch(url).then(res => resolve(res.body)).catch(reject);
      }
    });
  }

  async function fixM3U8(url) {
    try {
      const text = await fetchText(url);
      const lines = text.split("\n");

      let base = url.substring(0, url.lastIndexOf("/") + 1);
      let ts = [];

      for (let l of lines) {
        if (l && !l.startsWith("#") && l.includes(".ts")) {
          ts.push(l.trim());
        }
      }

      if (!ts.length) return null;

      let body = "#EXTM3U\n";
      for (let t of ts) {
        body += "#EXTINF:2,\n" + new URL(t, base).href + "\n";
      }

      return "data:application/vnd.apple.mpegurl;base64," + btoa(body);
    } catch (e) {
      return null;
    }
  }

  // =========================
  // UI注入（你的增强）
  // =========================
  function injectUI(P, playUrl) {
    if (!P || !P.content) return;

    const encodedUrl = encodeURIComponent(playUrl);

    const html = `
<style>
#btns{
  position:fixed;
  bottom:80px;
  right:10px;
  z-index:9999;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.btn{
  background:#4CAF50;
  color:#fff;
  padding:10px 14px;
  border-radius:6px;
  text-decoration:none;
  font-size:14px;
}
</style>

<div id="btns">
  <a class="btn" href="${playUrl}">直接播放</a>
  <a class="btn" href="SenPlayer://x-callback-url/play?url=${encodedUrl}">SenPlayer</a>
  <a class="btn" href="stay://x-callback-url/open-download?url=${encodedUrl}">下载</a>
</div>
`;

    if (P.content.includes("<body>")) {
      P.content = P.content.replace("<body>", "<body>" + html);
    } else {
      P.content = html + P.content;
    }
  }

  // =========================
  // banner分支（原版）
  // =========================
  if (B.includes("/api/banner/banner_list")) {
    try {
      let w = JSON.parse(x);
      w.data = "WW01V2MySkJQVDA9";
      $done({ body: JSON.stringify(w) });
    } catch (e) {
      $done({ body: x });
    }
    return;
  }

  // =========================
  // 主流程（原版保留）
  // =========================
  try {
    w = JSON.parse(x);

    if (!w.data || !B.includes("/api/topic/")) {
      $done({ body: x });
      return;
    }

    // ===== 原版三层解密 =====
    let data = D(D(D(w.data)));
    let obj = JSON.parse(data);

    // ===== unlock增强 =====
    unlock(obj);

    // ===== 视频提取 =====
    let video = null;
    if (obj.attachments && Array.isArray(obj.attachments)) {
      video = obj.attachments.find(v =>
        v.category === "video" &&
        v.remoteUrl &&
        v.remoteUrl.includes(".m3u8")
      );
    }

    let url = video ? video.remoteUrl : null;

    // ===== m3u8 fallback增强 =====
    let fixed = null;

    (async () => {
      if (url) {
        try {
          fixed = await fixM3U8(url);
        } catch (e) {}

        if (fixed) {
          obj._fixed_m3u8 = fixed;
        } else {
          obj._video_raw = url;
        }
      }

      // ===== UI注入 =====
      try {
        injectUI(obj, fixed || url);
      } catch (e) {}

      // ===== 原版三重编码 =====
      let enc = E(E(E(JSON.stringify(obj))));
      w.data = enc;

      $done({ body: JSON.stringify(w) });
    })();

  } catch (e) {
    console.log("fusion error:", e);
    $done({ body: x });
  }
})();
