// ===== CONFIGURATION =====
const API_KEY = '8bcbf9bd1c0f85cdd1812e885efcf9d9';
const API_BASE = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_BASE = 'https://api.openweathermap.org/data/2.5/forecast';
const UNITS = 'metric';

// ===== APP STATE =====
const state = {
    city: 'London',
    data: null,
    isCelsius: true,
    isDark: false,
    isLoading: false,
    lastSearchedCity: null
};

// ===== DOM CACHE =====
const DOM = {
    cityInput: document.getElementById('cityInput'),
    searchForm: document.getElementById('searchForm'),
    searchError: document.getElementById('searchError'),
    searchErrorMessage: document.getElementById('searchErrorMessage'),
    geoBtn: document.getElementById('geoBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    themeToggle: document.getElementById('themeToggle'),
    unitToggle: document.getElementById('unitToggle'),
    unitLabel: document.getElementById('unitLabel'),
    hamburger: document.getElementById('hamburger'),
    navLinks: document.getElementById('navLinks'),
    
    weatherCard: document.getElementById('weatherCard'),
    loadingSkeleton: document.getElementById('loadingSkeleton'),
    errorState: document.getElementById('errorState'),
    toastContainer: document.getElementById('toastContainer'),
    forecastGrid: document.getElementById('forecastGrid'),
    forecastSection: document.getElementById('forecastSection'),
    
    cityName: document.getElementById('cityName'),
    weatherDate: document.getElementById('weatherDate'),
    temperature: document.getElementById('temperature'),
    weatherCondition: document.getElementById('weatherCondition'),
    weatherIcon: document.getElementById('weatherIcon'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uvIndex'),
    airQuality: document.getElementById('airQuality'),
    feelsLike: document.getElementById('feelsLike'),
    tempMax: document.getElementById('tempMax'),
    tempMin: document.getElementById('tempMin'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    footerLinks: document.querySelectorAll('.footer-links a'),
    navLinksAll: document.querySelectorAll('.nav-links a')
};

// ============================================================
// ===== TOAST SYSTEM =====
// ============================================================
function showToast(message, type = 'info', duration = 1500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    });
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================================
// ===== SEARCH ERROR =====
// ============================================================
function showSearchError(message) {
    DOM.searchError.classList.remove('hidden');
    DOM.searchErrorMessage.textContent = message || 'City not found. Please try again.';
}

function hideSearchError() {
    DOM.searchError.classList.add('hidden');
}

// ============================================================
// ===== STORAGE / CACHE =====
// ============================================================
function getCacheKey(city) {
    return 'weather-cast-' + city.toLowerCase().trim();
}

function getCachedData(city) {
    try {
        const key = getCacheKey(city);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        
        const data = JSON.parse(raw);
        const age = Date.now() - data.timestamp;
        const maxAge = 10 * 60 * 1000; // 10 minutes
        
        if (age > maxAge) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data;
    } catch {
        return null;
    }
}

function cacheWeatherData(city, weatherData, forecastData = null) {
    try {
        const key = getCacheKey(city);
        const data = {
            weather: weatherData,
            forecast: forecastData,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 Cached weather & forecast: ${city}`);
    } catch (e) {
        // Silent fail
    }
}

// ============================================================
// ===== API CALLS =====
// ============================================================
async function fetchWeather(city) {
    const url = `${API_BASE}?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`City "${city}" not found. Please check the spelling.`);
        } else if (response.status === 401) {
            throw new Error('Invalid API key. Please check configuration.');
        } else if (response.status === 429) {
            throw new Error('Too many requests. Please wait a moment.');
        } else {
            throw new Error(`Server error (${response.status}). Please try again.`);
        }
    }
    
    const raw = await response.json();
    return transformWeatherData(raw);
}

async function fetchForecastData(city) {
    const url = `${FORECAST_BASE}?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Forecast not available');
    }
    
    return await response.json();
}

function transformWeatherData(raw) {
    return {
        city: raw.name,
        country: raw.sys?.country || '',
        temperature: Math.round(raw.main.temp),
        feelsLike: Math.round(raw.main.feels_like),
        tempMin: Math.round(raw.main.temp_min),
        tempMax: Math.round(raw.main.temp_max),
        humidity: raw.main.humidity,
        pressure: raw.main.pressure,
        condition: raw.weather[0]?.main || 'Unknown',
        description: raw.weather[0]?.description || 'No description',
        windSpeed: raw.wind?.speed || 0,
        visibility: raw.visibility ? Math.round(raw.visibility / 1000) : 0,
        sunrise: raw.sys?.sunrise || 0,
        sunset: raw.sys?.sunset || 0,
        icon: raw.weather[0]?.icon || '',
        iconUrl: raw.weather[0]?.icon 
            ? `https://openweathermap.org/img/wn/${raw.weather[0].icon}@4x.png` 
            : '',
        timestamp: Date.now()
    };
}

