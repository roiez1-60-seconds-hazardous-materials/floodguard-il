// FEATURE 5: RADAR ANIMATION — supports both RainViewer & IMS
// ============================================================
var animFrames = []; // unified: {time (epoch ms), layer (L.tileLayer or L.imageOverlay)}
var animIdx = 0;
var animTimer = null;
var animPlaying = false;
var animSource = null; // 'rainviewer' or 'ims'

function loadAnimation() {
  if(activeSrc === 'ims') {
    loadIMSAnimation();
  } else {
    loadRainViewerAnimation();
  }
}

// --- RainViewer animation ---
function loadRainViewerAnimation() {
  setStatus('🎬 טוען אנימציה (RainViewer)...');
  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if(!data.radar || !data.radar.past) return;
      var host = data.host || 'https://tilecache.rainviewer.com';
      var frames = data.radar.past.slice(-12);
      console.log('🎬 [RV Animation] ' + frames.length + ' פריימים');
      
      clearAnimLayers();
      animSource = 'rainviewer';
      
      frames.forEach(function(frame) {
        var url = host + frame.path + '/256/{z}/{x}/{y}/2/1_1.png';
        var layer = L.tileLayer(url, {opacity: 0, zIndex: 400, maxZoom: 7}).addTo(map);
        animFrames.push({time: frame.time * 1000, layer: layer});
      });
      
      initAnimBar();
    })
    .catch(function(e) {
      setStatus('⚠️ שגיאה בטעינת אנימציה: ' + e.message);
    });
}

// --- IMS animation: load 12 frames (1 hour back, every 5 min) ---
function loadIMSAnimation() {
  setStatus('🎬 טוען אנימציה (שמ"ט)...');
  clearAnimLayers();
  animSource = 'ims';
  
  var framesToLoad = 12;
  var loaded = 0;
  var succeeded = 0;
  
  for(var i = framesToLoad - 1; i >= 0; i--) {
    (function(offset) {
      var now = new Date();
      // Start from the most recent known good time and go back
      now.setMinutes(Math.floor(now.getMinutes()/5)*5 - offset*5, 0, 0);
      var y = now.getUTCFullYear();
      var mo = String(now.getUTCMonth()+1).padStart(2,'0');
      var d = String(now.getUTCDate()).padStart(2,'0');
      var h = String(now.getUTCHours()).padStart(2,'0');
      var mi = String(now.getUTCMinutes()).padStart(2,'0');
      var ts = y+mo+d+h+mi;
      // Use the working pattern if known, otherwise try pattern 0
      var patIdx = window._imsWorkingPattern || 0;
      var imsUrl = IMS_URL_PATTERNS[patIdx](ts);
      var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(imsUrl);
      
      // Try to load this frame, with fallback to other patterns
      tryAnimIMSPattern(ts, patIdx, now, 0);
      
      function tryAnimIMSPattern(ts, pIdx, dateObj, tried) {
        if(tried >= IMS_URL_PATTERNS.length) {
          loaded++;
          if(loaded === framesToLoad) finishIMSAnimation();
          return;
        }
        var actualIdx = (pIdx + tried) % IMS_URL_PATTERNS.length;
        var url = IMS_URL_PATTERNS[actualIdx](ts);
        var pUrl = PROXY_BASE + '?url=' + encodeURIComponent(url);
        
        var img2 = new Image();
        img2.crossOrigin = 'anonymous';
        img2.onload = function() {
          if(img2.width < 10) { tryAnimIMSPattern(ts, pIdx, dateObj, tried+1); return; }
          var layer = L.imageOverlay(img2.src, IMS_BOUNDS, {opacity: 0, zIndex: 400}).addTo(map);
          animFrames.push({time: dateObj.getTime(), layer: layer, offset: offset});
          succeeded++;
          loaded++;
          if(loaded === framesToLoad) finishIMSAnimation();
        };
        img2.onerror = function() {
          tryAnimIMSPattern(ts, pIdx, dateObj, tried+1);
        };
        img2.src = pUrl;
      }
    })(i);
  }
}

