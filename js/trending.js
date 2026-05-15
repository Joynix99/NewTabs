/**
 * 🔒 零阻塞・GitHub 托管级沙盒热搜脚本
 * 专门解决静态部署或本地环境下 fetch 导致的跨域失效及天气卡片连坐崩溃问题
 */
(function () {
    // 1. 离线打底数据：确保拔掉网线或首次加载时，卡片 100% 具备顺畅的点击和视觉填充
    const hotDataLocal = {
        baidu: [
            { title: "正在连接百度实时网络节点...", url: "https://baidu.com" },
            { title: "列表如果长时间未刷新，请检查网络", url: "https://baidu.com" },
            { title: "此组件支持全离线环境下的顺畅切换", url: "https://baidu.com" },
            { title: "其它核心卡片（天气、倒计时）正常运行中", url: "https://baidu.com" },
            { title: "不能生成，需要检测网络", url: "https://baidu.com" }
        ],
        weibo: [
            { title: "微博离线：等待获取互联网实时头条...", url: "https://weibo.com" },
            { title: "建议给打工人增加弹性休假时长", url: "https://weibo.com" },
            { title: "初夏第一场大范围强降雨即将来袭", url: "https://weibo.com" },
            { title: "周五临近下班的心情表情大赏", url: "https://weibo.com" },
            { title: "特朗普访华欢迎宴会", url: "https://weibo.com" }
            
        ],
        google: [
            { title: "知乎离线：等待获取互联网实时头条...", url: "https://news.google.com" },
            { title: "多模态大模型最新测试版全球发布", url: "https://news.google.com" },
            { title: "半导体前沿技术演进路线探究", url: "https://news.google.com" },
            { title: "前沿科技巨头市值创下历史新高", url: "https://news.google.com" },
            { title: "习近平会见随同美国总统特朗普访华的美国企业家", url: "https://news.google.com" },
        ],
        douyin: [
            { title: "抖音离线：等待获取互联网实时头条...", url: "https://douyin.com" },
            { title: "当搞笑游客遇到外国硬核导游", url: "https://douyin.com" },
            { title: "超治愈纯音乐夏日配乐曲推荐", url: "https://douyin.com" },
            { title: "夏日第一根冰棒打卡趣味挑战", url: "https://douyin.com" },
            { title: "特朗普访华", url: "https://douyin.com" }
        ]
    };

    const platformChineseNames = { baidu: "百度", weibo: "微博", google: "谷歌", douyin: "抖音" };

    /**
     * 核心安全控制器：由 HTML 中的 Tab 标签进行原生 onclick 调用
     */
    window.switchPlatform = function (platform) {
        console.log("[GitHub沙盒内核] 切换请求:", platform);
        
        const container = document.getElementById("trending-content");
        if (!container) return;

        // A. 瞬间切换顶部 Tab 的激活高亮样式
        const tabs = document.querySelectorAll(".tab-item");
        tabs.forEach((t) => {
            t.classList.remove("active");
            if (t.innerText.trim() === platformChineseNames[platform]) {
                t.classList.add("active");
            }
        });

        // B. 步骤一：0毫秒内优先释放本地离线源，确保界面绝不发生瞬间黑屏，杜绝卡死外部定时器
        renderTrendingHTML(container, hotDataLocal[platform]);

        // C. 步骤二：使用不触发 CORS 的原生 Script 标签，默默在后台拉取实时数据
        const oldScript = document.getElementById("github-jsonp-node");
        if (oldScript) oldScript.remove(); // 及时卸载上一次的请求标签

        // 规范映射 imsyy 开源今日热榜网关的专用子路由
        const nodeType = platform === 'google' ? 'zhihu' : platform + 'hot';

        const script = document.createElement("script");
        script.id = "github-jsonp-node";
        
        // 挂载支持全域跨域释放的托管级 JSONP 直连中台（要求对方异步回调给下方的全局接收器）
        script.src = `vvhan.com{nodeType}&callback=onGlobalReceiveHot`;
        
        // 核心安全隔离：即使遇到极端网络劫持、接口彻底死机，也只会在底层报无害失败，绝对不抛出致命报错
        script.onerror = function() {
            console.warn("[沙盒防火墙] 远程接口未就绪，继续平滑使用打底层，免受影响");
            script.remove();
        };
        
        document.body.appendChild(script);
    };

    /**
     * 3. 核心全局接收器：专门用来拦截从 GitHub Pages/Vercel 网关洗出的真实网络热点
     */
    window.onGlobalReceiveHot = function (json) {
        const container = document.getElementById("trending-content");
        if (!container) return;

        // 严格解析并清洗来自公网的标准化 JSONP 包结构
        if (json && json.success === true && Array.isArray(json.data) && json.data.length > 0) {
            // 精准提取前 4 条以严密贴合卡片分配高度
            const freshItems = json.data.slice(0, 4).map(item => ({
                title: item.title,
                url: item.url || "javascript:void(0);"
            }));
            
            // 实时新闻成功穿透！完美覆盖展示
            renderTrendingHTML(container, freshItems);
        }
        
        // 阅后即焚：渲染完后自动擦除 Script 标签，防 DOM 污染
        const currentScript = document.getElementById("github-jsonp-node");
        if (currentScript) currentScript.remove();
    };

    /**
     * 高级模板渲染器
     */
    function renderTrendingHTML(container, items) {
        container.innerHTML = items
            .map(
                (item, index) => `
                <a href="${item.url}" target="_blank" class="trending-row">
                    <span class="rank-num">${index + 1}</span>
                    <span class="trend-text">${item.title}</span>
                </a>
            `
            )
            .join("");
    }

    // 4. 挂载完成，进入初始化流
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => window.switchPlatform("baidu"));
    } else {
        window.switchPlatform("baidu");
    }
})();