// ============================================================
// ===== REVERSE GEOCODING =====
// ============================================================
async function reverseGeocode(lat, lon) {
    const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    return data && data.length > 0 ? data[0].name : null;
}

// ============================================================
// ===== UI RENDERING =====
// ============================================================
function renderWeather(data, fromCache = false) {
    if (!data) return;
    
    const unit = state.isCelsius ? '°C' : '°F';
    const temp = state.isCelsius ? data.temperature : celsiusToFahrenheit(data.temperature);
    const feels = state.isCelsius ? data.feelsLike : celsiusToFahrenheit(data.feelsLike);
    const max = state.isCelsius ? data.tempMax : celsiusToFahrenheit(data.tempMax);
    const min = state.isCelsius ? data.tempMin : celsiusToFahrenheit(data.tempMin);
    
    DOM.cityName.textContent = data.country ? `${data.city}, ${data.country}` : data.city;
    DOM.weatherDate.textContent = new Date(data.timestamp).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    DOM.temperature.textContent = `${temp}${unit}`;
    DOM.weatherCondition.textContent = data.description || data.condition;
    DOM.weatherCondition.style.textTransform = 'capitalize';
    
    if (data.iconUrl) {
        DOM.weatherIcon.src = data.iconUrl;
        DOM.weatherIcon.alt = data.condition || 'Weather icon';
        DOM.weatherIcon.style.display = 'block';
    }
    
    DOM.humidity.textContent = `${data.humidity}%`;
    DOM.windSpeed.textContent = `${Math.round(data.windSpeed * 3.6)} km/h`;
    DOM.pressure.textContent = `${data.pressure} hPa`;
    DOM.visibility.textContent = `${data.visibility} km`;
    DOM.feelsLike.textContent = `${feels}${unit}`;
    DOM.tempMax.textContent = `${max}${unit}`;
    DOM.tempMin.textContent = `${min}${unit}`;
    
    if (data.sunrise) {
        DOM.sunrise.textContent = new Date(data.sunrise * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (data.sunset) {
        DOM.sunset.textContent = new Date(data.sunset * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    DOM.uvIndex.textContent = getUVIndex(data);
    DOM.airQuality.textContent = getAirQuality(data);
    
    // Update weather theme
    updateWeatherTheme(data.condition);
    
    state.data = data;
    state.city = data.city;
}

function renderForecast(forecastData) {
    if (!forecastData || !forecastData.list) {
        DOM.forecastSection.style.display = 'none';
        return;
    }
    
    const grid = DOM.forecastGrid;
    grid.innerHTML = '';
    
    // Get daily forecasts (one per day)
    const daily = [];
    const seen = new Set();
    
    for (const item of forecastData.list) {
        const day = new Date(item.dt * 1000).toDateString();
        if (!seen.has(day) && daily.length < 5) {
            seen.add(day);
            daily.push(item);
        }
    }
    
    if (daily.length === 0) {
        DOM.forecastSection.style.display = 'none';
        return;
    }
    
    daily.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = index === 0 ? 'Today' : dayNames[date.getDay()];
        
        const temp = state.isCelsius ? Math.round(item.main.temp) : Math.round(celsiusToFahrenheit(item.main.temp));
        const tempMin = state.isCelsius ? Math.round(item.main.temp_min) : Math.round(celsiusToFahrenheit(item.main.temp_min));
        const unit = state.isCelsius ? 'C' : 'F';
        const icon = item.weather[0]?.icon || '01d';
        const condition = item.weather[0]?.main || 'Clear';
        
        const el = document.createElement('div');
        el.className = 'forecast-item';
        el.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${condition}" loading="lazy" />
            <div class="forecast-temp">${temp}°${unit}</div>
            <div class="forecast-temp-min">${tempMin}°${unit}</div>
            <div class="forecast-condition">${condition}</div>
        `;
        grid.appendChild(el);
    });
    
    DOM.forecastSection.style.display = 'block';
}

function getUVIndex(data) {
    const condition = data.condition?.toLowerCase() || 'clear';
    const hour = new Date().getHours();
    if (hour < 6 || hour > 18) return '0 (Night)';
    
    const map = {
        'clear': '7 (High)',
        'sunny': '8 (Very High)',
        'clouds': '4 (Moderate)',
        'rain': '2 (Low)',
        'drizzle': '3 (Low)',
        'snow': '2 (Low)',
        'thunderstorm': '1 (Low)',
        'mist': '3 (Low)',
        'fog': '2 (Low)'
    };
    for (const [key, val] of Object.entries(map)) {
        if (condition.includes(key)) return val;
    }
    return '5 (Moderate)';
}

function getAirQuality(data) {
    const condition = data.condition?.toLowerCase() || 'clear';
    const wind = data.windSpeed || 0;
    if (wind > 8) return 'Good';
    if (wind > 5) return 'Moderate';
    
    const map = {
        'clear': 'Good',
        'sunny': 'Good',
        'clouds': 'Moderate',
        'rain': 'Good',
        'drizzle': 'Good',
        'snow': 'Good',
        'thunderstorm': 'Moderate',
        'mist': 'Poor',
        'fog': 'Poor',
        'haze': 'Unhealthy',
        'smoke': 'Unhealthy'
    };
    for (const [key, val] of Object.entries(map)) {
        if (condition.includes(key)) return val;
    }
    return 'Moderate';
}

function updateWeatherTheme(condition) {
    document.body.classList.remove(
        'weather-clear', 'weather-rain', 'weather-clouds',
        'weather-snow', 'weather-thunderstorm', 'weather-mist'
    );
    
    const map = {
        'Clear': 'weather-clear',
        'Sunny': 'weather-clear',
        'Rain': 'weather-rain',
        'Drizzle': 'weather-rain',
        'Clouds': 'weather-clouds',
        'Snow': 'weather-snow',
        'Thunderstorm': 'weather-thunderstorm',
        'Mist': 'weather-mist',
        'Fog': 'weather-mist',
        'Haze': 'weather-mist',
        'Smoke': 'weather-mist'
    };
    
    let cls = 'weather-clear';
    for (const [key, val] of Object.entries(map)) {
        if (condition && condition.toLowerCase().includes(key.toLowerCase())) {
            cls = val;
            break;
        }
    }
    document.body.classList.add(cls);
}

function celsiusToFahrenheit(c) {
    return Math.round((c * 9/5) + 32);
}

// ============================================================
// ===== LOADING / ERROR STATES =====
// ============================================================
function showLoading(show) {
    if (show) {
        DOM.loadingSkeleton.classList.remove('hidden');
        DOM.weatherCard.style.display = 'none';
        DOM.errorState.classList.add('hidden');
    } else {
        DOM.loadingSkeleton.classList.add('hidden');
        DOM.weatherCard.style.display = 'block';
    }
}

function showFullPageError(title, message) {
    DOM.errorState.classList.remove('hidden');
    DOM.errorTitle.textContent = title || 'Something went wrong';
    DOM.errorMessage.textContent = message || 'Please try again later.';
    DOM.weatherCard.style.display = 'none';
    DOM.loadingSkeleton.classList.add('hidden');
}

function hideFullPageError() {
    DOM.errorState.classList.add('hidden');
}

// ============================================================
// ===== MAIN LOAD FUNCTION =====
// ============================================================
async function loadWeather(city, forceRefresh = false) {
    if (state.isLoading) return;
    state.isLoading = true;
    
    // Hide previous search error
    hideSearchError();
    
    // Show loading only if no data showing yet
    if (!DOM.weatherCard.style.display || DOM.weatherCard.style.display === 'none') {
        showLoading(true);
    }
    hideFullPageError();
    
    try {
        // ===== STEP 1: Check Cache =====
        if (!forceRefresh) {
            const cached = getCachedData(city);
            if (cached && cached.weather) {
                console.log(`📦 Cache hit: ${city}`);
                
                // Render weather from cache
                renderWeather(cached.weather, true);
                DOM.weatherCard.style.display = 'block';
                showLoading(false);
                
                // ✅ Render forecast from cache if available
                if (cached.forecast) {
                    console.log(`📦 Forecast from cache: ${city}`);
                    renderForecast(cached.forecast);
                } else {
                    DOM.forecastSection.style.display = 'none';
                }
                
                state.city = city;
                state.data = cached.weather;
                state.lastSearchedCity = city;
                state.isLoading = false;
                
                // ✅ NO API CALL - Sirf cache se dikhaya
                return;
            } else {
                console.log(` No cache or expired: ${city}`);
            }
        }
        
        // ===== STEP 2: Cache nahi mila → API Call =====
        console.log(`🌐 API call: ${city}`);
        
        // Show loading
        showLoading(true);
        
        // Fetch weather
        const weatherData = await fetchWeather(city);
        
        // Fetch forecast
        let forecastData = null;
        try {
            forecastData = await fetchForecastData(city);
        } catch (e) {
            console.warn('Forecast not available:', e.message);
            DOM.forecastSection.style.display = 'none';
        }
        
        // Cache both weather and forecast
        cacheWeatherData(city, weatherData, forecastData);
        
        // Render weather
        renderWeather(weatherData, false);
        DOM.weatherCard.style.display = 'block';
        showLoading(false);
        
        // Render forecast
        if (forecastData && forecastData.list) {
            renderForecast(forecastData);
        }
        
        // Update state
        state.city = city;
        state.data = weatherData;
        state.lastSearchedCity = city;
        localStorage.setItem('weather-cast-last-city', city);
        
        // Show toast
        showToast(`🌤️ Weather loaded for ${weatherData.city}`, 'success', 1500);
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        
        // ✅ Search Error - Show below search bar
        showSearchError(error.message || 'City not found. Please try again.');
        
        // ✅ Toast notification
        showToast(error.message || 'Failed to fetch weather data', 'error');
        
        // Hide loading
        showLoading(false);
        
        // ✅ Full page error ONLY if no data exists
        if (!state.data) {
            showFullPageError('City Not Found', error.message || 'Please check the spelling and try again.');
        }
        
    } finally {
        state.isLoading = false;
    }
}

// ============================================================
// ===== GEOLOCATION =====
// ============================================================
function getLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'error');
        return;
    }
    
    DOM.geoBtn.disabled = true;
    DOM.geoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            DOM.geoBtn.disabled = false;
            DOM.geoBtn.innerHTML = '<i class="fas fa-location-dot"></i> Use My Location';
            
            const { latitude, longitude } = position.coords;
            try {
                const city = await reverseGeocode(latitude, longitude);
                if (city) {
                    DOM.cityInput.value = city;
                    await loadWeather(city);
                    showToast(` Location set to ${city}`, 'success', 1500);
                } else {
                    showToast('Could not determine your location.', 'warning');
                }
            } catch (e) {
                showToast('Could not determine your location.', 'error');
            }
        },
        (error) => {
            DOM.geoBtn.disabled = false;
            DOM.geoBtn.innerHTML = '<i class="fas fa-location-dot"></i> Use My Location';
            
            let msg = 'Unable to access your location. ';
            if (error.code === error.PERMISSION_DENIED) {
                msg += 'Please allow location access.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                msg += 'Location unavailable.';
            } else {
                msg += 'Please try again.';
            }
            showToast(msg, 'warning');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

// ============================================================
// ===== EVENT LISTENERS =====
// ============================================================
function init() {
    // Load preferences
    const savedTheme = localStorage.getItem('weather-cast-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        state.isDark = true;
    }
    
    const savedUnit = localStorage.getItem('weather-cast-unit');
    if (savedUnit === 'fahrenheit') {
        state.isCelsius = false;
        DOM.unitLabel.textContent = '°F';
    }
    
    // ===== Page Load Strategy =====
    const lastCity = localStorage.getItem('weather-cast-last-city') || 'London';
    DOM.cityInput.value = lastCity;
    
    // Check cache
    const cached = getCachedData(lastCity);
    
    if (cached && cached.weather) {
        // ✅ Cache valid → Show from cache, NO API call
        console.log(`📦 Page load: Cache hit for ${lastCity}`);
        renderWeather(cached.weather, true);
        DOM.weatherCard.style.display = 'block';
        showLoading(false);
        
        // ✅ Show forecast from cache
        if (cached.forecast) {
            renderForecast(cached.forecast);
        } else {
            DOM.forecastSection.style.display = 'none';
        }
        
        state.city = lastCity;
        state.data = cached.weather;
        state.lastSearchedCity = lastCity;
    } else {
        //  No cache → API call
        console.log(`🌐 Page load: No cache for ${lastCity}, calling API`);
        showLoading(true);
        loadWeather(lastCity);
    }
    
    // Try geolocation silently
    if (navigator.geolocation && !localStorage.getItem('weather-cast-last-city')) {
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const city = await reverseGeocode(position.coords.latitude, position.coords.longitude);
                        if (city) {
                            DOM.cityInput.value = city;
                            localStorage.setItem('weather-cast-last-city', city);
                            if (!state.data) {
                                loadWeather(city);
                            }
                        }
                    } catch (e) {}
                },
                () => {},
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
        }, 1000);
    }
    
    // ===== EVENT BINDINGS =====
    
    // Search
    DOM.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = DOM.cityInput.value.trim();
        if (!city) {
            showToast('Please enter a city name.', 'warning');
            return;
        }
        localStorage.setItem('weather-cast-last-city', city);
        loadWeather(city);
    });
    
    // Geolocation
    DOM.geoBtn.addEventListener('click', getLocation);
    
    // Refresh - Check cache first
    DOM.refreshBtn.addEventListener('click', () => {
        if (state.city) {
            const cached = getCachedData(state.city);
            if (cached && cached.weather) {
                // ✅ Cache valid → Refresh from cache
                console.log(`🔄 Refresh: Cache valid for ${state.city}`);
                renderWeather(cached.weather, true);
                if (cached.forecast) {
                    renderForecast(cached.forecast);
                }
                showToast('📦 Refreshed from cache', 'info', 1500);
            } else {
                //  Cache expired → API call
                console.log(`🔄 Refresh: Cache expired for ${state.city}, calling API`);
                loadWeather(state.city, true);
                showToast('🔄 Refreshing from API...', 'info', 1000);
            }
        }
    });
    
    // Theme
    DOM.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        state.isDark = document.body.classList.contains('dark-theme');
        DOM.themeToggle.innerHTML = state.isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('weather-cast-theme', state.isDark ? 'dark' : 'light');
        showToast(state.isDark ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️', 'info', 1000);
    });
    
    // Unit
    DOM.unitToggle.addEventListener('click', () => {
        state.isCelsius = !state.isCelsius;
        DOM.unitLabel.textContent = state.isCelsius ? '°C' : '°F';
        localStorage.setItem('weather-cast-unit', state.isCelsius ? 'celsius' : 'fahrenheit');
        
        if (state.data) {
            renderWeather(state.data, false);
            // Re-render forecast with new unit
            const cached = getCachedData(state.city);
            if (cached && cached.forecast) {
                renderForecast(cached.forecast);
            }
        }
        showToast(`Unit changed to ${state.isCelsius ? '°C' : '°F'}`, 'info', 1000);
    });
    
    // Hamburger
    DOM.hamburger.addEventListener('click', () => {
        DOM.hamburger.classList.toggle('active');
        DOM.navLinks.classList.toggle('open');
    });
    
    // Nav links
    DOM.navLinksAll.forEach(link => {
        link.addEventListener('click', (e) => {
            const text = link.textContent.trim();
            if (text !== 'Dashboard') {
                e.preventDefault();
                showToast(`"${text}" feature coming soon! 🚀`, 'info');
            }
            DOM.hamburger.classList.remove('active');
            DOM.navLinks.classList.remove('open');
        });
    });
    
    // Footer links
    DOM.footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = link.querySelector('i');
            let platform = 'Social Media';
            if (icon) {
                const cls = icon.className;
                if (cls.includes('github')) platform = 'GitHub';
                else if (cls.includes('twitter')) platform = 'Twitter';
                else if (cls.includes('linkedin')) platform = 'LinkedIn';
                else if (cls.includes('youtube')) platform = 'YouTube';
            }
            showToast(`📱 ${platform} links are not added yet. Coming soon!`, 'info', 2000);
        });
    });
    
    // Keyboard shortcut
    DOM.cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            DOM.searchForm.dispatchEvent(new Event('submit'));
        }
    });
}

// ============================================================
// ===== START APP =====
// ============================================================
document.addEventListener('DOMContentLoaded', init);