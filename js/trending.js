/**
 * 🌍 Hot Trending System
 * v6 Production Ultimate
 * ChatGpt DeepSeek GoogleAI
 * GitHub Pages / Vercel / Netlify
 */

(function () {

    // 防止 SPA 重复初始化
    if (window.__HOT_SYSTEM_INITIALIZED__) {
        console.warn("[热榜] 系统已初始化");
        return;
    }

    window.__HOT_SYSTEM_INITIALIZED__ = true;

    // =====================================================
    // 配置中心
    // =====================================================
    const CONFIG = {

        timeout: 8000,

        refreshInterval: 15 * 60 * 1000,

        cacheDuration: 10 * 60 * 1000,

        maxItems: 5,

        defaultPlatform: "baidu",

        // API 熔断时间
        circuitBreakerDuration: 10 * 60 * 1000,

        // API 连续失败次数
        maxFailures: 3
    };

    // =====================================================
    // 本地数据
    // =====================================================
    const hotDataLocal = {

        baidu: [
            { title: "百度热榜连接中...", url: "https://www.baidu.com" },
            { title: "正在尝试连接实时数据", url: "https://www.baidu.com" },
            { title: "GitHub Pages 稳定模式运行中", url: "https://www.baidu.com" },
            { title: "系统运行正常", url: "https://www.baidu.com" },
            { title: "等待网络响应", url: "https://www.baidu.com" }
        ],

        weibo: [
            { title: "微博热搜连接中...", url: "https://weibo.com" },
            { title: "正在获取实时热点", url: "https://weibo.com" },
            { title: "网络恢复后将自动更新", url: "https://weibo.com" },
            { title: "当前为离线保护模式", url: "https://weibo.com" },
            { title: "系统运行正常", url: "https://weibo.com" }
        ],

        zhihu: [
            { title: "知乎热榜连接中...", url: "https://www.zhihu.com" },
            { title: "正在同步互联网热点", url: "https://www.zhihu.com" },
            { title: "等待远程 API 响应", url: "https://www.zhihu.com" },
            { title: "静态部署保护模式", url: "https://www.zhihu.com" },
            { title: "系统正常运行", url: "https://www.zhihu.com" }
        ],

        douyin: [
            { title: "抖音热榜连接中...", url: "https://www.douyin.com" },
            { title: "正在获取实时热视频", url: "https://www.douyin.com" },
            { title: "云端同步中", url: "https://www.douyin.com" },
            { title: "请保持网络畅通", url: "https://www.douyin.com" },
            { title: "系统运行正常", url: "https://www.douyin.com" }
        ]
    };

    // =====================================================
    // 平台名
    // =====================================================
    const platformChineseNames = {
        baidu: "百度",
        weibo: "微博",
        zhihu: "知乎",
        douyin: "抖音"
    };

    // =====================================================
    // API 列表
    // =====================================================
    const API_LIST = [

        {
            name: "uapis",
            url: (platform) =>
                `https://uapis.cn/api/misc/hotboard?type=${platform}&limit=${CONFIG.maxItems}`,

            parse: (json) => {

                if (Array.isArray(json)) {

                    return json.slice(0, CONFIG.maxItems).map(item => ({
                        title: item.title || item.name || "未知标题",
                        url: item.url || item.link || ""
                    }));
                }

                return null;
            }
        },

        {
            name: "52vmy",

            url: (platform) =>
                `https://api.52vmy.cn/api/wl/hot?type=${platform}`,

            parse: (json) => {

                if (
                    json &&
                    json.code === 200 &&
                    Array.isArray(json.data)
                ) {

                    return json.data
                        .slice(0, CONFIG.maxItems)
                        .map(item => ({

                            title: item.title || "未知标题",

                            url: item.url || ""
                        }));
                }

                return null;
            }
        }
    ];

    // =====================================================
    // API 健康状态
    // =====================================================
    const apiHealth = {};

    API_LIST.forEach(api => {

        apiHealth[api.name] = {

            failures: 0,

            disabledUntil: 0
        };
    });

    // =====================================================
    // 全局状态
    // =====================================================
    let currentAbortController = null;

    let currentRequestId = 0;

    // =====================================================
    // 超时 fetch
    // =====================================================
    async function fetchWithTimeout(url, timeout, signal) {

        const controller = new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
        }, timeout);

        try {

            const response = await fetch(url, {
                signal: signal || controller.signal,
                cache: "no-store"
            });

            return response;

        } finally {

            clearTimeout(timer);
        }
    }

    // =====================================================
    // 缓存
    // =====================================================
    function getCache(platform) {

        try {

            const raw =
                localStorage.getItem(`hot_cache_${platform}`);

            if (!raw) return null;

            const parsed = JSON.parse(raw);

            return parsed.data;

        } catch {

            return null;
        }
    }

    function setCache(platform, data) {

        try {

            localStorage.setItem(
                `hot_cache_${platform}`,

                JSON.stringify({
                    time: Date.now(),
                    data
                })
            );

        } catch {}
    }

    // =====================================================
    // HTML 转义
    // =====================================================
    function escapeHTML(str = "") {

        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // =====================================================
    // URL 安全
    // =====================================================
    function safeUrl(url) {

        if (!url) {
            return "javascript:void(0)";
        }

        if (
            url.startsWith("https://") ||
            url.startsWith("http://")
        ) {

            return url;
        }

        return "javascript:void(0)";
    }

    // =====================================================
    // 渲染
    // =====================================================
    function renderTrendingHTML(container, items) {

        if (!container) return;

        container.innerHTML = items.map((item, index) => {

            const safeTitle =
                escapeHTML(item.title);

            const finalUrl =
                safeUrl(item.url);

            return `
                <a href="${finalUrl}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="trending-row">

                    <span class="rank-num">
                        ${index + 1}
                    </span>

                    <span class="trend-text">
                        ${safeTitle}
                    </span>

                </a>
            `;

        }).join("");
    }

    // =====================================================
    // 更新 tab
    // =====================================================
    function updateTabUI(platform) {

        document
            .querySelectorAll(".tab-item")
            .forEach(tab => {

                tab.classList.remove("active");

                if (
                    tab.innerText.trim() ===
                    platformChineseNames[platform]
                ) {

                    tab.classList.add("active");
                }
            });
    }

    // =====================================================
    // API 熔断检查
    // =====================================================
    function isApiAvailable(apiName) {

        const health = apiHealth[apiName];

        return Date.now() > health.disabledUntil;
    }

    function markApiFailure(apiName) {

        const health = apiHealth[apiName];

        health.failures++;

        if (
            health.failures >= CONFIG.maxFailures
        ) {

            health.disabledUntil =
                Date.now() +
                CONFIG.circuitBreakerDuration;

            console.warn(
                `[熔断] API ${apiName} 已熔断`
            );
        }
    }

    function markApiSuccess(apiName) {

        apiHealth[apiName].failures = 0;

        apiHealth[apiName].disabledUntil = 0;
    }

    // =====================================================
    // 获取热榜
    // =====================================================
    async function tryFetchHotList(platform, signal) {

        for (const api of API_LIST) {

            // 熔断
            if (!isApiAvailable(api.name)) {

                console.warn(
                    `[熔断] 跳过 API ${api.name}`
                );

                continue;
            }

            try {

                const url =
                    api.url(platform);

                console.log(
                    `[热榜] 请求 ${api.name}`,
                    url
                );

                const response =
                    await fetchWithTimeout(
                        url,
                        CONFIG.timeout,
                        signal
                    );

                // Content-Type 校验
                const contentType =
                    response.headers.get("content-type") || "";

                if (
                    !contentType.includes("application/json")
                ) {

                    throw new Error("返回非 JSON");
                }

                const json =
                    await response.json();

                const normalized =
                    api.parse(json);

                if (
                    normalized &&
                    normalized.length
                ) {

                    markApiSuccess(api.name);

                    return normalized;
                }

                throw new Error("空数据");

            } catch (err) {

                if (err.name === "AbortError") {
                    throw err;
                }

                console.warn(
                    `[热榜] API ${api.name} 失败`,
                    err.message
                );

                markApiFailure(api.name);
            }
        }

        throw new Error("所有 API 不可用");
    }

    // =====================================================
    // 拉取数据
    // =====================================================
    async function fetchHotData(platform) {

        const container =
            document.getElementById(
                "trending-content"
            );

        if (!container) return;

        // 真正取消旧请求
        if (currentAbortController) {

            currentAbortController.abort();
        }

        currentAbortController =
            new AbortController();

        const signal =
            currentAbortController.signal;

        currentRequestId++;

        const requestId =
            currentRequestId;

        // stale-while-revalidate
        const cache =
            getCache(platform);

        if (cache) {

            renderTrendingHTML(
                container,
                cache
            );

        } else {

            renderTrendingHTML(
                container,
                hotDataLocal[platform]
            );
        }

        try {

            const normalized =
                await tryFetchHotList(
                    platform,
                    signal
                );

            if (
                requestId !== currentRequestId
            ) {

                return;
            }

            renderTrendingHTML(
                container,
                normalized
            );

            setCache(
                platform,
                normalized
            );

            console.log(
                "[热榜] 更新成功"
            );

        } catch (err) {

            if (
                err.name === "AbortError"
            ) {

                console.log(
                    "[热榜] 请求已取消"
                );

                return;
            }

            console.error(
                "[热榜] 获取失败",
                err.message
            );
        }
    }

    // =====================================================
    // 切换平台
    // =====================================================
    window.switchPlatform = function (platform) {

        console.log(
            "[热榜] 切换:",
            platform
        );

        updateTabUI(platform);

        fetchHotData(platform);
    };

    // =====================================================
    // 自动刷新
    // =====================================================
    function startAutoRefresh() {

        setInterval(() => {

            // 页面隐藏时暂停
            if (document.hidden) {

                return;
            }

            const activeTab =
                document.querySelector(
                    ".tab-item.active"
                );

            if (!activeTab) return;

            const text =
                activeTab.innerText.trim();

            const platform =
                Object.keys(
                    platformChineseNames
                ).find(
                    key =>
                        platformChineseNames[key]
                        === text
                );

            if (platform) {

                console.log(
                    "[热榜] 自动刷新"
                );

                fetchHotData(platform);
            }

        }, CONFIG.refreshInterval);
    }

    // =====================================================
    // 初始化
    // =====================================================
    function init() {

        console.log(
            "[热榜系统] v6 初始化"
        );

        window.switchPlatform(
            CONFIG.defaultPlatform
        );

        startAutoRefresh();
    }

    // DOM Ready
    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();