function finishIMSAnimation() {
  // Sort by time
  animFrames.sort(function(a, b) { return a.time - b.time; });
  console.log('🎬 [IMS Animation] נטענו ' + animFrames.length + ' פריימים');
  
  if(animFrames.length < 2) {
    setStatus('⚠️ לא נמצאו מספיק פריימים לאנימציה');
    return;
  }
  initAnimBar();
}

// --- Shared animation controls ---
function initAnimBar() {
  document.getElementById('animBar').style.display = 'flex';
  document.getElementById('animSlider').max = animFrames.length - 1;
  document.getElementById('animSlider').value = animFrames.length - 1;
  animIdx = animFrames.length - 1;
  showAnimFrame(animIdx);
  var srcName = animSource === 'ims' ? 'שמ"ט' : 'RainViewer';
  setStatus('🎬 אנימציה מוכנה — ' + animFrames.length + ' פריימים (' + srcName + ')');
}

function clearAnimLayers() {
  if(animTimer) { clearInterval(animTimer); animTimer = null; }
  animPlaying = false;
  animFrames.forEach(function(f) { if(f.layer) map.removeLayer(f.layer); });
  animFrames = [];
}

function showAnimFrame(idx) {
  if(idx < 0 || idx >= animFrames.length) return;
  
  // Hide all anim layers, show selected
  animFrames.forEach(function(f, i) {
    if(f.layer.setOpacity) f.layer.setOpacity(i === idx ? 0.65 : 0);
  });
  
  // Hide main live layers while animating
  if(rvTileLayer) rvTileLayer.setOpacity(0);
  if(imsOverlay) imsOverlay.setOpacity(0);
  
  animIdx = idx;
  document.getElementById('animSlider').value = idx;
  var t = new Date(animFrames[idx].time).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('animTime').textContent = t;
}

function animToggle() {
  if(animFrames.length === 0) {
    loadAnimation();
    return;
  }
  if(animPlaying) {
    clearInterval(animTimer);
    animTimer = null;
    animPlaying = false;
    document.getElementById('animPlayBtn').textContent = '▶️';
  } else {
    animPlaying = true;
    document.getElementById('animPlayBtn').textContent = '⏸️';
    animTimer = setInterval(function() {
      animIdx = (animIdx + 1) % animFrames.length;
      showAnimFrame(animIdx);
    }, 700);
  }
}

function animNext() {
  if(animFrames.length === 0) return;
  showAnimFrame((animIdx + 1) % animFrames.length);
}

function animPrev() {
  if(animFrames.length === 0) return;
  showAnimFrame((animIdx - 1 + animFrames.length) % animFrames.length);
}

function animSeek(val) {
  showAnimFrame(parseInt(val));
}

function animClose() {
  clearAnimLayers();
  document.getElementById('animBar').style.display = 'none';
  document.getElementById('animPlayBtn').textContent = '▶️';
  // Restore live layers
  if(rvTileLayer && activeSrc === 'rainviewer') rvTileLayer.setOpacity(0.65);
  if(imsOverlay && activeSrc === 'ims') imsOverlay.setOpacity(0.6);
}

// Hook: auto-load animation + bulk nowcast when radar source is selected
var _origLoadRV = loadRainViewer;
loadRainViewer = function() {
  _origLoadRV();
  setTimeout(function() { loadRainViewerAnimation(); }, 2500);
  // Also load all past frames for instant nowcast
  setTimeout(function() { loadRVPastFramesForNowcast(); }, 3500);
};

var _origLoadIMS = loadIMSRadar;
loadIMSRadar = function() {
  _origLoadIMS();
  setTimeout(function() { loadIMSAnimation(); }, 3000);
};

// ============================================================
// FEATURE 7: DARK MODE — auto by time or manual toggle
// ============================================================
function isDarkHours() {
  var h = new Date().getHours();
  return h >= 20 || h < 6;
}

