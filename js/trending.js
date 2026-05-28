/**
 * 🔥 Trending System Stable Static Edition
 * Github Pages / New Tab / Static Blog
 *
 * 特点：
 * - 无代理
 * - 无跨域
 * - 无实时 API
 * - 无风控
 * - 本地 JSON
 * - 自动缓存
 * - 自动刷新
 * - 极简稳定
 *  无痕模式安全
 *  fetch 超时保护
 *  防竞态覆盖
 *  防 XSS
 *  后台暂停刷新
 *  JSON 格式兼容
 *  DOM 安全渲染
 *  防止重复初始化
 */

(function () {
    "use strict";

    // =====================================================
    // 配置
    // =====================================================
    const CONFIG = {
        defaultPlatform: "bilibili",
        refreshInterval: 30 * 60 * 1000, // 30 分钟轮询
        cacheDuration: 60 * 60 * 1000,   // 1 小时缓存有效期
        fetchTimeout: 5000,              // 5 秒超时限制
        maxItems: 5                      // 最多显示 5 条
    };

    // =====================================================
    // 平台配置
    // =====================================================
    const PLATFORM_MAP = {
        cls: { name: "财联社", file: "./data/cls.json" },
        ithome: { name: "IT之家", file: "./data/ithome.json" },
        bilibili: { name: "B站", file: "./data/bilibili.json" },
        github: { name: "GitHub", file: "./data/github.json" },
        hackernews: { name: "HackerNews", file: "./data/hackernews.json" },
        v2ex: { name: "V2EX", file: "./data/v2ex.json" }
    };

    // =====================================================
    // fallback 数据
    // =====================================================
    const FALLBACK_DATA = {
        cls: [{ title: "财联社资讯加载中...", url: "https://cls.cn" }],
        ithome: [{ title: "IT之家资讯加载中...", url: "https://ithome.com" }],
        bilibili: [{ title: "B站热门加载中...", url: "https://bilibili.com" }],
        github: [{ title: "GitHub Trending 加载中...", url: "https://github.com" }],
        hackernews: [{ title: "HackerNews 加载中...", url: "https://ycombinator.com" }],
        v2ex: [{ title: "V2EX 热门加载中...", url: "https://v2ex.com" }]
    };

    // =====================================================
    // HTML 转义
    // =====================================================
    function escapeHTML(str = "") {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // =====================================================
    // URL 安全校验
    // =====================================================
    function safeUrl(url) {
        try {
            const u = new URL(url);
            if (u.protocol === "http:" || u.protocol === "https:") {
                return u.href;
            }
            return "#";
        } catch {
            return "#";
        }
    }

    // =====================================================
    // 本地缓存（🛡️ 已加固：无痕模式安全降级防护）
    // =====================================================
    const cache = {
        get(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (!data || !data.time || !data.value) { return null; }
                if (Date.now() - data.time > CONFIG.cacheDuration) { return null; }
                return data.value;
            } catch { return null; }
        },
        set(key, value) {
            try {
                localStorage.setItem(
                    key,
                    JSON.stringify({
                        time: Date.now(),
                        value
                    })
                );
            } catch {}
        },
        getPlatform() {
            try {
                return localStorage.getItem("hot_platform") || CONFIG.defaultPlatform;
            } catch {
                return window.__hot_platform_fallback || CONFIG.defaultPlatform;
            }
        },
        setPlatform(platform) {
            try {
                localStorage.setItem("hot_platform", platform);
            } catch {
                window.__hot_platform_fallback = platform;
            }
        }
    };

    // =====================================================
    // DOM 安全创建
    // =====================================================
    function createTrendRow(item, rank) {
        const a = document.createElement("a");
        a.className = "trending-row";
        a.href = safeUrl(item.url);
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const rankEl = document.createElement("span");
        rankEl.className = "rank-num";
        rankEl.textContent = rank;

        const textEl = document.createElement("span");
        textEl.className = "trend-text";
        textEl.textContent = item.title; // 原生安全防注入

        a.appendChild(rankEl);
        a.appendChild(textEl);
        return a;
    }

    // =====================================================
    // 渲染热榜（💡核心增强：完美剔除空数据并维持序号绝对连续）
    // =====================================================
    function renderHotList(container, items) {
        if (!container) return;
        container.innerHTML = "";

        if (!Array.isArray(items) || items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "trending-row";
            empty.textContent = "暂无热榜数据";
            container.appendChild(empty);
            return;
        }

        let count = 0;
        for (const item of items) {
            // 核心修改：检查标题数据是否存在且不是空白字符串
            if (!item || typeof item.title !== "string" || item.title.trim() === "") {
                continue;
            }
            count++;
            container.appendChild(createTrendRow(item, count));
            if (count >= CONFIG.maxItems) {
                break;
            }
        }

        if (count === 0) {
            const empty = document.createElement("div");
            empty.className = "trending-row";
            empty.textContent = "暂无热榜数据";
            container.appendChild(empty);
        }
    }

    // =====================================================
    // 请求控制
    // =====================================================
    let currentRequestId = 0;

    // =====================================================
    // fetch JSON
    // =====================================================
    async function fetchLocalHotList(platform) {
        const config = PLATFORM_MAP[platform];
        if (!config) {
            throw new Error("未知平台");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, CONFIG.fetchTimeout);

        try {
            const response = await fetch(config.file, {
                cache: "no-cache",
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const json = await response.json();
            const list = Array.isArray(json)
                ? json
                : Array.isArray(json.data)
                    ? json.data
                    : [];
            if (!list.length) {
                throw new Error("JSON 格式错误或数据为空");
            }
            return list;
        } finally {
            clearTimeout(timeout);
        }
    }

    // =====================================================
    // 加载热榜
    // =====================================================
    async function loadHotList(platform, container, requestId) {
        const cacheKey = `hot_${platform}`;
        const cached = cache.get(cacheKey);
        const fallback = FALLBACK_DATA[platform] || FALLBACK_DATA[CONFIG.defaultPlatform];

        // 优先显示缓存
        if (cached) {
            renderHotList(container, cached);
        } else {
            renderHotList(container, fallback);
        }

        try {
            const fresh = await fetchLocalHotList(platform);
            // 防止并发现象导致的旧数据覆盖新请求
            if (requestId !== currentRequestId) {
                return;
            }
            cache.set(cacheKey, fresh);
            renderHotList(container, fresh);
        } catch (err) {
            console.warn(`[热榜] ${platform} 加载失败:`, err.message);
            // 没有任何本地可用缓存时才显示 fallback
            if (!cached) {
                renderHotList(container, fallback);
            }
        }
    }

    // =====================================================
    // 切换平台
    // =====================================================
    window.switchPlatform = function (platform) {
        if (!PLATFORM_MAP[platform]) {
            platform = CONFIG.defaultPlatform;
        }
        currentRequestId++;
        const requestId = currentRequestId;
        cache.setPlatform(platform);

        const container = document.getElementById("trending-content");
        if (!container) {
            console.error("未找到 #trending-content容器");
            return;
        }

        document.querySelectorAll(".tab-item[data-platform]").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.platform === platform);
        });

        loadHotList(platform, container, requestId);
        
        // 💡 优化项：用户手动切换平台时，重新校准自动刷新计时器
        startAutoRefresh();
    };

    // =====================================================
    // 自动刷新
    // =====================================================
    let refreshTimer = null;
    function startAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
        refreshTimer = setInterval(() => {
            // 页面处于后台静默状态时，挂起刷新以节省系统硬件资源
            if (document.hidden) {
                return;
            }
            let platform = cache.getPlatform();
            if (!PLATFORM_MAP[platform]) {
                platform = CONFIG.defaultPlatform;
            }
            console.log(`[热榜] 自动刷新: ${platform}`);
            currentRequestId++;
            loadHotList(platform, document.getElementById("trending-content"), currentRequestId);
        }, CONFIG.refreshInterval);
    }

    // =====================================================
// 初始化
// =====================================================
let initialized = false;
function init() {
  if (initialized) {return;}
  initialized = true;
  const tabs = document.querySelectorAll(".tab-item[data-platform]");
  tabs.forEach(btn => {
    if (btn.dataset.bound) {
      return;
      }btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        window.switchPlatform(btn.dataset.platform);
        });
        }); 
      let platform = cache.getPlatform();
      if (!PLATFORM_MAP[platform]) {
        platform = CONFIG.defaultPlatform;
        }
        window.switchPlatform(platform);
        startAutoRefresh();
        // 💡 优化项：当用户将页面从浏览器后台切回前台时，立刻主动静默刷新获取最新热榜
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) {
            let currentPlatform = cache.getPlatform();
            if (PLATFORM_MAP[currentPlatform]) {
              currentRequestId++;
              loadHotList(currentPlatform, document.getElementById("trending-content"),
               currentRequestId);
               }
             }
           });
         console.log("[热榜系统] Ultimate Stable Edition 初始化完成");
  }

// =====================================================
// DOM Ready 钩子挂载
// =====================================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
