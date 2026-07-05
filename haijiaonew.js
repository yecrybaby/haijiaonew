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
 * 海角社区 Surge 融合稳定版
 * 原版逻辑 + 原版UI完整保留
 */

(() => {
  var x = $response.body;
  var url = $request.url;

  // ======================
  // base64（三重原版）
  // ======================
  function D(H) {
    return decodeURIComponent(escape(atob(H)));
  }

  function E(H) {
    return btoa(unescape(encodeURIComponent(H)));
  }

  // ======================
  // unlock（原版不动）
  // ======================
  function unlock(obj) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach(unlock);
      return;
    }

    if ("is_buy" in obj) obj.is_buy = true;
    if ("buy_index" in obj) obj.buy_index = 9999;
    if ("vipLimit" in obj) obj.vipLimit = 0;
    if ("price" in obj) obj.price = 0;

    for (let k in obj) {
      if (typeof obj[k] === "object") unlock(obj[k]);
    }
  }

  // ======================
  // banner（原版）
  // ======================
  if (url.includes("/api/banner/banner_list")) {
    try {
      let w = JSON.parse(x);
      w.data = "WW01V2MySkJQVDA9";
      $done({ body: JSON.stringify(w) });
    } catch (e) {
      $done({ body: x });
    }
    return;
  }

  try {
    let w = JSON.parse(x);

    if (!w.data || !url.includes("/api/topic/")) {
      $done({ body: x });
      return;
    }

    // ======================
    // 1. 原版解密链（绝对不改）
    // ======================
    let data = D(D(D(w.data)));
    let obj = JSON.parse(data);

    // ======================
    // 2. unlock（原版）
    // ======================
    unlock(obj);

    if (obj.sale) {
      obj.sale.is_buy = true;
      obj.sale.buy_index = 9999;
    }

    // ======================
    // 3. 视频提取（原版）
    // ======================
    let video = null;

    if (obj.attachments && Array.isArray(obj.attachments)) {
      video = obj.attachments.find(v =>
        v.category === "video" &&
        v.remoteUrl &&
        v.remoteUrl.includes(".m3u8")
      );
    }

    let playUrl = video ? video.remoteUrl : null;

    // ======================
    // 4. 🔥 原版UI（完整保留 + 修复安全替换）
    // ======================
    if (playUrl && obj.content) {
      const encodedUrl = encodeURIComponent(playUrl);

      const buttonHTML = `
<style>
#player-button-group {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0) + 60px);
  right: 10px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  max-height: 80vh;
  overflow-y: auto;
}

.player-btn {
  padding: 10px 14px;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  text-decoration: none;
  display: inline-block;
  min-width: 130px;
}
</style>

<div id="player-button-group">
  <a class="player-btn" style="background:#4CAF50;" href="${playUrl}" target="_blank">立即观看视频</a>
  <a class="player-btn" style="background:#2196F3;" href="SenPlayer://x-callback-url/play?url=${encodedUrl}">跳转SenPlayer</a>
  <a class="player-btn" style="background:#FF9800;" href="stay://x-callback-url/open-download?url=${encodedUrl}">跳转Stay下载</a>
</div>
`;

      // ===== 原版UI注入方式（完全保留逻辑）=====
      if (obj.content.includes("<body>")) {
        obj.content = obj.content.replace("<body>", "<body>" + buttonHTML);
      } else {
        obj.content = buttonHTML + obj.content;
      }

      // ===== 原版按钮替换逻辑（保留）=====
      obj.content = obj.content.replace(
        /<span class="sell-btn"[^>]*>[\s\S]*?<\/span><\/span>/g,
        `<a href="SenPlayer://x-callback-url/play?url=${encodedUrl}"
        style="display:inline-block;background:#0066cc;color:white;padding:6px 24px;border-radius:3px;text-decoration:none;">
        点击观看完整视频</a>`
      );
    }

    // ======================
    // 5. 原版三重编码（不动）
    // ======================
    w.data = E(E(E(JSON.stringify(obj))));

    $done({ body: JSON.stringify(w) });

  } catch (e) {
    console.log("fusion error:", e);
    $done({ body: x });
  }
})();