function applyDarkMode(dark) {
  if(dark) {
    document.body.classList.add('dark');
    document.getElementById('btnDark').textContent = '☀️';
    // Switch to dark Google Maps tiles
    map.eachLayer(function(l) {
      if(l._url && l._url.includes('google.com/vt/lyrs=m')) {
        l.setUrl('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=he&style=feature:all|element:geometry|color:0x212121&style=feature:all|element:labels.text.fill|color:0x757575');
      }
    });
  } else {
    document.body.classList.remove('dark');
    document.getElementById('btnDark').textContent = '🌙';
    map.eachLayer(function(l) {
      if(l._url && l._url.includes('google.com/vt/lyrs=m')) {
        l.setUrl('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=he');
      }
    });
  }
}

var darkModeManual = null; // null = auto, true/false = manual

function toggleDarkMode() {
  if(darkModeManual === null) {
    // First click: toggle opposite of current
    darkModeManual = !document.body.classList.contains('dark');
  } else {
    darkModeManual = !darkModeManual;
  }
  applyDarkMode(darkModeManual);
}

// Auto dark mode on load
if(isDarkHours() && darkModeManual === null) {
  applyDarkMode(true);
}

// ============================================================
// FEATURE 9: SHARE ALERT — WhatsApp/clipboard sharing
// ============================================================
function shareAlert(name) {
  var a = alerts[name];
  if(!a) return;
  
  var emoji = a.lv === 'extreme' ? '🚨' : a.lv === 'heavy' ? '⚠️' : '🌧️';
  var text = emoji + ' התראת הצפה — ' + name + '\n';
  text += a.he + ' | ' + a.mm + ' מ"מ/שעה\n';
  text += '🕐 ' + new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}) + '\n';
  text += '🔗 FloodGuard IL';
  
  // Try Web Share API first (mobile)
  if(navigator.share) {
    navigator.share({
      title: 'FloodGuard IL — ' + name,
      text: text
    }).catch(function(){});
    return;
  }
  
  // Fallback: WhatsApp link
  var waUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(waUrl, '_blank');
}

function copyAlert(name) {
  var a = alerts[name];
  if(!a) return;
  var text = '⚠️ ' + name + ': ' + a.he + ' — ' + a.mm + ' מ"מ/שעה';
  navigator.clipboard.writeText(text).then(function() {
    setStatus('📋 הועתק ללוח');
  });
}

// ============================================================
// FEATURE 6: DASHBOARD — detailed stats, graphs, history
// ============================================================
var analysisHistory = []; // {time, alerts:{moderate,heavy,extreme}, totalMm, settlements:[]}

function recordAnalysis(cM, cH, cE) {
  var now = new Date();
  var entry = {
    time: now.getTime(),
    timeStr: now.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}),
    moderate: cM, heavy: cH, extreme: cE,
    total: cM + cH + cE,
    settlements: []
  };
  // Capture top settlements
  S.forEach(function(s) {
    var a = alerts[s.n];
    if(a) entry.settlements.push({name:s.n, mm:parseFloat(a.mm), lv:a.lv});
  });
  entry.settlements.sort(function(a,b){return b.mm - a.mm});
  analysisHistory.push(entry);
  // Keep max 50 entries
  if(analysisHistory.length > 50) analysisHistory.shift();
}

