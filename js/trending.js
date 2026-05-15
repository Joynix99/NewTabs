/**
 * 🌍 GitHub Pages 稳定版热搜系统
 * v4.1 Production (增强健壮性)
 */

(function () {

    // =========================================
    // 配置中心
    // =========================================
    const CONFIG = {
        timeout: 8000,
        cacheDuration: 10 * 60 * 1000,
        maxItems: 5,
        defaultPlatform: "baidu",
        refreshInterval: 15 * 60 * 1000
    };

    // =========================================
    // 离线兜底数据
    // =========================================
    const hotDataLocal = {
        baidu: [
            { title: "百度热榜加载中...", url: "https://www.baidu.com" },
            { title: "当前网络可能较慢", url: "https://www.baidu.com" },
            { title: "系统正在尝试连接实时数据", url: "https://www.baidu.com" },
            { title: "GitHub Pages 稳定模式运行中", url: "https://www.baidu.com" },
            { title: "离线模式已启用", url: "https://www.baidu.com" }
        ],
        weibo: [
            { title: "微博热搜连接中...", url: "https://weibo.com" },
            { title: "正在获取最新热点", url: "https://weibo.com" },
            { title: "请稍候", url: "https://weibo.com" },
            { title: "网络正常后将自动刷新", url: "https://weibo.com" },
            { title: "系统运行正常", url: "https://weibo.com" }
        ],
        zhihu: [
            { title: "知乎热榜连接中...", url: "https://www.zhihu.com" },
            { title: "正在同步互联网热点", url: "https://www.zhihu.com" },
            { title: "GitHub 托管模式", url: "https://www.zhihu.com" },
            { title: "当前为本地保护数据", url: "https://www.zhihu.com" },
            { title: "等待远程接口响应", url: "https://www.zhihu.com" }
        ],
        douyin: [
            { title: "抖音热榜连接中...", url: "https://www.douyin.com" },
            { title: "正在获取实时热视频", url: "https://www.douyin.com" },
            { title: "请保持网络畅通", url: "https://www.douyin.com" },
            { title: "静态部署模式已启动", url: "https://www.douyin.com" },
            { title: "等待云端数据", url: "https://www.douyin.com" }
        ]
    };

    const platformChineseNames = {
        baidu: "百度",
        weibo: "微博",
        zhihu: "知乎",
        douyin: "抖音"
    };

    let currentRequestId = 0;

    // =========================================
    // 工具函数
    // =========================================
    async function fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            return await fetch(url, { signal: controller.signal, cache: "no-store" });
        } finally {
            clearTimeout(timer);
        }
    }

    function getCache(platform) {
        try {
            const raw = localStorage.getItem(`hot_cache_${platform}`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.time > CONFIG.cacheDuration) return null;
            return parsed.data;
        } catch {
            return null;
        }
    }

    function setCache(platform, data) {
        try {
            localStorage.setItem(`hot_cache_${platform}`, JSON.stringify({ time: Date.now(), data }));
        } catch { /* 无痕模式忽略 */ }
    }

    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function safeUrl(url) {
        if (!url) return "javascript:void(0)";
        // 只允许 http/https 协议，防止 javascript: 注入
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return "javascript:void(0)";
    }

    function showLoading(container, show = true) {
        if (!container) return;
        const loadingDiv = container.querySelector(".loading-placeholder");
        if (show) {
            if (!loadingDiv) {
                const div = document.createElement("div");
                div.className = "loading-placeholder";
                div.textContent = "⏳ 加载中...";
                div.style.textAlign = "center";
                div.style.padding = "20px";
                div.style.color = "#888";
                container.innerHTML = "";
                container.appendChild(div);
            }
        } else {
            if (loadingDiv) loadingDiv.remove();
        }
    }

    function renderTrendingHTML(container, items) {
        if (!container) return;
        container.innerHTML = items.map((item, index) => {
            const safeTitle = escapeHTML(item.title || "未知标题");
            const finalUrl = safeUrl(item.url);
            return `
                <a href="${finalUrl}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="trending-row">
                    <span class="rank-num">${index + 1}</span>
                    <span class="trend-text">${safeTitle}</span>
                </a>
            `;
        }).join("");
    }

    function updateTabUI(platform) {
        const tabs = document.querySelectorAll(".tab-item");
        tabs.forEach(tab => {
            tab.classList.remove("active");
            if (tab.innerText.trim() === platformChineseNames[platform]) {
                tab.classList.add("active");
            }
        });
    }

    // =========================================
    // 核心：获取并渲染热榜
    // =========================================
    async function fetchHotData(platform, requestId) {
        const container = document.getElementById("trending-content");
        if (!container) return;

        // 先检查缓存，如果有则立即渲染（避免闪现本地数据）
        const cached = getCache(platform);
        if (cached) {
            console.log("[热榜] 使用缓存:", platform);
            renderTrendingHTML(container, cached);
        } else {
            // 无缓存时显示本地数据（快速占位）
            renderTrendingHTML(container, hotDataLocal[platform]);
        }

        // 显示加载提示（仅在无缓存且请求较慢时有用）
        if (!cached) showLoading(container, true);
        else showLoading(container, false);

        try {
            const api = `https://api-hot.imsyy.top/${platform}`;
            console.log("[热榜] 请求:", api);

            const response = await fetchWithTimeout(api, CONFIG.timeout);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const json = await response.json();

            // 竞态丢弃
            if (requestId !== currentRequestId) {
                console.log("[热榜] 丢弃旧请求");
                return;
            }

            // 健壮的解析：优先检查 code === 200
            let items = [];
            if (json.code === 200 && Array.isArray(json.data)) {
                items = json.data;
            } else if (Array.isArray(json)) {
                items = json;
            } else if (json.data && Array.isArray(json.data)) {
                items = json.data;
            }

            if (!items.length) throw new Error("空数据或接口异常");

            const normalized = items.slice(0, CONFIG.maxItems).map(item => ({
                title: item.title || item.name || "未知标题",
                url: item.url || item.link || ""
            }));

            // 更新界面
            renderTrendingHTML(container, normalized);
            setCache(platform, normalized);
            console.log("[热榜] 更新成功:", platform);
        } catch (err) {
            console.warn("[热榜] 获取失败:", err.message);
            // 如果已经有缓存，无需再做任何事（缓存已经显示）
            const hasCache = getCache(platform);
            if (!hasCache) {
                // 确保至少显示本地数据（可能已经被覆盖）
                renderTrendingHTML(container, hotDataLocal[platform]);
            }
        } finally {
            showLoading(container, false);
        }
    }

    // =========================================
    // 切换平台 (对外接口)
    // =========================================
    window.switchPlatform = function (platform) {
        console.log("[热榜] 切换:", platform);
        currentRequestId++;
        const requestId = currentRequestId;

        const container = document.getElementById("trending-content");
        if (!container) return;

        // 立即更新 Tab UI 样式
        updateTabUI(platform);

        // 立即显示最快可用的内容 (缓存 > 本地兜底)
        const cached = getCache(platform);
        if (cached) {
            renderTrendingHTML(container, cached);
        } else {
            renderTrendingHTML(container, hotDataLocal[platform]);
        }

        // 后台拉取真实数据
        fetchHotData(platform, requestId);
    };

    // =========================================
    // 自动刷新 (优化：直接使用缓存，不闪现本地数据)
    // =========================================
    function startAutoRefresh() {
        setInterval(() => {
            const activeTab = document.querySelector(".tab-item.active");
            if (!activeTab) return;
            const text = activeTab.innerText.trim();
            const platform = Object.keys(platformChineseNames).find(key => platformChineseNames[key] === text);
            if (platform) {
                console.log("[热榜] 自动刷新");
                // 直接调用 fetchHotData 而不是 switchPlatform，避免重新渲染本地占位内容
                currentRequestId++;
                const requestId = currentRequestId;
                fetchHotData(platform, requestId);
                // 同时确保 Tab 高亮不变，无需更新 UI 文字
            }
        }, CONFIG.refreshInterval);
    }

    // =========================================
    // 初始化
    // =========================================
    function init() {
        console.log("[热榜系统] 初始化");
        window.switchPlatform(CONFIG.defaultPlatform);
        startAutoRefresh();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
