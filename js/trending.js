/**
 * 🔥 Trending System Stable Static Edition
 * GitHub Pages / New Tab / Static Blog
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
 */
(function() {
    "use strict";
    // =====================================================
    // 配置
    // =====================================================
    const CONFIG = {
        defaultPlatform: "bilibili",
        refreshInterval: 30 * 60 * 1000,
        cacheDuration: 60 * 60 * 1000,
        maxItems: 5
    };
    // =====================================================
    // 平台映射
    // =====================================================
    const PLATFORM_MAP = {
        bilibili: { name: "B站", file: "./data/bilibili.json" },
        github: { name: "GitHub", file: "./data/github.json" },
        hackernews: { name: "HackerNews", file: "./data/hackernews.json" },
        v2ex: { name: "V2EX", file: "./data/v2ex.json" }
    };
    // =====================================================
    // fallback
    // =====================================================
    const FALLBACK_DATA = {
        bilibili: [{ title: "B站热门加载中...", url: "https://www.bilibili.com" }],
        github: [{ title: "GitHub Trending 加载中...", url: "https://github.com/trending" }],
        hackernews: [{ title: "HackerNews 加载中...", url: "https://news.ycombinator.com" }],
        v2ex: [{ title: "V2EX 热门加载中...", url: "https://www.v2ex.com" }]
    };
    // =====================================================
    // HTML 转义
    // =====================================================
    function escapeHTML(str = "") {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    // =====================================================
    // URL 安全
    // =====================================================
    function safeUrl(url) {
        try {
            const u = new URL(url);
            if (u.protocol === "http:" || u.protocol === "https:") return u.href;
            return "#";
        } catch { return "#"; }
    }
    // =====================================================
    // 本地缓存
    // =====================================================
    const cache = {
        get(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (!data.time || !data.value) return null;
                if (Date.now() - data.time > CONFIG.cacheDuration) return null;
                return data.value;
            } catch { return null; }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify({ time: Date.now(), value }));
            } catch { }
        }
    };
    // =====================================================
    // 渲染
    // =====================================================
    function renderHotList(container, items) {
        if (!container) return;
        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = `<div class="trending-row">暂无热榜数据</div>`;
            return;
        }
        const html = items.slice(0, CONFIG.maxItems).map((item, idx) => {
            return `<a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer" class="trending-row">
                        <span class="rank-num">${idx + 1}</span>
                        <span class="trend-text">${escapeHTML(item.title)}</span>
                    </a>`;
        }).join("");
        container.innerHTML = html;
    }
    // =====================================================
    // 请求控制
    // =====================================================
    let currentRequestId = 0;
    // =====================================================
    // 读取 JSON
    // =====================================================
    async function fetchLocalHotList(platform) {
        const config = PLATFORM_MAP[platform];
        if (!config) throw new Error("未知平台");
        const response = await fetch(config.file, { cache: "no-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!Array.isArray(json)) throw new Error("JSON 格式错误");
        return json;
    }
    // =====================================================
    // 加载热榜
    // =====================================================
    async function loadHotList(platform, container, requestId) {
        const cacheKey = `hot_${platform}`;
        const cached = cache.get(cacheKey);
        if (cached) renderHotList(container, cached);
        else renderHotList(container, FALLBACK_DATA[platform]);
        try {
            const fresh = await fetchLocalHotList(platform);
            if (requestId !== currentRequestId) return;
            cache.set(cacheKey, fresh);
            renderHotList(container, fresh);
        } catch (err) {
            console.warn("[热榜] 加载失败:", err.message);
            if (!cached) renderHotList(container, FALLBACK_DATA[platform]);
        }
    }
    // =====================================================
    // 切换平台
    // =====================================================
    window.switchPlatform = function(platform) {
        if (!PLATFORM_MAP[platform]) platform = CONFIG.defaultPlatform;
        currentRequestId++;
        const requestId = currentRequestId;
        localStorage.setItem("hot_platform", platform);
        const container = document.getElementById("trending-content");
        if (!container) {
            console.error("未找到 #trending-content");
            return;
        }
        document.querySelectorAll(".tab-item[data-platform]").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.platform === platform);
        });
        loadHotList(platform, container, requestId);
    };
    // =====================================================
    // 自动刷新
    // =====================================================
    function startAutoRefresh() {
        setInterval(() => {
            const platform = localStorage.getItem("hot_platform") || CONFIG.defaultPlatform;
            console.log(`[热榜] 自动刷新: ${platform}`);
            currentRequestId++;
            loadHotList(platform, document.getElementById("trending-content"), currentRequestId);
        }, CONFIG.refreshInterval);
    }
    // =====================================================
    // 初始化
    // =====================================================
    function init() {
        const tabs = document.querySelectorAll(".tab-item[data-platform]");
        tabs.forEach(btn => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                window.switchPlatform(btn.dataset.platform);
            });
        });
        const platform = localStorage.getItem("hot_platform") || CONFIG.defaultPlatform;
        window.switchPlatform(platform);
        startAutoRefresh();
        console.log("[热榜系统] Static Edition 初始化完成");
    }
    // =====================================================
    // DOM Ready
    // =====================================================
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