function showDashboard() {
  var dash = document.getElementById('dashPanel');
  if(!dash) return;
  
  var html = '';
  
  // Summary cards
  var totalAlerts = 0, maxMm = 0, topCity = '--';
  var currentAlerted = [];
  S.forEach(function(s) {
    var a = alerts[s.n];
    if(a) {
      currentAlerted.push({name:s.n, mm:parseFloat(a.mm), lv:a.lv});
      totalAlerts++;
      if(parseFloat(a.mm) > maxMm) { maxMm = parseFloat(a.mm); topCity = s.n; }
    }
  });
  currentAlerted.sort(function(a,b){return b.mm - a.mm});
  
  html += '<div class="dash-grid">';
  html += '<div class="dash-card"><div class="dash-val">' + totalAlerts + '</div><div class="dash-label">התראות פעילות</div></div>';
  html += '<div class="dash-card"><div class="dash-val">' + maxMm.toFixed(1) + '</div><div class="dash-label">מקס מ"מ/שעה</div></div>';
  html += '<div class="dash-card"><div class="dash-val" style="font-size:16px">' + topCity + '</div><div class="dash-label">יישוב קריטי</div></div>';
  html += '<div class="dash-card"><div class="dash-val">' + analysisHistory.length + '</div><div class="dash-label">סריקות</div></div>';
  html += '</div>';
  
  // Alert history timeline (sparkline-style)
  if(analysisHistory.length > 1) {
    html += '<div class="dash-section"><b>📊 היסטוריית התראות</b>';
    html += '<div class="dash-timeline">';
    var maxInHistory = 1;
    analysisHistory.forEach(function(e) { if(e.total > maxInHistory) maxInHistory = e.total; });
    
    analysisHistory.forEach(function(e, i) {
      var h = Math.max(4, (e.total / maxInHistory) * 50);
      var color = e.extreme > 0 ? '#dc2626' : e.heavy > 0 ? '#ef4444' : e.total > 0 ? '#f59e0b' : '#22c55e';
      html += '<div class="dash-bar" style="height:'+h+'px;background:'+color+'" title="'+e.timeStr+': '+e.total+' התראות"></div>';
    });
    html += '</div>';
    // Time labels
    html += '<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--tx2);margin-top:2px">';
    if(analysisHistory.length > 0) {
      html += '<span>' + analysisHistory[0].timeStr + '</span>';
      html += '<span>' + analysisHistory[analysisHistory.length-1].timeStr + '</span>';
    }
    html += '</div>';
    html += '</div>';
  }
  
  // Top 5 rainfall table
  if(currentAlerted.length > 0) {
    html += '<div class="dash-section"><b>🌧️ טבלת עוצמות</b>';
    html += '<table class="dash-table"><tr><th>יישוב</th><th>מ"מ/שעה</th><th>דרגה</th></tr>';
    currentAlerted.slice(0, 8).forEach(function(a) {
      var lvIcon = a.lv === 'extreme' ? '🔴' : a.lv === 'heavy' ? '🟠' : '🟡';
      html += '<tr><td>'+a.name+'</td><td><b>'+a.mm.toFixed(1)+'</b></td><td>'+lvIcon+'</td></tr>';
    });
    html += '</table></div>';
  }
  
  // Coverage map stats
  if(radarImageData) {
    var totalPx = radarImageData.width * radarImageData.height;
    var rainPx = 0;
    var d = radarImageData.data;
    for(var i = 0; i < d.length; i += 16) { // sample every 4th pixel
      if(!isBackground(d[i], d[i+1], d[i+2], d[i+3])) rainPx++;
    }
    rainPx *= 4; // approximate
    var coverPct = (rainPx / totalPx * 100).toFixed(1);
    html += '<div class="dash-section"><b>📡 נתוני מכ"מ</b>';
    html += '<div class="dash-info">רזולוציה: ' + radarImageData.width + '×' + radarImageData.height + ' | כיסוי גשם: ~' + coverPct + '%</div>';
    html += '<div class="dash-info">מקור: ' + (radarSource === 'ims' ? 'שמ"ט' : radarSource === 'rainviewer' ? 'RainViewer' : radarSource) + '</div>';
    html += '</div>';
  }
  
  // Sound toggle in dashboard
  html += '<div class="dash-section">';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<b>🔊 צלילי התראה</b>';
  html += '<button onclick="toggleSound()" class="dash-btn" id="dashSoundBtn">' + (soundEnabled ? '🔔 פעיל' : '🔕 מושתק') + '</button>';
  html += '<button onclick="testSound()" class="dash-btn">🔊 בדוק</button>';
  html += '</div></div>';
  
  dash.innerHTML = html;
}

// ============================================================
// FEATURE 8: MAP LAYERS — streams, flood zones, topography, satellite
// ============================================================
var mapLayers = {};
var layerControl = null;

