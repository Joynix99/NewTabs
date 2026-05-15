/**
 * 独立组件・网址网格与分类书签深度合并脚本 (完美修复版)
 */
(function () {
  
  // ==========================================
  // 【数据中心】
  // ==========================================
  const siteGridConfig = [
    {n: "B站", u: "https://bilibili.com", icon: "icons/bilibili2.svg"},
    {n: "无忧论坛", u: "https://bbs.wuyou.net", icon: "icons/wuyou.svg"},
    {n: "远景论坛", u: "https://bbs.pcbeta.com", icon: "icons/pcbeta.svg"},
    {n: "明经通道", u: "https://bbs.mjtd.com", icon: "icons/mjtd.png"}, 
    {n: "CSDN", u: "https://csdn.net", icon: "icons/csdn.svg"}, 
    {n: "恩山无线论坛", u: "https://right.com.cn", icon: "icons/right.ico"}
  ];

  const bookmarkData = {
    design: [
      {n: "酷家乐",u: "https://kujiale.com",icon: "icons/kujiale.svg"},
      {n: "三维家",u: "https://3vjia.com",icon: "icons/3vjia.svg"},
      {n: "晨丰拆单",u: "https://ruixinjie.com",icon: "icons/cfcad.jpg"},
      {n: "花瓣网",u: "https://huaban.com",icon: "icons/huaban.svg"},
      {n: "剪影",u: "https://capcut.com",icon: "icons/capcut.svg"}
    ],
    ai: [
      {n: "deepseek",u: "https://deepseek.com",icon: "icons/deepseek.svg"},
      {n: "ChatGPT",u: "https://chatgpt.com",icon: "icons/chatgpt.svg"},
      {n: "Kimi",u: "https://kimi.com",icon: "icons/Kimi.svg"},
      {n: "豆包",u: "https://dola.com",icon: "icons/doubao.svg"},
      {n: "文心一言",u: "https://yiyan.baidu.com",icon: "icons/yiyan.svg"},
      {n: "龙虾AI",u: "https://openclaw.ai",icon: "icons/openclaw.svg"},
      {n: "阿里云",u: "https://aliyun.com",icon: "icons/alibabacloud.svg"},
      {n: "DeepL",u: "https://deepl.com",icon: "icons/deepl.svg"},
      {n: "Midjourney",u: "https://midjourney.com",icon: "icons/midjourney.svg"},
      {n: "Civitai",u: "https://civitai.com",icon: "icons/civitai.svg"},
      {n: "Claude",u: "https://claude.ai",icon: "icons/claude.svg"},
      {n: "谷歌翻译",u: "https://translate.google.com",icon: "icons/googletranslate.svg"},
      {n: "百度翻译",u: "https://translate.baidu.com",icon: "icons/baidufanyi.svg"},
      {n: "Bing翻译",u: "https://www.bing.com/translator",icon: "icons/bing.svg"},
      {n: "有道翻译",u: "https://fanyi.youdao.com",icon: "icons/youdao.svg"}
    ],
    study: [
      {n: "B站",u: "https://bilibili.com",icon: "icons/bilibili2.svg"},
      {n: "GitHub",u: "https://github.com",icon: "icons/github.svg"},
      {n: "Gitee",u: "https://gitee.com",icon: "icons/gitee.svg"},
      {n: "GitLab",u: "https://gitlab.com",icon: "icons/gitlab.svg"},
      {n: "vercel",u: "https://vercel.com",icon: "icons/vercel.svg"},
      {n: "我要自学网",u: "https://www.51zxw.net",icon: "icons/51zxw.jpg"},
      {n: "国家图书馆",u: "http://www.nlc.cn",icon: "icons/nlc.svg"},
      {n: "智慧教育平台",u: "https://www.smartedu.cn",icon: "icons/smartedu.svg"},
      {n: "超星",u: "https://www.chaoxing.com",icon: "icons/chaoxing.svg"},
      {n: "WikiHow",u: "https://www.wikihow.com",icon: "icons/wikihow.svg"},
      {n: "云课堂",u: "https://study.163.com",icon: "icons/study163.svg"},
      {n: "菁优网",u: "http://www.jyeoo.com",icon: "icons/jyeoo.svg"}, 
      {n: "看雪",u: "https://ctf.kanxue.com/",icon: "icons/kanxuelogo.png"},
      {n: "chiphell",u: "https://www.chiphell.com",icon: "icons/chiphell.png"},
      {n: "Stack Overflow",u: "https://stackoverflow.com",icon: "icons/stackoverflow.svg"},
      {n: "博客园",u: "https://www.cnblogs.com",icon: "icons/cnblogs.svg"},
      {n: "天池",u: "https://tianchi.aliyun.com",icon: "icons/tianchi.svg"},
      {n: "慕课网",u: "https://www.imooc.com",icon: "icons/imooc.svg"}
    ],
    daily: [
      {n: "淘宝",u: "https://taobao.com",icon: "icons/taobao.svg"},
      {n: "京东",u: "https://jd.com",icon: "icons/jd.svg"},
      {n: "Amazon",u: "https://www.amazon.com",icon: "icons/amazon.svg"},
      {n: "知乎",u: "https://zhihu.com",icon: "icons/zhihu.svg"},
      {n: "小红书",u: "https://xiaohongshu.com",icon: "icons/xiaohongshu.svg"},
      {n: "抖音",u: "https://douyin.com",icon: "icons/douyin.svg"},
      {n: "快手",u: "https://www.kuaishou.com",icon: "icons/kuaishou.svg"},
      {n: "YouTube",u: "https://youtube.com",icon: "icons/youtube.svg"},
      {n: "TikTok",u: "https://tiktok.com",icon: "icons/tiktok.svg"},
      {n: "腾讯视频",u: "https://film.qq.com",icon: "icons/film.svg"},
      {n: "爱奇艺",u: "https://iqiyi.com",icon: "icons/iqiyi.svg"},
      {n: "Netflix",u: "https://netflix.com",icon: "icons/netflix.svg"},
      {n: "Spotify",u: "https://spotify.com",icon: "icons/spotify.svg"},
      {n: "italkbbtv",u: "https://www.italkbbtv.com",icon: "icons/italkbbtv.svg"},
      /* {n: "tubi",u: "https://gdpr.tubi.tv",icon: "icons/tubi.svg"}, 美国免费电视网站限制区域*/
      {n: "起点",u: "https://qidian.com",icon: "icons/qidian.svg"},
      {n: "番茄",u: "https://fanqienovel.com",icon: "icons/fanqienovel.svg"},
      {n: "飞卢",u: "https://faloo.com",icon: "icons/faloo.svg"},
      {n: "七猫",u: "https://qimao.com",icon: "icons/qimao.svg"}
    ],
    disk: [
      {n: "百度网盘",u: "https://pan.baidu.com",icon: "icons/baidupan.svg"},
      {n: "123云盘",u: "https://123pan.com",icon: "icons/123pan.svg"},
      {n: "阿里网盘",u: "https://www.alipan.com",icon: "icons/alipan.svg"},
      {n: "天翼云",u: "https://cloud.189.cn",icon: "icons/189.svg"},
      {n: "GoogleDrive",u: "https://Drive.google.com",icon: "icons/GoogleDrive.svg"},
      {n: "金山文档",u: "https://www.kdocs.cn",icon: "icons/kdocs.svg"},
      {n: "记事本",u: "http://jot.ysepan.com",icon: "icons/jot.svg"},
      {n: "OneDrive",u: "https://onedrive.live.com/login",icon: "icons/onedrive.svg"},
      {n: "Dropbox",u: "https://dropbox.com",icon: "icons/dropbox.svg"},
      {n: "坚果云",u: "https://jianguoyun.com",icon: "icons/jianguoyun.svg"},
      {n: "MEGA",u: "https://mega.nz",icon: "icons/mega.svg"},
      {n: "pCloud",u: "https://pcloud.com",icon: "icons/pcloud.svg"},
      {n: "腾讯微云",u: "https://weiyun.com",icon: "icons/weiyun.svg"},
      {n: "126邮箱",u: "https://mail.126.com",icon: "icons/126.svg"},
      {n: "163邮箱",u: "https://mail.163.com",icon: "icons/mail-163.svg"},
      {n: "QQ邮箱",u: "https://mail.qq.com",icon: "icons/qq-mail.svg"},
      {n: "Gmail",u: "https://gmail.google.com",icon: "icons/gmail.svg"},
      {n: "Outlook",u: "https://mail.live.com",icon: "icons/Outlook.svg"},
      {n: "139邮箱",u: "https://mail.10086.cn",icon: "icons/139.svg"}
    ]
  };

  // ==========================================
  // 【核心防御】全局图片加载失败兜底函数（挂载至 window）
  // ==========================================
  window.handleIconError = function (imgObj, fallbackText) {
    const wrapper = imgObj.parentNode;
    if (!wrapper) return;
    // 彻底清空内部结构，只塞入单首字母，确保绝对居中，永不重影
    wrapper.innerHTML = `<div class="kimi-text-icon">${fallbackText}</div>`;
  };

  // ==========================================
  // 【渲染引擎 1】编译中部快捷网址图标
  // ==========================================
  function renderSiteGrid() {
    const container = document.getElementById("site-grid-container");
    if (!container) return; 

    const generatedHtml = siteGridConfig
      .map((site) => {
        const firstChar = site.n ? site.n.charAt(0).toUpperCase() : "?";
        const isPath = site.icon && (site.icon.includes('/') || site.icon.includes('.'));

        return `
          <a href="${site.u || '#'}" target="_blank" class="site-item-box">
            <div class="kimi-icon-wrapper" data-url="${site.u || ''}">
              ${isPath 
                ? `<img src="${site.icon}" alt="${site.n}" onerror="window.handleIconError(this, '${firstChar}')">`
                : `<div class="kimi-text-icon">${site.icon || firstChar}</div>`
              }
            </div>
            <span class="site-name-text">${site.n || "未命名"}</span>
          </a>
        `;
      })
      .join("");

    container.innerHTML = generatedHtml;
  }

  // ==========================================
  // 【渲染引擎 2】编译下方书签页面
  // ==========================================
  function renderBookmarkPanels() {
    Object.keys(bookmarkData).forEach((panelId) => {
      const container = document.getElementById(panelId);
      if (!container) return; 

      const items = bookmarkData[panelId];
      if (!Array.isArray(items)) return;

      container.innerHTML = '';

      const gridNode = document.createElement('div');
      gridNode.className = 'icon-grid';

      items.forEach((item) => {
        const linkNode = document.createElement('a');
        linkNode.className = 'icon-item';
        linkNode.href = item.u || '#';
        linkNode.target = "_blank";
        if (item.desc) linkNode.title = item.desc;

        const firstChar = item.n ? item.n.charAt(0).toUpperCase() : "?";
        const isPath = item.icon && (item.icon.includes('/') || item.icon.includes('.'));

        linkNode.innerHTML = `
          <div class="kimi-icon-wrapper" data-url="${item.u || ''}">
            ${isPath 
              ? `<img src="${item.icon}" alt="${item.n || 'icon'}" onerror="window.handleIconError(this, '${firstChar}')">`
              : `<div class="kimi-text-icon">${item.icon || firstChar}</div>`
            }
          </div>
          <div class="icon-name">${item.n || "未命名"}</div>
        `;
        gridNode.appendChild(linkNode);
      });

      container.appendChild(gridNode);
    });
  }

  // ==========================================
  // 【调度中心】
  // ==========================================
  function startNavigationEngine() {
    renderSiteGrid();
    renderBookmarkPanels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startNavigationEngine);
  } else {
    startNavigationEngine();
  }
})();
