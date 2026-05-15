/**
 * 🌍 线上托管级动态天气抓取器 (v2.0)
 * 优先基于用户公网 IP 自动定位城市，并自动切换默认坐标进行防御性保底
 */
async function updateWeatherByLocation() {
  // --- 🔒 默认兜底配置区域：若 IP 定位失效，将强制使用此处的静态配置 ---
  const defaultCity = "Ho Chi Minh";
  const defaultLat = "11.12";
  const defaultLon = "106.57";

  // 运行时实际采用的坐标和名称变量
  let finalCity = defaultCity;
  let finalLat = defaultLat;
  let finalLon = defaultLon;

  // --- 🛰️ 第一阶段：尝试进行 IP 智能地理位置追踪 ---
  try {
    console.log("[地理中心] 正在尝试通过公网 IP 嗅探客户端位置...");
    
    // 使用全球高可用、完全放行跨域的 ip-api 免费公开接口 (设置 3 秒硬性超时)
    const ipController = new AbortController();
    const ipTimeout = setTimeout(() => ipController.abort(), 3000);

    const ipResponse = await fetch("ip-api.com", {
      signal: ipController.signal
    }).catch(() => {
      // 备用 HTTPS 兼容性定位源（防止混合内容拦截）
      return fetch("ipapi.co");
    });

    clearTimeout(ipTimeout);

    if (ipResponse && ipResponse.ok) {
      const ipData = await ipResponse.json();
      
      // 兼容清洗不同 IP 数据库回传的属性字段
      const detectedCity = ipData.city || ipData.region;
      const detectedLat = ipData.lat || ipData.latitude;
      const detectedLon = ipData.lon || ipData.longitude;

      if (detectedCity && detectedLat && detectedLon) {
        finalCity = detectedCity;
        finalLat = String(detectedLat);
        finalLon = String(detectedLon);
        console.log(`[地理中心] 定位追踪成功！当前位于: ${finalCity} (${finalLat}, ${finalLon})`);
      }
    }
  } catch (ipError) {
    // 拦截报错，不允许其向外逃逸卡死主线程
    console.warn("[地理中心] IP 定位服务受阻或超时，已无缝启用默认城市打底:", ipError.message);
  }

  // --- 🌦️ 第二阶段：基于确定的坐标请求实时天气 ---
  // 使用支持公网全域跨域的 allorigins 代理网关包装 wttr.in 接口
  const targetWeatherUrl = `wttr.in{finalLat},${finalLon}?format=j1`;
  const proxiedUrl = `allorigins.win{encodeURIComponent(targetWeatherUrl)}`;

  try {
    console.log(`[天气内核] 正在请求 ${finalCity} 的最新气象数据...`);
    
    const weatherController = new AbortController();
    const weatherTimeout = setTimeout(() => weatherController.abort(), 5000);

    const response = await fetch(proxiedUrl, { signal: weatherController.signal });
    if (!response.ok) throw new Error(`天气网关响应异常: ${response.status}`);
    
    const wrapperData = await response.json();
    clearTimeout(weatherTimeout);

    const data = JSON.parse(wrapperData.contents);
    const current = data.current_condition;
    const temp = current.temp_C;
    const weatherDesc = current.weatherDesc.value.toLowerCase();
    const dayForecast = data.weather;

    // 数据清洗就绪，平滑上屏注入 HTML DOM
    const locationEl = document.getElementById("w-location");
    if (locationEl) locationEl.innerText = finalCity;

    document.getElementById("w-temp-now").innerText = `${temp}°`;
    document.getElementById("w-range").innerText = `${dayForecast.maxtempC}° / ${dayForecast.mintempC}°`;

    // 气象语义图标智能映射
    let statusText = "多云";
    let iconCode = "101";

    if (weatherDesc.includes("cloud") || weatherDesc.includes("overcast")) {
      statusText = "多云";
      iconCode = "101";
    } else if (
      weatherDesc.includes("rain") || 
      weatherDesc.includes("shower") || 
      weatherDesc.includes("drizzle")
    ) {
      statusText = "小雨";
      iconCode = "305";
    } else if (weatherDesc.includes("clear") || weatherDesc.includes("sun")) {
      statusText = "晴";
      iconCode = "100";
    } else {
      statusText = "阴";
      iconCode = "104";
    }

    document.getElementById("w-desc").innerText = statusText;
    document.getElementById("w-icon").src = `codelife.cc{iconCode}-fill.svg`;
    
    console.log(`[天气内核] ${finalCity} 天气同步成功。当前气温: ${temp}°C`);

  } catch (error) {
    console.error("[天气内核] 流程解析发生突发异常，强行触发全盘离线兜底机制。原因:", error.message);
    
    // --- 🚨 第三阶段：全盘离线状态防垮保底 (显示默认胡志明市) ---
    const locationEl = document.getElementById("w-location");
    if (locationEl) locationEl.innerText = defaultCity;

    document.getElementById("w-temp-now").innerText = "28°";
    document.getElementById("w-desc").innerText = "多云";
    document.getElementById("w-range").innerText = "32° / 24°";
    document.getElementById("w-icon").src = `codelife.cc`;
  }
}

// 网页框架载入后即刻启动首次天气自动对齐
updateWeatherByLocation();

// 每隔 30 分钟在后台静默运行一次位置与天气校准，不影响倒计时卡片和热搜卡片
setInterval(updateWeatherByLocation, 1800000);
