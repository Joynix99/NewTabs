/**
 * 🌍 线上托管级动态天气抓取器 (v2.1 修正版)
 * 优先基于用户公网 IP 自动定位城市，并自动切换默认坐标进行防御性保底
 */
async function updateWeatherByLocation() {
  // --- 🔒 默认兜底配置区域：若 IP 定位失效，将强制使用此处的静态配置 ---
  const defaultCity = "Ho Chi Minh";
  const defaultLat = "10.76"; // 修正了更准确的胡志明市纬度
  const defaultLon = "106.66";

  // 运行时实际采用的坐标和名称变量
  let finalCity = defaultCity;
  let finalLat = defaultLat;
  let finalLon = defaultLon;

  // --- 🛰️ 第一阶段：尝试进行 IP 智能地理位置追踪 ---
  try {
    console.log("[地理中心] 正在尝试通过公网 IP 嗅探客户端位置...");
    
    const ipController = new AbortController();
    const ipTimeout = setTimeout(() => ipController.abort(), 3000);

    // 修正：ip-api 免费版不支持 HTTPS，此处改用支持 HTTPS 且无需 Key 的 ipapi.co
    const ipResponse = await fetch("https://ipapi.co", {
      signal: ipController.signal
    });

    clearTimeout(ipTimeout);

    if (ipResponse && ipResponse.ok) {
      const ipData = await ipResponse.json();
      
      // 兼容清洗不同 IP 数据库回传的属性字段
      const detectedCity = ipData.city || ipData.region;
      const detectedLat = ipData.latitude || ipData.lat;
      const detectedLon = ipData.longitude || ipData.lon;

      if (detectedCity && detectedLat && detectedLon) {
        finalCity = detectedCity;
        finalLat = String(detectedLat);
        finalLon = String(detectedLon);
        console.log(`[地理中心] 定位追踪成功！当前位于: ${finalCity} (${finalLat}, ${finalLon})`);
      }
    }
  } catch (ipError) {
    console.warn("[地理中心] IP 定位服务受阻或超时，已无缝启用默认城市打底:", ipError.message);
  }

  // --- 🌦️ 第二阶段：基于确定的坐标请求实时天气 ---
  // 修正：必须使用反引号 `` 拼接变量，并补全 https:// 协议
  const targetWeatherUrl = `https://wttr.in{finalLat},${finalLon}?format=j1`;
  const proxiedUrl = `https://allorigins.win{encodeURIComponent(targetWeatherUrl)}`;

  try {
    console.log(`[天气内核] 正在请求 ${finalCity} 的最新气象数据...`);
    
    const weatherController = new AbortController();
    const weatherTimeout = setTimeout(() => weatherController.abort(), 5000);

    const response = await fetch(proxiedUrl, { signal: weatherController.signal });
    if (!response.ok) throw new Error(`天气网关响应异常: ${response.status}`);
    
    const wrapperData = await response.json();
    clearTimeout(weatherTimeout);

    // 解析 allorigins 代理返回的字符串数据
    const data = JSON.parse(wrapperData.contents);
    
    // 修正：wttr.in 的 current_condition 是一个数组
    const current = data.current_condition[0]; 
    const temp = current.temp_C;
    // 修正：weatherDesc 也是一个包裹在数组里的对象
    const weatherDesc = current.weatherDesc[0].value.toLowerCase(); 
    // 修正：weather 是按天预报的数组，今天的数据在索引 0
    const dayForecast = data.weather[0]; 

    // 数据清洗就绪，平滑上屏注入 HTML DOM
    const locationEl = document.getElementById("w-location");
    if (locationEl) locationEl.innerText = finalCity;

    const tempNowEl = document.getElementById("w-temp-now");
    if (tempNowEl) tempNowEl.innerText = `${temp}°`;

    const rangeEl = document.getElementById("w-range");
    if (rangeEl) rangeEl.innerText = `${dayForecast.maxtempC}° / ${dayForecast.mintempC}°`;

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

    const descEl = document.getElementById("w-desc");
    if (descEl) descEl.innerText = statusText;

    const iconEl = document.getElementById("w-icon");
    // 修正：补全图标的完整 URL 协议与路径
    if (iconEl) iconEl.src = `https://jsdelivr.net{iconCode}.png`; 
    
    console.log(`[天气内核] ${finalCity} 天气同步成功。当前气温: ${temp}°C`);

  } catch (error) {
    console.error("[天气内核] 流程解析发生突发异常，强行触发全盘离线兜底机制。原因:", error.message);
    
    // --- 🚨 第三阶段：全盘离线状态防垮保底 (显示默认胡志明市) ---
    const locationEl = document.getElementById("w-location");
    if (locationEl) locationEl.innerText = defaultCity;

    const tempNowEl = document.getElementById("w-temp-now");
    if (tempNowEl) tempNowEl.innerText = "28°";

    const descEl = document.getElementById("w-desc");
    if (descEl) descEl.innerText = "多云";

    const rangeEl = document.getElementById("w-range");
    if (rangeEl) rangeEl.innerText = "32° / 24°";
    
    const iconEl = document.getElementById("w-icon");
    if (iconEl) iconEl.src = ""; // 提供一个空白或本地占位图
  }
}

// 网页框架载入后即刻启动首次天气自动对齐
document.addEventListener("DOMContentLoaded", updateWeatherByLocation);

// 每隔 30 分钟在后台静默运行一次位置与天气校准
setInterval(updateWeatherByLocation, 1800000);
