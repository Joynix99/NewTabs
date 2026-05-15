/**
 * 🔥 GitHub Pages 热榜系统 Stable v4.0
 * 多代理容错 + 防封 + 安全解析 + 本地缓存 + 自动熔断
 * 适用于：
 *   - GitHub Pages
 *   - 静态博客
 *   - 浏览器新标签页
 */

(function () {

    "use strict";

    // =====================================================
    // 配置
    // =====================================================

    const CONFIG = {

        // 请求超时
        timeout: 10000,

        // 缓存时间（1小时）
        cacheDuration: 60 * 60 * 1000,

        // 自动刷新（1小时）
        refreshInterval: 60 * 60 * 1000,

        // 最大显示条数
        maxItems: 5,

        // 代理熔断时间（10分钟）
        proxyCooldown: 10 * 60 * 1000
    };

    // =====================================================
    // 支持平台
    // =====================================================

    const VALID_PLATFORMS = [
        "baidu",
        "weibo",
        "zhihu",
        "douyin"
    ];

    // =====================================================
    // 多代理池
    // =====================================================

    const PROXIES = [

        // -----------------------------
        // allorigins
        // -----------------------------
        {
            name: "allorigins",

            build(target) {
                return `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
            },

            async parse(res) {

                const text = await res.text();

                // 防止 HTML 错误页
                if (!text.trim().startsWith("{")) {
                    throw new Error("allorigins 返回非 JSON");
                }

                let wrapper;

                try {
                    wrapper = JSON.parse(text);
                } catch {
                    throw new Error("allorigins JSON 解析失败");
                }

                if (!wrapper.contents) {
                    throw new Error("allorigins 无 contents");
                }

                let data;

                try {
                    data = JSON.parse(wrapper.contents);
                } catch {
                    throw new Error("contents JSON 解析失败");
                }

                return data;
            }
        },

        // -----------------------------
        // corsproxy
        // -----------------------------
        {
            name: "corsproxy",

            build(target) {
                return `https://corsproxy.io/?${encodeURIComponent(target)}`;
            },

            async parse(res) {

                const text = await res.text();

                if (!text.trim().startsWith("{")) {
                    throw new Error("corsproxy 返回非 JSON");
                }

                try {
                    return JSON.parse(text);
                } catch {
                    throw new Error("corsproxy JSON 解析失败");
                }
            }
        }
    ];

    // =====================================================
    // fallback 保底数据
    // =====================================================

    const FALLBACK_DATA = {

        baidu: [
            {
                title: "百度热榜加载中...",
                url: "https://www.baidu.com"
            }
        ],

        weibo: [
            {
                title: "微博热搜加载中...",
                url: "https://weibo.com"
            }
        ],

        zhihu: [
            {
                title: "知乎热榜加载中...",
                url: "https://www.zhihu.com"
            }
        ],

        douyin: [
            {
                title: "抖音热榜加载中...",
                url: "https://www.douyin.com"
            }
        ]
    };

    // =====================================================
    // 工具函数
    // =====================================================

    // HTML 转义
    function escapeHTML(str = "") {

        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // URL 安全校验
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

    // =====================================================
    // 本地缓存
    // =====================================================

    const cache = {

        get(key) {

            try {

                const raw =
                    localStorage.getItem(key);

                if (!raw) return null;

                const data =
                    JSON.parse(raw);

                if (
                    !data.time ||
                    !data.value
                ) {
                    return null;
                }

                // 缓存过期
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

            } catch {
                // 无痕模式静默失败
            }
        }
    };

    // =====================================================
    // fetch timeout
    // =====================================================

    async function fetchWithTimeout(url) {

        const controller =
            new AbortController();

        const timer =
            setTimeout(() => {

                controller.abort();

            }, CONFIG.timeout);

        try {

            return await fetch(url, {

                signal: controller.signal,

                // 不要 no-store
                cache: "default",

                headers: {

                    "Accept":
                        "application/json,text/plain,*/*"
                }
            });

        } finally {

            clearTimeout(timer);
        }
    }

    // =====================================================
    // 代理熔断
    // =====================================================

    const proxyFailures = {};

    // =====================================================
    // 获取热榜
    // =====================================================

    async function fetchHotList(platform) {

        const target =
            "https://tenapi.cn/v2/hotlist";

        let lastError = null;

        // 遍历代理池
        for (const proxy of PROXIES) {

            try {

                // -----------------------------
                // 熔断检查
                // -----------------------------

                const failTime =
                    proxyFailures[proxy.name];

                if (
                    failTime &&
                    Date.now() - failTime <
                    CONFIG.proxyCooldown
                ) {

                    console.warn(
                        `[热榜] 跳过熔断代理: ${proxy.name}`
                    );

                    continue;
                }

                console.log(
                    `[热榜] 尝试代理: ${proxy.name}`
                );

                const url =
                    proxy.build(target);

                const res =
                    await fetchWithTimeout(url);

                // HTTP 状态检查
                if (!res.ok) {

                    throw new Error(
                        `HTTP ${res.status}`
                    );
                }

                // 解析代理返回
                const json =
                    await proxy.parse(res);

                // -----------------------------
                // 数据结构检查
                // -----------------------------

                if (
                    !json ||
                    json.code !== 200 ||
                    !json.data
                ) {

                    throw new Error(
                        "热榜数据结构错误"
                    );
                }

                // 平台数据
                const list =
                    json.data[platform];

                if (
                    !Array.isArray(list)
                ) {

                    throw new Error(
                        `平台 ${platform} 数据不存在`
                    );
                }

                // 清洗数据
                const items =
                    list
                    .slice(0, CONFIG.maxItems)
                    .map(item => ({

                        title:
                            item.title ||
                            "未知标题",

                        url:
                            item.url ||
                            item.link ||
                            ""
                    }))
                    .filter(item =>
                        item.title
                    );

                if (!items.length) {

                    throw new Error(
                        "热榜为空"
                    );
                }

                console.log(
                    `[热榜] 成功: ${proxy.name}`
                );

                return items;

            } catch (err) {

                console.warn(
                    `[热榜] 代理失败: ${proxy.name}`,
                    err.message
                );

                // 熔断记录
                proxyFailures[proxy.name] =
                    Date.now();

                lastError = err;
            }
        }

        throw lastError ||
            new Error("全部代理失败");
    }

    // =====================================================
    // 渲染
    // =====================================================

    function renderHotList(container, items) {

        if (!container) return;

        // 防御
        if (
            !Array.isArray(items) ||
            !items.length
        ) {

            container.innerHTML = `
                <div class="trending-row">
                    暂无热榜数据
                </div>
            `;

            return;
        }

        const html =
            items.map((item, idx) => {

                return `
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
                `;
            }).join("");

        container.innerHTML = html;
    }

    // =====================================================
    // 请求控制
    // =====================================================

    let currentRequestId = 0;

    let loading = false;

    // =====================================================
    // 加载热榜
    // =====================================================

    async function loadHotList(
        platform,
        container,
        requestId
    ) {

        const cacheKey =
            `hot_${platform}`;

        // -----------------------------
        // 立即显示缓存
        // -----------------------------

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

        // 防止并发
        if (loading) return;

        loading = true;

        try {

            // 获取新数据
            const fresh =
                await fetchHotList(platform);

            // 请求过期
            if (
                requestId !== currentRequestId
            ) {
                return;
            }

            // 更新缓存
            cache.set(
                cacheKey,
                fresh
            );

            // 渲染
            renderHotList(
                container,
                fresh
            );

        } catch (err) {

            console.warn(
                "[热榜] 加载失败:",
                err.message
            );

            // 如果容器空
            if (
                !container.innerHTML.trim()
            ) {

                renderHotList(
                    container,
                    FALLBACK_DATA[platform]
                );
            }

        } finally {

            loading = false;
        }
    }

    // =====================================================
    // 切换平台
    // =====================================================

    window.switchPlatform =
        function (platform) {

        // 平台校验
        if (
            !VALID_PLATFORMS.includes(platform)
        ) {

            platform = "baidu";
        }

        currentRequestId++;

        const requestId =
            currentRequestId;

        const container =
            document.getElementById(
                "trending-content"
            );

        if (!container) {

            console.error(
                "未找到 #trending-content"
            );

            return;
        }

        // tab active
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
            requestId
        );
    };

    // =====================================================
    // 自动刷新
    // =====================================================

    function startAutoRefresh() {

        setInterval(() => {

            const activeTab =
                document.querySelector(
                    ".tab-item.active[data-platform]"
                );

            if (!activeTab) return;

            const platform =
                activeTab.dataset.platform;

            if (!platform) return;

            console.log(
                `[热榜] 自动刷新: ${platform}`
            );

            window.switchPlatform(
                platform
            );

        }, CONFIG.refreshInterval);
    }

    // =====================================================
    // 初始化
    // =====================================================

    function init() {

        const tabs =
            document.querySelectorAll(
                ".tab-item[data-platform]"
            );

        if (!tabs.length) {

            console.warn(
                "未找到 tab-item"
            );
        }

        tabs.forEach(btn => {

            // 防止重复绑定
            if (
                btn.dataset.bound
            ) {
                return;
            }

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

        // 默认百度
        window.switchPlatform(
            "baidu"
        );

        // 自动刷新
        startAutoRefresh();

        console.log(
            "[热榜系统] Stable v4 初始化完成"
        );
    }

    // =====================================================
    // DOM Ready
    // =====================================================

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
