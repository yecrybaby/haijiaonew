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
 * 海角社区 Surge 融合稳定版 + UI嵌入（原版状态机保持）
 */

var x = $response.body;
var url = $request.url;

// =========================
// base64 三重解密（原版）
// =========================
function decode3(data) {
  try {
    return JSON.parse(atob(atob(atob(data))));
  } catch (e) {
    return null;
  }
}

function encode3(data) {
  return btoa(btoa(btoa(JSON.stringify(data))));
}

// =========================
// unlock（原版逻辑保留）
// =========================
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
    if (typeof obj[k] === "object") {
      unlock(obj[k]);
    }
  }
}

// =========================
// banner 原版
// =========================
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

// =========================
// UI 注入（完全独立，不参与编码）
// =========================
function injectUI(obj, videoUrl) {
  if (!videoUrl) return;

  const encoded = encodeURIComponent(videoUrl);

  const html = `
<style>
#hj-ui {
  position: fixed;
  bottom: 80px;
  right: 10px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hj-btn {
  background: #4CAF50;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  text-align: center;
}
</style>

<div id="hj-ui">
  <a class="hj-btn" href="${videoUrl}">▶ 直接播放</a>
  <a class="hj-btn" href="SenPlayer://x-callback-url/play?url=${encoded}">SenPlayer</a>
  <a class="hj-btn" href="stay://x-callback-url/open-download?url=${encoded}">下载</a>
</div>
`;

  // 不破坏原结构：挂载到 content 或 description
  if (obj.content && typeof obj.content === "string") {
    obj.content = html + obj.content;
  } else {
    obj._ui_html = html;
  }
}

// =========================
// 主流程（严格原版状态机）
// =========================
try {
  let w = JSON.parse(x);

  if (!w.data || !url.includes("/api/topic/")) {
    $done({ body: x });
    return;
  }

  // ===== ① 解密 =====
  let data = decode3(w.data);
  if (!data) {
    $done({ body: x });
    return;
  }

  // ===== ② unlock =====
  unlock(data);

  if (data.sale) {
    data.sale.is_buy = true;
    data.sale.buy_index = 9999;
  }

  // ===== ③ 视频提取 =====
  let video = null;
  if (data.attachments && Array.isArray(data.attachments)) {
    video = data.attachments.find(v =>
      v.category === "video" &&
      v.remoteUrl &&
      v.remoteUrl.includes(".m3u8")
    );
  }

  let videoUrl = video ? video.remoteUrl : null;

  // ===== ④ UI 注入（关键：只改展示层，不动 data 编码）=====
  injectUI(data, videoUrl);

  // ===== ⑤ 编码（原版状态机终点）=====
  let enc = encode3(data);
  w.data = enc;

  $done({ body: JSON.stringify(w) });

} catch (e) {
  console.log("fusion error:", e);
  $done({ body: x });
}
