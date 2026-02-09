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
  // Base layers
  var baseMaps = {};
  
  // Already have Google Maps — add satellite and terrain
  var googleSatellite = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=he', {
    subdomains: '0123', maxZoom: 20, attribution: '© Google'
  });
  
  var googleHybrid = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=he', {
    subdomains: '0123', maxZoom: 20, attribution: '© Google'
  });
  
  var googleTerrain = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=he', {
    subdomains: '0123', maxZoom: 20, attribution: '© Google'
  });
  
  // Overlay layers
  
  // Streams / waterways from OpenStreetMap
  var streamsLayer = L.tileLayer('https://tile.waymarkedtrails.org/water/{z}/{x}/{y}.png', {
    maxZoom: 18, opacity: 0.6, attribution: '© waymarkedtrails.org'
  });
  
  // Topography contours (OpenTopoMap)
  var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17, opacity: 0.4, attribution: '© OpenTopoMap',
    subdomains: 'abc'
  });
  
  // Store references
  mapLayers.satellite = googleSatellite;
  mapLayers.hybrid = googleHybrid;
  mapLayers.terrain = googleTerrain;
  mapLayers.streams = streamsLayer;
  mapLayers.topo = topoLayer;
  
  // Draw known flood-prone wadis/streams as polylines
  drawFloodZones();
}

// Known flood-prone wadis and streams in Israel
var floodZoneLayer = null;

function drawFloodZones() {
  var wadis = [
    // Nahal Ayalon (תל אביב area)
    {name:'נחל איילון', color:'#3b82f6', points:[[32.12,34.81],[32.10,34.80],[32.08,34.79],[32.05,34.78],[32.02,34.77],[31.99,34.76]]},
    // Nahal Alexander (נתניה)
    {name:'נחל אלכסנדר', color:'#3b82f6', points:[[32.38,34.88],[32.36,34.87],[32.34,34.86],[32.33,34.85]]},
    // Nahal Kishon (חיפה)
    {name:'נחל קישון', color:'#3b82f6', points:[[32.82,35.08],[32.80,35.04],[32.79,35.00],[32.78,34.97],[32.79,34.96]]},
    // Nahal Sorek (ירושלים area)
    {name:'נחל שורק', color:'#2563eb', points:[[31.77,35.20],[31.75,35.12],[31.73,35.05],[31.71,34.95],[31.70,34.85],[31.69,34.75]]},
    // Nahal Lachish (אשדוד)
    {name:'נחל לכיש', color:'#2563eb', points:[[31.61,34.88],[31.64,34.84],[31.68,34.80],[31.72,34.76],[31.78,34.68]]},
    // Nahal Beer Sheva
    {name:'נחל באר שבע', color:'#60a5fa', points:[[31.30,34.90],[31.28,34.85],[31.26,34.80],[31.24,34.78]]},
    // Nahal HaYarkon (תל אביב)
    {name:'נחל הירקון', color:'#3b82f6', points:[[32.10,34.89],[32.09,34.87],[32.09,34.85],[32.09,34.82],[32.09,34.80],[32.09,34.78]]},
    // Nahal Hadera
    {name:'נחל חדרה', color:'#3b82f6', points:[[32.46,34.95],[32.45,34.93],[32.44,34.91],[32.44,34.89]]},
    // Nahal Poleg (נתניה)
    {name:'נחל פולג', color:'#3b82f6', points:[[32.31,34.88],[32.30,34.87],[32.29,34.86],[32.29,34.85]]},
    // Nahal Tzin (נגב)
    {name:'נחל צין', color:'#93c5fd', points:[[30.85,35.20],[30.82,35.10],[30.80,35.00],[30.78,34.90],[30.76,34.80]]},
  ];
  
  var lines = [];
  wadis.forEach(function(w) {
    var line = L.polyline(w.points, {
      color: w.color, weight: 3, opacity: 0.7, dashArray: '8,6',
      className: 'wadi-line'
    }).bindPopup('<b>🌊 '+w.name+'</b><br><span style="font-size:11px">אזור מועד להצפות</span>');
    lines.push(line);
  });
  
  floodZoneLayer = L.layerGroup(lines);
}

// Known flood-prone areas (polygons)
var floodAreaLayer = null;

function drawFloodAreas() {
  var areas = [
    {name:'אזור הצפה — נמל תל אביב', color:'#dc2626',
     points:[[32.098,34.770],[32.098,34.782],[32.090,34.782],[32.090,34.770]]},
    {name:'אזור הצפה — מחלף איילון-20', color:'#dc2626',
     points:[[32.055,34.775],[32.055,34.790],[32.045,34.790],[32.045,34.775]]},
    {name:'אזור הצפה — נחל קישון', color:'#dc2626',
     points:[[32.795,34.965],[32.795,34.985],[32.785,34.985],[32.785,34.965]]},
    {name:'אזור הצפה — אשדוד דרום', color:'#f59e0b',
     points:[[31.795,34.640],[31.795,34.660],[31.785,34.660],[31.785,34.640]]},
  ];
  
  var polys = [];
  areas.forEach(function(a) {
    var poly = L.polygon(a.points, {
      color: a.color, fillColor: a.color, fillOpacity: 0.2, weight: 2, dashArray: '4,4'
    }).bindPopup('<b>⚠️ '+a.name+'</b>');
    polys.push(poly);
  });
  
  floodAreaLayer = L.layerGroup(polys);
}

drawFloodAreas();

// Toggle layer visibility
var activeOverlays = {};

function toggleLayer(layerName) {
  var btn = document.getElementById('btn_' + layerName);
  
  if(activeOverlays[layerName]) {
    // Remove
    map.removeLayer(activeOverlays[layerName]);
    delete activeOverlays[layerName];
    if(btn) btn.classList.remove('on');
  } else {
    // Add
    var layer = null;
    switch(layerName) {
      case 'streams': layer = mapLayers.streams; break;
      case 'topo': layer = mapLayers.topo; break;
      case 'wadis': layer = floodZoneLayer; break;
      case 'floods': layer = floodAreaLayer; break;
      case 'satellite': 
        // Switch base map
        map.eachLayer(function(l) {
          if(l._url && l._url.includes('google.com/vt/lyrs=m')) map.removeLayer(l);
        });
        layer = mapLayers.hybrid;
        break;
      case 'terrain':
        map.eachLayer(function(l) {
          if(l._url && l._url.includes('google.com/vt/lyrs=m')) map.removeLayer(l);
        });
        layer = mapLayers.terrain;
        break;
    }
    if(layer) {
      layer.addTo(map);
      activeOverlays[layerName] = layer;
      if(btn) btn.classList.add('on');
    }
  }
}

function restoreBaseMap() {
  // Remove satellite/terrain, restore regular
  ['satellite','terrain'].forEach(function(k) {
    if(activeOverlays[k]) {
      map.removeLayer(activeOverlays[k]);
      delete activeOverlays[k];
      var btn = document.getElementById('btn_'+k);
      if(btn) btn.classList.remove('on');
    }
  });
  L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=he', {
    attribution:'© Google Maps', maxZoom:20, subdomains:'0123'
  }).addTo(map);
}

// Init layers
initMapLayers();