function initMapLayers() {
  // Already have Google Maps — add satellite and terrain
  var googleHybrid = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=he', {
    subdomains: '0123', maxZoom: 20, attribution: '© Google'
  });
  
  var googleTerrain = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=he', {
    subdomains: '0123', maxZoom: 20, attribution: '© Google'
  });
  
  // Topography contours (OpenTopoMap) — full basemap replacement
  var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17, attribution: '© OpenTopoMap',
    subdomains: 'abc'
  });
  
  // Store references
  mapLayers.hybrid = googleHybrid;
  mapLayers.terrain = googleTerrain;
  mapLayers.topo = topoLayer;
}

// ============================================================
// REAL WATERWAYS — fetch from Overpass API (OpenStreetMap)
// ============================================================
var waterLayer = null;
var waterLoaded = false;

function loadWaterways() {
  if(waterLoaded && waterLayer) return waterLayer;
  
  setStatus('🌊 טוען נחלים ונהרות מ-OpenStreetMap...');
  
  // Overpass query: all waterways (rivers, streams, wadis) in Israel
  var query = '[out:json][timeout:30];(' +
    'way["waterway"~"river|stream|wadi"](29.4,34.0,33.4,36.0);' +
    ');out geom;';
  var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var lines = [];
      data.elements.forEach(function(el) {
        if(!el.geometry || el.geometry.length < 2) return;
        var latlngs = el.geometry.map(function(p) { return [p.lat, p.lon]; });
        var name = (el.tags && el.tags.name) ? el.tags.name : '';
        var nameHe = (el.tags && el.tags['name:he']) ? el.tags['name:he'] : name;
        var type = el.tags ? el.tags.waterway : '';
        
        // Style by type
        var weight = type === 'river' ? 3 : 2;
        var color = type === 'river' ? '#2563eb' : type === 'wadi' ? '#60a5fa' : '#3b82f6';
        
        var line = L.polyline(latlngs, {
          color: color, weight: weight, opacity: 0.7
        });
        if(nameHe) {
          line.bindPopup('<b>🌊 ' + nameHe + '</b><br><span style="font-size:11px">' + type + '</span>');
        }
        lines.push(line);
      });
      
      waterLayer = L.layerGroup(lines);
      waterLoaded = true;
      
      // If toggle was waiting, add to map now
      if(activeOverlays['wadis'] === 'loading') {
        waterLayer.addTo(map);
        activeOverlays['wadis'] = waterLayer;
      }
      
      setStatus('🌊 נטענו ' + lines.length + ' נחלים ונהרות');
      console.log('🌊 Loaded ' + lines.length + ' waterways from OSM');
    })
    .catch(function(e) {
      console.warn('🌊 Error loading waterways:', e);
      setStatus('⚠️ שגיאה בטעינת נחלים');
      if(activeOverlays['wadis'] === 'loading') {
        delete activeOverlays['wadis'];
        var btn = document.getElementById('btn_wadis');
        if(btn) btn.classList.remove('on');
      }
    });
}

// Toggle layer visibility
var activeOverlays = {};

function toggleLayer(layerName) {
  var btn = document.getElementById('btn_' + layerName);
  
  if(activeOverlays[layerName]) {
    // Remove
    if(activeOverlays[layerName] !== 'loading') {
      map.removeLayer(activeOverlays[layerName]);
    }
    delete activeOverlays[layerName];
    if(btn) btn.classList.remove('on');
    // Restore base map if we removed topo or satellite
    if(layerName === 'topo' || layerName === 'satellite') {
      restoreBaseMap();
    }
  } else {
    // Add
    var layer = null;
    if(btn) btn.classList.add('on');
    
    switch(layerName) {
      case 'wadis':
        if(waterLoaded && waterLayer) {
          layer = waterLayer;
        } else {
          activeOverlays['wadis'] = 'loading';
          loadWaterways();
          return;
        }
        break;
      case 'topo':
        // Replace base map with topo
        map.eachLayer(function(l) {
          if(l._url && l._url.includes('google.com/vt/lyrs=m')) map.removeLayer(l);
          if(l._url && l._url.includes('google.com/vt/lyrs=y')) map.removeLayer(l);
          if(l._url && l._url.includes('google.com/vt/lyrs=p')) map.removeLayer(l);
          if(l._url && l._url.includes('opentopomap.org')) map.removeLayer(l);
        });
        layer = mapLayers.topo;
        break;
      case 'satellite': 
        map.eachLayer(function(l) {
          if(l._url && l._url.includes('google.com/vt/lyrs=m')) map.removeLayer(l);
          if(l._url && l._url.includes('google.com/vt/lyrs=p')) map.removeLayer(l);
          if(l._url && l._url.includes('opentopomap.org')) map.removeLayer(l);
        });
        layer = mapLayers.hybrid;
        break;
    }
    if(layer) {
      layer.addTo(map);
      activeOverlays[layerName] = layer;
    }
  }
}

