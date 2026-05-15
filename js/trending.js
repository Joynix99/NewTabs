/**
 * 🔥 GitHub Pages 热榜稳定版 v3.0
 * 多代理自动切换 + 防封 + 缓存 + 熔断
 */

(function () {

    // =========================
    // 配置
    // =========================
    const CONFIG = {
        timeout: 10000,
        cacheDuration: 15 * 60 * 1000,
        refreshInterval: 30 * 60 * 1000,
        maxItems: 5,
        proxyCooldown: 5 * 60 * 1000
    };

    // =========================
    // 平台白名单
    // =========================
    const VALID_PLATFORMS = [
        "baidu",
        "weibo",
        "zhihu",
        "douyin"
    ];

    // =========================
    // 多代理池
    // =========================
    const PROXIES = [

        // allorigins
        {
            name: "allorigins",
            build: target =>
                `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
            parse: async res => {
                const json = await res.json();
                return JSON.parse(json.contents);
            }
        },

        // corsproxy
        {
            name: "corsproxy",
            build: target =>
                `https://corsproxy.io/?${encodeURIComponent(target)}`,
            parse: async res => {
                return await res.json();
            }
        },

        // codetabs
        {
            name: "codetabs",
            build: target =>
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
            parse: async res => {
                return await res.json();
            }
        }
    ];

    // =========================
    // 熔断记录
    // =========================
    const proxyFailures = {};

    // =========================
    // fallback
    // =========================
    const FALLBACK_DATA = {
        baidu: [
            { title: "百度热榜加载中...", url: "https://www.baidu.com" }
        ],
        weibo: [
            { title: "微博热搜加载中...", url: "https://weibo.com" }
        ],
        zhihu: [
            { title: "知乎热榜加载中...", url: "https://www.zhihu.com" }
        ],
        douyin: [
            { title: "抖音热榜加载中...", url: "https://www.douyin.com" }
        ]
    };

    // =========================
    // 工具函数
    // =========================

    function escapeHTML(str = "") {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function safeUrl(url) {
        try {
            const u = new URL(url);

            if (
                u.protocol === "http:" ||
                u.protocol === "https:"
            ) {
                return u.href;
            }

            return "javascript:void(0)";

        } catch {
            return "javascript:void(0)";
        }
    }

    // =========================
    // 缓存
    // =========================
    const cache = {

        get(key) {
            try {

                const raw = localStorage.getItem(key);

                if (!raw) return null;

                const data = JSON.parse(raw);

                if (
                    Date.now() - data.time >
                    CONFIG.cacheDuration
                ) {
                    return null;
                }

                return data.value;

            } catch {
                return null;
            }
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
        }
    };

    // =========================
    // fetch timeout
    // =========================
    async function fetchWithTimeout(url) {

        const controller = new AbortController();

        const id = setTimeout(() => {
            controller.abort();
        }, CONFIG.timeout);

        try {

            return await fetch(url, {
                signal: controller.signal,

                headers: {
                    "Accept": "application/json,text/plain,*/*"
                }
            });

        } finally {
            clearTimeout(id);
        }
    }

    // =========================
    // 获取数据
    // =========================
    async function fetchHotList(platform) {

        const target =
            "https://tenapi.cn/v2/hotlist";

        let lastError = null;

        for (const proxy of PROXIES) {

            // 熔断判断
            const failTime =
                proxyFailures[proxy.name];

            if (
                failTime &&
                Date.now() - failTime <
                CONFIG.proxyCooldown
            ) {
                continue;
            }

            try {

                const url =
                    proxy.build(target);

                console.log(
                    "[热榜] 尝试代理:",
                    proxy.name
                );

                const res =
                    await fetchWithTimeout(url);

                if (!res.ok) {
                    throw new Error(
                        `HTTP ${res.status}`
                    );
                }

                const json =
                    await proxy.parse(res);

                // 数据结构校验
                if (
                    !json ||
                    json.code !== 200 ||
                    !json.data ||
                    !Array.isArray(json.data[platform])
                ) {
                    throw new Error(
                        "数据结构异常"
                    );
                }

                const items =
                    json.data[platform]
                        .slice(0, CONFIG.maxItems)
                        .map(item => ({
                            title:
                                item.title ||
                                "未知标题",

                            url:
                                item.url ||
                                item.link ||
                                ""
                        }));

                if (!items.length) {
                    throw new Error(
                        "空数据"
                    );
                }

                console.log(
                    "[热榜] 成功:",
                    proxy.name
                );

                return items;

            } catch (err) {

                console.warn(
                    "[热榜] 代理失败:",
                    proxy.name,
                    err.message
                );

                proxyFailures[proxy.name] =
                    Date.now();

                lastError = err;
            }
        }

        throw lastError || new Error("全部代理失败");
    }

    // =========================
    // 渲染
    // =========================
    function renderHotList(container, items) {

        if (!container) return;

        if (
            !Array.isArray(items) ||
            !items.length
        ) {

            container.innerHTML =
                `<div class="trending-row">
                    暂无热榜数据
                </div>`;

            return;
        }

        container.innerHTML =
            items.map((item, idx) => `

                <a
                    href="${safeUrl(item.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="trending-row"
                >
                    <span class="rank-num">
                        ${idx + 1}
                    </span>

                    <span class="trend-text">
                        ${escapeHTML(item.title)}
                    </span>
                </a>

            `).join("");
    }

    // =========================
    // 请求锁
    // =========================
    let loading = false;

    let currentRequestId = 0;

    // =========================
    // 加载热榜
    // =========================
    async function loadHotList(
        platform,
        container,
        requestId
    ) {

        const cacheKey =
            `hot_${platform}`;

        // 立即显示缓存
        const cached =
            cache.get(cacheKey);

        if (cached) {
            renderHotList(
                container,
                cached
            );
        } else {
            renderHotList(
                container,
                FALLBACK_DATA[platform]
            );
        }

        // 避免并发
        if (loading) return;

        loading = true;

        try {

            const fresh =
                await fetchHotList(platform);

            if (
                requestId !== currentRequestId
            ) {
                return;
            }

            cache.set(cacheKey, fresh);

            renderHotList(
                container,
                fresh
            );

        } catch (err) {

            console.warn(
                "[热榜] 加载失败:",
                err.message
            );

        } finally {

            loading = false;
        }
    }

    // =========================
    // 切换平台
    // =========================
    window.switchPlatform =
        function (platform) {

        if (
            !VALID_PLATFORMS.includes(platform)
        ) {
            platform = "baidu";
        }

        currentRequestId++;

        const rid =
            currentRequestId;

        const container =
            document.getElementById(
                "trending-content"
            );

        if (!container) return;

        document
            .querySelectorAll(
                ".tab-item[data-platform]"
            )
            .forEach(btn => {

                btn.classList.toggle(
                    "active",
                    btn.dataset.platform === platform
                );
            });

        loadHotList(
            platform,
            container,
            rid
        );
    };

    // =========================
    // 自动刷新
    // =========================
    function startAutoRefresh() {

        setInterval(() => {

            const active =
                document.querySelector(
                    ".tab-item.active[data-platform]"
                );

            if (!active) return;

            const platform =
                active.dataset.platform;

            if (platform) {

                console.log(
                    "[热榜] 自动刷新",
                    platform
                );

                window.switchPlatform(
                    platform
                );
            }

        }, CONFIG.refreshInterval);
    }

    // =========================
    // 初始化
    // =========================
    function init() {

        document
            .querySelectorAll(
                ".tab-item[data-platform]"
            )
            .forEach(btn => {

                if (
                    btn.dataset.bound
                ) return;

                btn.dataset.bound = "1";

                btn.addEventListener(
                    "click",
                    () => {

                        const platform =
                            btn.dataset.platform;

                        window.switchPlatform(
                            platform
                        );
                    }
                );
            });

        window.switchPlatform(
            "baidu"
        );

        startAutoRefresh();

        console.log(
            "[热榜系统] v3 初始化完成"
        );
    }

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
