/*
 * Surge 融合解锁版（稳定结构）
 */

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

var x = $response.body;
var url = $request.url;

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

  if (!w.data) {
    $done({ body: x });
    return;
  }

  if (!url.includes("/api/topic/")) {
    $done({ body: x });
    return;
  }

  // 1. 解密三层 base64
  let data = decode3(w.data);
  if (!data) {
    $done({ body: x });
    return;
  }

  // 2. 解锁 VIP 字段（递归）
  unlock(data);

  // 3. sale 结构补强
  if (data.sale) {
    data.sale.is_buy = true;
    data.sale.buy_index = 9999;
  }
let video = null;

  if (data.attachments && Array.isArray(data.attachments)) {
    video = data.attachments.find(v =>
      v.category === "video" &&
      v.remoteUrl &&
      v.remoteUrl.includes(".m3u8")
    );
  }

  if (video && video.remoteUrl) {
    data._unlocked_video = video.remoteUrl;
  }
async function fetchText(u) {
    if (typeof $task !== "undefined") {
      let res = await $task.fetch(u);
      return res.body;
    } else if (typeof $httpClient !== "undefined") {
      return new Promise((resolve, reject) => {
        $httpClient.get(u, (err, resp, body) => {
          if (err) reject(err);
          else resolve(body);
        });
      });
    }
  }

  async function fixM3U8(url) {
    try {
      const text = await fetchText(url);
      const lines = text.split("\n");

      let base = url.substring(0, url.lastIndexOf("/") + 1);
      let tsList = [];

      for (let l of lines) {
        if (l && !l.startsWith("#") && l.includes(".ts")) {
          tsList.push(l.trim());
        }
      }

      if (!tsList.length) return url;

      let body = "#EXTM3U\n";

      for (let ts of tsList) {
        body += "#EXTINF:2,\n" + new URL(ts, base).href + "\n";
      }

      return "data:application/vnd.apple.mpegurl;base64," +
        btoa(body);

    } catch (e) {
      return url;
    }
  }

  if (video && video.remoteUrl) {
    data._fixed_m3u8 = await fixM3U8(video.remoteUrl);
  }
let enc = encode3(data);

  w.data = enc;

  $done({ body: JSON.stringify(w) });
  return;

} catch (e) {
  console.log("fusion error:", e);
  $done({ body: x });
}