function restoreBaseMap() {
  // Check if Google Maps base is already there
  var hasBase = false;
  map.eachLayer(function(l) {
    if(l._url && l._url.includes('google.com/vt/lyrs=m')) hasBase = true;
  });
  if(!hasBase) {
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=he', {
      attribution:'© Google Maps', maxZoom:20, subdomains:'0123'
    }).addTo(map);
  }
}

// ========== Feature 10: Live Hydro Stations Data ==========
var hydroStations = null;
var hydroObs = null;
var hydroLastFetch = 0;
var HYDRO_CACHE_MS = 120000; // 2 min cache

function fetchHydroData() {
  var now = Date.now();
  if(hydroStations && (now - hydroLastFetch) < HYDRO_CACHE_MS) {
    return Promise.resolve({stations: hydroStations});
  }
  
  return fetch('/hydro_stations.json')
    .then(function(r){return r.json();})
    .then(function(data) {
      // data is array with one object: [{id: {name_he, lat, lon, threshold, ...}, ...}]
      hydroStations = Array.isArray(data) ? data[0] : data;
      hydroLastFetch = Date.now();
      console.log('💧 Hydro stations loaded:', Object.keys(hydroStations).length);
      return {stations: hydroStations};
    }).catch(function(e) {
      console.warn('💧 Hydro fetch error:', e);
      return null;
    });
}

function getHydroLevel(stationId, obs) {
  // obs format: [{"2026-02-02 10:00:00":{"49":[flow,level],...}}]
  if(!obs || !obs.length) return null;
  var latest = obs[0];
  var time = Object.keys(latest)[0];
  var readings = latest[time];
  if(!readings || !readings[stationId]) return null;
  return {time: time, flow: readings[stationId][0], level: readings[stationId][1]};
}

function getFlowStatus(flow, thresholds) {
  // thresholds: [weak, medium, strong, veryStrong, extreme, catastrophic]
  if(!thresholds || !flow) return {text: 'ללא זרימה', color: '#666', icon: '⚪'};
  if(flow < 0.01) return {text: 'ללא זרימה', color: '#666', icon: '⚪'};
  if(flow < thresholds[0]) return {text: 'זרימה חלשה', color: '#4ade80', icon: '🟢'};
  if(flow < thresholds[1]) return {text: 'זרימה בינונית', color: '#facc15', icon: '🟡'};
  if(flow < thresholds[2]) return {text: 'זרימה חזקה', color: '#fb923c', icon: '🟠'};
  if(flow < thresholds[3]) return {text: 'זרימה חזקה מאוד', color: '#ef4444', icon: '🔴'};
  if(flow < thresholds[4]) return {text: 'זרימה קיצונית', color: '#dc2626', icon: '🔴'};
  return {text: 'שיטפון קיצוני!', color: '#7f1d1d', icon: '🟣'};
}

