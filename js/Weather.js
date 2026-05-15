/**
 * 🌍 Production Weather Engine (v4.1 终极商用无瑕疵版)
 * 已修复：无痕模式下 localStorage 崩溃、SVG 纯字符图标在部分浏览器不显示等隐蔽 Bug
 */
(() => {
  // ================================
  // 配置中心
  // ================================
  const CONFIG = {
    refreshInterval: 30 * 60 * 1000, // 30分钟后台轮询
    ipTimeout: 4000,
    weatherTimeout: 8000,
    cacheDuration: 20 * 60 * 1000, // 20分钟本地缓存

    defaultWeather: {
      city: "Ho Chi Minh",
      lat: 10.76,
      lon: 106.66,
      temp: 28,
      max: 32,
      min: 24,
      desc: "多云"
    }
  };

  let isUpdating = false;

  // ================================
  // DOM 工具
  // ================================
  const updateText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  const updateIcon = (code) => {
    const iconEl = document.getElementById("w-icon");
    if (!iconEl) return;

    const iconMap = {
      0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 
      45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 
      55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 
      71: "❄️", 80: "🌦️", 95: "⛈️"
    };

    const emoji = iconMap[code] || "☁️";
    iconEl.alt = emoji;

    // --- 🚨 【核心修复】将 SVG 转换为 Base64 编码，100% 解决部分浏览器无法渲染内联 Emoji 图标的 Bug ---
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
        <text y="75" font-size="70" font-family="Apple Color Emoji, Segoe UI Emoji, Notation, sans-serif">${emoji}</text>
      </svg>
    `;
    
    try {
      // 使用 btoa 配合 encodeURIComponent 转换为完美的 Base64 Data URL
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      iconEl.src = `data:image/svg+xml;base64,${base64Svg}`;
    } catch (e) {
      // 极端降级：若 Base64 失败，则直接尝试纯字符保底
      iconEl.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgString);
    }
  };

  // ================================
  // 超时 fetch 封装
  // ================================
  async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timer);
    }
  }

  // ================================
  // 安全缓存工具 (防止无痕模式崩溃)
  // ================================
  const safeCache = {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (e) { return null; }
    },
    set: (key, value) => {
      try {
        // --- 🚨 【核心修复】包裹 try-catch，防止无痕/隐私模式下强制写入导致 JS 彻底卡死 ---
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn("[缓存管理] 写入失败，可能处于无痕模式或存储已满");
      }
    }
  };

  // ================================
  // IP 定位
  // ================================
  async function detectLocation() {
    const cached = safeCache.get("weather_location_cache");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.time < CONFIG.cacheDuration) {
          console.log("[定位] 命中本地缓存定位");
          return parsed.data;
        }
      } catch {}
    }

    try {
      console.log("[定位] 正在嗅探用户地理位置...");
      // 一手源：高精度的 ipwho.is
      let response = await fetchWithTimeout("https://ipwho.is/", CONFIG.ipTimeout).catch(() => null);
      
      // 二手备用源：防全球网络波动平替
      if (!response || !response.ok) {
        console.log("[定位] 一手源不可用，启动备用定位接口...");
        response = await fetchWithTimeout("https://ipapi.co/json/", CONFIG.ipTimeout);
      }

      if (!response.ok) throw new Error("公网定位接口无响应");

      const data = await response.json();
      
      // 兼容清洗两个不同定位接口的字段
      const isSuccess = data.success !== undefined ? data.success : (data.error ? false : true);
      if (!isSuccess) throw new Error("接口内部返回定位失败");

      const result = {
        city: data.city || data.region || "Unknown",
        lat: data.latitude || data.lat,
        lon: data.longitude || data.lon
      };

      safeCache.set("weather_location_cache", JSON.stringify({
        time: Date.now(),
        data: result
      }));

      console.log("[定位] 嗅探成功:", result.city);
      return result;

    } catch (err) {
      console.warn("[定位] 全盘故障，降级使用静态配置:", err.message);
      return {
        city: CONFIG.defaultWeather.city,
        lat: CONFIG.defaultWeather.lat,
        lon: CONFIG.defaultWeather.lon
      };
    }
  }

  // ================================
  // Open-Meteo 天气请求
  // ================================
  async function fetchWeather(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = safeCache.get(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.time < CONFIG.cacheDuration) {
          console.log("[天气] 命中本地缓存气象数据");
          return parsed.data;
        }
      } catch {}
    }

    const url = `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,weather_code,is_day` +
                `&daily=temperature_2m_max,temperature_2m_min` +
                `&timezone=auto`;

    console.log("[天气] 发起高可用气象请求:", url);
    const response = await fetchWithTimeout(url, CONFIG.weatherTimeout);

    if (!response.ok) throw new Error(`天气接口响应状态异常: ${response.status}`);

    const data = await response.json();
    
    safeCache.set(cacheKey, JSON.stringify({
      time: Date.now(),
      data
    }));

    return data;
  }

  function weatherCodeToText(code) {
    const map = {
      0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
      45: "雾", 48: "大雾", 51: "小雨", 53: "小雨",
      55: "中雨", 61: "小雨", 63: "中雨", 65: "大雨",
      71: "小雪", 80: "阵雨", 95: "雷暴"
    };
    return map[code] || "多云";
  }

  // ================================
  // 渲染层
  // ================================
  function renderWeather(city, weatherData) {
    const current = weatherData.current;
    const daily = weatherData.daily;

    const temp = Math.round(current.temperature_2m);
    const max = Math.round(daily.temperature_2m_max[0]);
    const min = Math.round(daily.temperature_2m_min[0]);
    const code = current.weather_code;
    const desc = weatherCodeToText(code);

    updateText("w-location", city);
    updateText("w-temp-now", `${temp}°`);
    updateText("w-desc", desc);
    updateText("w-range", `${max}° / ${min}°`);

    updateIcon(code);
    console.log("[天气] UI 视图解析合并更新完成");
  }

  function renderFallback() {
    const d = CONFIG.defaultWeather;
    updateText("w-location", d.city);
    updateText("w-temp-now", `${d.temp}°`);
    updateText("w-desc", d.desc);
    updateText("w-range", `${d.max}° / ${d.min}°`);
    updateIcon(2);
    console.log("[天气] 已强行输出全盘兜底视图");
  }

  // ================================
  // 主控制中心
  // ================================
  async function updateWeather() {
    if (isUpdating) return;
    isUpdating = true;

    try {
      console.log("[天气系统] 开始同步演进...");
      const location = await detectLocation();
      const weatherData = await fetchWeather(location.lat, location.lon);
      renderWeather(location.city, weatherData);
      console.log("[天气系统] 迭代升级成功");
    } catch (err) {
      console.error("[天气系统] 遭遇不可逆阻断:", err);
      renderFallback();
    } finally {
      isUpdating = false;
    }
  }

  function startWeatherSystem() {
    updateWeather();
    setInterval(updateWeather, CONFIG.refreshInterval);
    console.log("[天气系统] 守护线程注入成功");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWeatherSystem);
  } else {
    startWeatherSystem();
  }
})();