function buildStationPopup(station, stationId) {
  var th = station.threshold || [];
  var html = '<div style="direction:rtl;min-width:200px;font-family:Arial,sans-serif">';
  html += '<div style="font-weight:bold;font-size:14px;margin-bottom:6px">💧 ' + station.name_he + '</div>';
  html += '<div style="font-size:11px;color:#666;margin-bottom:6px">' + (station.name_en || '') + '</div>';
  
  // Station info
  html += '<table style="font-size:12px;width:100%;border-collapse:collapse">';
  html += '<tr><td style="padding:2px 0">📍 מיקום:</td><td>' + station.lat.toFixed(4) + ', ' + station.lon.toFixed(4) + '</td></tr>';
  
  // Threshold table
  if(th.length >= 6) {
    html += '</table>';
    html += '<div style="margin-top:8px;font-weight:bold;font-size:12px">סף ספיקות (מ״ק/שנייה):</div>';
    html += '<table style="font-size:11px;width:100%;border-collapse:collapse;margin-top:4px">';
    html += '<tr style="background:#f0fdf4"><td style="padding:2px 4px">🟢 חלשה</td><td>&lt; ' + th[0] + '</td></tr>';
    html += '<tr style="background:#fefce8"><td style="padding:2px 4px">🟡 בינונית</td><td>' + th[0] + ' - ' + th[1] + '</td></tr>';
    html += '<tr style="background:#fff7ed"><td style="padding:2px 4px">🟠 חזקה</td><td>' + th[1] + ' - ' + th[2] + '</td></tr>';
    html += '<tr style="background:#fef2f2"><td style="padding:2px 4px">🔴 חזקה מאוד</td><td>' + th[2] + ' - ' + th[3] + '</td></tr>';
    html += '<tr style="background:#fef2f2"><td style="padding:2px 4px">🟣 קיצונית</td><td>&gt; ' + th[4] + '</td></tr>';
  }
  html += '</table>';
  
  // Link to hydro site
  html += '<div style="margin-top:8px;text-align:center">';
  html += '<a href="https://hydro.water.gov.il/index.php/?page=hydro_obs&lang=he#map" target="_blank" ';
  html += 'style="display:inline-block;background:#2563eb;color:white;padding:4px 12px;border-radius:4px;text-decoration:none;font-size:12px">';
  html += '🌊 צפייה בנתונים חיים</a></div>';
  
  html += '<div style="margin-top:4px;font-size:10px;color:#aaa;text-align:center">תחנה #' + stationId + ' | השירות ההידרולוגי</div>';
  html += '</div>';
  return html;
}

// Add hydro station markers to map
var hydroMarkersLayer = null;

function showHydroStations() {
  if(hydroMarkersLayer) {
    map.removeLayer(hydroMarkersLayer);
    hydroMarkersLayer = null;
  }
  
  fetchHydroData().then(function(data) {
    if(!data) { setStatus('⚠️ שגיאה בטעינת נתוני תחנות'); return; }
    
    var markers = [];
    var stations = data.stations;
    
    Object.keys(stations).forEach(function(id) {
      var s = stations[id];
      if(!s.lat || !s.lon) return;
      
      var icon = L.divIcon({
        html: '<div style="font-size:14px;text-shadow:1px 1px 2px white">💧</div>',
        className: 'hydro-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      
      var marker = L.marker([s.lat, s.lon], {icon: icon});
      marker.bindPopup(function() {
        return buildStationPopup(s, id);
      }, {maxWidth: 280});
      markers.push(marker);
    });
    
    hydroMarkersLayer = L.layerGroup(markers);
    hydroMarkersLayer.addTo(map);
    activeOverlays['hydro'] = hydroMarkersLayer;
    
    setStatus('💧 ' + markers.length + ' תחנות הידרולוגיות על המפה');
  });
}

function toggleHydroStations() {
  if(activeOverlays['hydro']) {
    map.removeLayer(activeOverlays['hydro']);
    delete activeOverlays['hydro'];
    hydroMarkersLayer = null;
    var btn = document.getElementById('btn_hydro');
    if(btn) btn.classList.remove('on');
  } else {
    var btn = document.getElementById('btn_hydro');
    if(btn) btn.classList.add('on');
    showHydroStations();
  }
}

// Init layers
initMapLayers();







