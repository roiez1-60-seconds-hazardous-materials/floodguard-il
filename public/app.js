// === CONFIG ===
// When deployed on Vercel, proxy is at /api/proxy
// For local testing, set to empty string (upload-only mode)
var PROXY_BASE = '/api/proxy';

// RainViewer API endpoint
var RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';

// IMS Radar image base URL
var IMS_RADAR_BASE = 'https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_';

// IMS radar image geo-bounds (approximate for Israel)
var IMS_BOUNDS = [[29.0, 33.5], [34.0, 36.5]];
var IMS_BOUNDS_ORIG = [[29.0, 33.5], [34.0, 36.5]]; // never changes
var analysisBounds = [[29.0, 33.5], [34.0, 36.5]]; // active bounds for pixel analysis

// === SETTLEMENTS DATA ===
var S = [
  {n:"תל אביב - יפו",e:"Tel Aviv",la:32.0853,lo:34.7818,p:460613,r:78},
  {n:"חיפה",e:"Haifa",la:32.794,lo:34.9896,p:285316,r:72},
  {n:"ירושלים",e:"Jerusalem",la:31.7683,lo:35.2137,p:936425,r:35},
  {n:"באר שבע",e:"Beer Sheva",la:31.253,lo:34.7915,p:209687,r:55},
  {n:"ראשון לציון",e:"Rishon LeZion",la:31.973,lo:34.7925,p:254384,r:68},
  {n:"פתח תקווה",e:"Petah Tikva",la:32.0841,lo:34.8878,p:247956,r:62},
  {n:"אשדוד",e:"Ashdod",la:31.8044,lo:34.6553,p:225939,r:74},
  {n:"נתניה",e:"Netanya",la:32.3215,lo:34.8532,p:221353,r:71},
  {n:"חולון",e:"Holon",la:32.0114,lo:34.7748,p:196282,r:70},
  {n:"בני ברק",e:"Bnei Brak",la:32.0834,lo:34.8331,p:204657,r:65},
  {n:"רמת גן",e:"Ramat Gan",la:32.07,lo:34.8243,p:163480,r:63},
  {n:"אשקלון",e:"Ashkelon",la:31.6688,lo:34.5743,p:144073,r:69},
  {n:"רחובות",e:"Rehovot",la:31.8928,lo:34.8113,p:143904,r:60},
  {n:"בת ים",e:"Bat Yam",la:32.0231,lo:34.7503,p:129013,r:80},
  {n:"הרצליה",e:"Herzliya",la:32.1629,lo:34.7914,p:97470,r:66},
  {n:"כפר סבא",e:"Kfar Saba",la:32.178,lo:34.9065,p:105671,r:52},
  {n:"חדרה",e:"Hadera",la:32.434,lo:34.9196,p:96322,r:67},
  {n:"לוד",e:"Lod",la:31.9516,lo:34.8953,p:82300,r:72},
  {n:"רמלה",e:"Ramla",la:31.9291,lo:34.8625,p:76700,r:73},
  {n:"עכו",e:"Akko",la:32.9278,lo:35.0764,p:49380,r:82},
  {n:"נהריה",e:"Nahariya",la:33.0039,lo:35.094,p:58600,r:85},
  {n:"אילת",e:"Eilat",la:29.5577,lo:34.9519,p:52600,r:90},
  {n:"עפולה",e:"Afula",la:32.61,lo:35.2894,p:56000,r:60},
  {n:"נצרת",e:"Nazareth",la:32.6996,lo:35.3035,p:77400,r:45},
  {n:"טבריה",e:"Tiberias",la:32.7922,lo:35.5312,p:44200,r:55},
  {n:"מודיעין",e:"Modi'in",la:31.8969,lo:35.0104,p:93000,r:40},
  {n:"יבנה",e:"Yavne",la:31.8778,lo:34.7394,p:51000,r:64},
  {n:"שדרות",e:"Sderot",la:31.525,lo:34.5964,p:27500,r:70},
  {n:"צפת",e:"Safed",la:32.9646,lo:35.4962,p:37000,r:38},
  {n:"קריית שמונה",e:"Kiryat Shmona",la:33.2075,lo:35.5713,p:24000,r:55},
  {n:"כרמיאל",e:"Karmiel",la:32.9195,lo:35.2961,p:48000,r:50},
  {n:"דימונה",e:"Dimona",la:31.07,lo:35.0305,p:34300,r:65},
  {n:"ערד",e:"Arad",la:31.2589,lo:35.2128,p:26200,r:50},
  {n:"קריית אתא",e:"Kiryat Ata",la:32.8098,lo:35.1064,p:56500,r:68},
  {n:"קריית גת",e:"Kiryat Gat",la:31.61,lo:34.7642,p:55400,r:58},
  {n:"הוד השרון",e:"Hod HaSharon",la:32.15,lo:34.8886,p:58000,r:48},
  {n:"רעננה",e:"Ra'anana",la:32.1836,lo:34.8674,p:77495,r:50},
  {n:"נס ציונה",e:"Nes Ziona",la:31.9314,lo:34.7986,p:49000,r:58},
  {n:"טירת כרמל",e:"Tirat Carmel",la:32.76,lo:34.97,p:20000,r:70},
  {n:"יקנעם",e:"Yokneam",la:32.6593,lo:35.1097,p:23000,r:55},
];

// === MAP INIT ===
var map = L.map('map', {center:[31.5,34.8], zoom:8, zoomControl:true});
L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=he', {
  attribution:'© Google Maps', maxZoom:20,
  subdomains:'0123'
}).addTo(map);

// === MARKERS ===
var markers = {};
var alerts = {};
var imsOverlay = null;
var radarImageData = null; // stored for analysis

function riskColor(r) {
  // Default: subtle gray dot — risk level only shown in popup/list
  // Alert colors are set by alertIcon() during analysis
  return '#9ca3af';
}

function mkIcon(color, sz) {
  sz = sz || 8;
  return L.divIcon({
    className:'',
    html:'<div style="width:'+sz+'px;height:'+sz+'px;background:'+color+';border:1.5px solid rgba(0,0,0,.2);border-radius:50%;box-shadow:0 0 2px rgba(0,0,0,.2)"></div>',
    iconSize:[sz,sz], iconAnchor:[sz/2,sz/2]
  });
}

function alertIcon(lv) {
  var c = lv==='extreme'?'#dc2626':lv==='heavy'?'#ef4444':'#f59e0b';
  var sz = lv==='extreme'?20:lv==='heavy'?16:12;
  return L.divIcon({
    className:'',
    html:'<div style="width:'+sz+'px;height:'+sz+'px;background:'+c+';border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px '+c+',0 0 2px rgba(0,0,0,.4);animation:p 1s infinite"></div>',
    iconSize:[sz,sz], iconAnchor:[sz/2,sz/2]
  });
}

S.forEach(function(s) {
  var m = L.marker([s.la,s.lo],{icon:mkIcon(riskColor(s.r))}).addTo(map);
  m.bindPopup('<div style="direction:rtl;font-family:Heebo,sans-serif"><b>'+s.n+'</b><br><small>'+s.e+' | אוכלוסייה: '+s.p.toLocaleString()+'</small><br>סיכון: <b style="color:'+riskColor(s.r)+'">'+s.r+'/100</b></div>');
  markers[s.n] = m;
});

// === TABS ===
function showTab(id, btn) {
  document.querySelectorAll('.pane').forEach(function(p){p.classList.remove('on')});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});
  document.getElementById('p-'+id).classList.add('on');
  btn.classList.add('on');
}

// === SETTLEMENT LIST ===
function renderList(filter) {
  filter = filter || '';
  var html = '';
  var sorted = S.slice().sort(function(a,b){return b.r - a.r});
  sorted.forEach(function(s) {
    if(filter && s.n.indexOf(filter)===-1 && s.e.toLowerCase().indexOf(filter.toLowerCase())===-1) return;
    var a = alerts[s.n];
    var cls = a ? 'lv-'+(a.lv==='extreme'?'e':a.lv==='heavy'?'h':'m') : '';
    var bcls = a ? 'bg-'+(a.lv==='extreme'?'e':a.lv==='heavy'?'h':'m') : 'bg-s';
    var btxt = a ? a.he : 'תקין';
    html += '<div class="card '+cls+'" onclick="flyTo(\''+s.n+'\')">';
    html += '<div class="card-top"><span class="card-name">'+s.n+'</span>';
    html += '<span class="card-badge '+bcls+'">'+btxt+'</span></div>';
    html += '<div class="card-info"><span>👥 '+(s.p/1000|0)+'K</span>';
    html += '<span>⚠️ '+s.r+'</span>';
    if(a) html += '<span>🌧️ '+a.mm+' מ"מ/שעה</span>';
    html += '</div></div>';
  });
  document.getElementById('settCards').innerHTML = html || '<p class="hint">לא נמצאו יישובים</p>';
}

function filterList() { renderList(document.getElementById('search').value); }

function flyTo(name) {
  var s = S.find(function(x){return x.n===name});
  if(s) { map.flyTo([s.la,s.lo],12); markers[s.n].openPopup(); }
}

// ============================================================
// IMS RADAR — fetch real radar image via proxy
// ============================================================
function getIMSRadarUrl() {
  // IMS publishes radar every 5 minutes, UTC timestamp
  // Try current time rounded down to nearest 5 minutes, then go back if not found
  var now = new Date();
  // Round down to 5 min
  now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);
  var y = now.getUTCFullYear();
  var mo = String(now.getUTCMonth()+1).padStart(2,'0');
  var d = String(now.getUTCDate()).padStart(2,'0');
  var h = String(now.getUTCHours()).padStart(2,'0');
  var mi = String(now.getUTCMinutes()).padStart(2,'0');
  var ts = y + mo + d + h + mi;
  return IMS_RADAR_BASE + ts + '_0.png';
}

function loadIMSRadar() {
  setStatus('📡 טוען מכ"מ שמ"ט...');
  tryLoadIMS(0);
}

// IMS radar URL patterns to try (in order of preference)
var IMS_URL_PATTERNS = [
  // Pattern 1: IMSRadar4GIS PNG with _0 suffix (GIS-ready, documented by Windy)
  function(ts) { return 'https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_' + ts + '_0.png'; },
  // Pattern 2: IMSRadar4GIS PNG without suffix
  function(ts) { return 'https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_' + ts + '.png'; },
  // Pattern 3: IMSRadar GIF (older format, may still be active)
  function(ts) { return 'https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar/IMSRadar_' + ts + '.gif'; },
  // Pattern 4: IMSRadar4GIS with _1 suffix
  function(ts) { return 'https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_' + ts + '_1.png'; }
];

function tryLoadIMS(attempt) {
  if(attempt > 11) {
    console.warn('📡 [שמ"ט] כל הניסיונות נכשלו (60 דקות אחורה, כל הפורמטים)');
    setStatus('⚠️ לא נמצאה תמונת מכ"מ שמ"ט — ייתכן שהשירות לא פעיל כרגע');
    return;
  }
  
  var now = new Date();
  now.setMinutes(Math.floor(now.getMinutes()/5)*5 - attempt*5, 0, 0);
  var y = now.getUTCFullYear();
  var mo = String(now.getUTCMonth()+1).padStart(2,'0');
  var d = String(now.getUTCDate()).padStart(2,'0');
  var h = String(now.getUTCHours()).padStart(2,'0');
  var mi = String(now.getUTCMinutes()).padStart(2,'0');
  var ts = y+mo+d+h+mi;
  
  console.log('📡 [שמ"ט] ניסיון ' + (attempt+1) + '/12: timestamp=' + ts);
  
  // Try all URL patterns for this timestamp
  tryIMSPattern(ts, 0, attempt, now);
}

function tryIMSPattern(ts, patternIdx, attempt, dateObj) {
  if(patternIdx >= IMS_URL_PATTERNS.length) {
    // All patterns failed for this timestamp, try older
    tryLoadIMS(attempt + 1);
    return;
  }
  
  var imsUrl = IMS_URL_PATTERNS[patternIdx](ts);
  var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(imsUrl);
  var patternName = ['4GIS_0.png', '4GIS.png', 'Radar.gif', '4GIS_1.png'][patternIdx];
  
  console.log('📡 [שמ"ט]   פורמט ' + (patternIdx+1) + '/' + IMS_URL_PATTERNS.length + ' (' + patternName + ')');
  
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    // Verify it's a real image (not a 404 page returned as 200)
    if(img.width < 10 || img.height < 10) {
      console.log('📡 [שמ"ט]   ⚠️ תמונה קטנה מדי (' + img.width + 'x' + img.height + '), ממשיך...');
      tryIMSPattern(ts, patternIdx + 1, attempt, dateObj);
      return;
    }
    
    console.log('📡 [שמ"ט] ✅ נמצאה תמונה! ' + patternName + ' timestamp=' + ts + ', גודל=' + img.width + 'x' + img.height);
    
    // Success! Show on map
    if(imsOverlay) map.removeLayer(imsOverlay);
    imsOverlay = L.imageOverlay(img.src, IMS_BOUNDS, {opacity: 0.6}).addTo(map);
    
    // Store image data for analysis
    var cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    var ctx = cvs.getContext('2d');
    ctx.drawImage(img,0,0);
    radarImageData = ctx.getImageData(0,0,cvs.width,cvs.height);
    
    // Remember which pattern worked for future use
    window._imsWorkingPattern = patternIdx;
    
    // Show timestamp
    var localTime = dateObj.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    var ageMin = attempt * 5;
    document.getElementById('radarTimeVal').textContent = localTime + ' UTC (לפני ~' + ageMin + ' דק\')';
    document.getElementById('radarTime').style.display = 'block';
    document.getElementById('btnRefresh').style.display = 'block';
    
    setStatus('📡 מכ"מ שמ"ט נטען — ' + localTime + ' UTC (' + patternName + ')');
    
    // Auto-analyze colors and log to console
    debugColorTable(radarImageData, 'IMS Radar ' + ts);
  };
  img.onerror = function() {
    // Try next pattern
    tryIMSPattern(ts, patternIdx + 1, attempt, dateObj);
  };
  img.src = proxyUrl;
}

function removeIMSRadar() {
  if(imsOverlay) { map.removeLayer(imsOverlay); imsOverlay = null; }
  radarImageData = null;
  document.getElementById('radarTime').style.display = 'none';
  document.getElementById('btnRefresh').style.display = 'none';
}

// ============================================================
// RAINVIEWER — real tile layer (analyzable!)
// ============================================================
var rvTileLayer = null;
var rvTimestamp = null;

function loadRainViewer() {
  setStatus('🌧️ טוען RainViewer...');
  console.log('🌧️ [RainViewer] שולח בקשה ל-API...');
  
  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(function(r) { 
      console.log('🌧️ [RainViewer] API status:', r.status);
      return r.json(); 
    })
    .then(function(data) {
      if(!data.radar || !data.radar.past || data.radar.past.length === 0) {
        console.warn('🌧️ [RainViewer] אין frames זמינים');
        setStatus('⚠️ RainViewer — אין נתונים זמינים');
        return;
      }
      // Use most recent past radar frame
      var latest = data.radar.past[data.radar.past.length - 1];
      rvTimestamp = latest.time;
      var host = data.host || 'https://tilecache.rainviewer.com';
      var path = latest.path;
      
      var radarTime = new Date(rvTimestamp * 1000);
      var ageMin = Math.round((Date.now() - radarTime.getTime()) / 60000);
      console.log('🌧️ [RainViewer] Frame אחרון:', radarTime.toISOString(), '(לפני ' + ageMin + ' דקות)');
      console.log('🌧️ [RainViewer] Host:', host);
      console.log('🌧️ [RainViewer] Path:', path);
      console.log('🌧️ [RainViewer] סה"כ frames זמינים:', data.radar.past.length);
      
      // Add color tile layer for display (scheme 2 = Universal Blue)
      if(rvTileLayer) map.removeLayer(rvTileLayer);
      var tileUrl = host + path + '/256/{z}/{x}/{y}/2/1_1.png';
      rvTileLayer = L.tileLayer(tileUrl, {
        opacity: 0.65,
        zIndex: 400,
        maxZoom: 7 // free tier limit since Jan 2026
      }).addTo(map);
      
      // Fetch tiles for pixel analysis
      fetchRainViewerForAnalysis(host, path);
      
      var t = new Date(rvTimestamp * 1000).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
      document.getElementById('radarTimeVal').textContent = t + ' (RainViewer, לפני ' + ageMin + ' דק\')';
      document.getElementById('radarTime').style.display = 'block';
      document.getElementById('btnRefresh').style.display = 'block';
      setStatus('🌧️ RainViewer נטען — ' + t + ' (לפני ' + ageMin + ' דק\')');
    })
    .catch(function(e) {
      console.error('🌧️ [RainViewer] שגיאה:', e);
      setStatus('⚠️ RainViewer שגיאה: ' + e.message);
    });
}

function fetchRainViewerForAnalysis(host, path) {
  // Fetch COLOR tiles (scheme 2 = Universal Blue) via proxy for analysis
  // Same scheme displayed on map — we have the color table for it
  var z = 5;
  var tiles = [{x:19,y:12},{x:19,y:13},{x:18,y:12},{x:18,y:13}];
  var canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  var ctx = canvas.getContext('2d');
  var loaded = 0;
  var succeeded = 0;
  
  tiles.forEach(function(t, idx) {
    // Color scheme 2, options 1_1 (same as display layer)
    var tileUrl = host + path + '/256/' + z + '/' + t.x + '/' + t.y + '/2/1_1.png';
    // Load via proxy to ensure CORS for canvas pixel reading
    var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(tileUrl);
    
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      ctx.drawImage(img, (idx % 2) * 256, Math.floor(idx / 2) * 256);
      loaded++; succeeded++;
      if(loaded === tiles.length) finishRVLoad();
    };
    img.onerror = function() {
      // Fallback: try direct
      var img2 = new Image();
      img2.crossOrigin = 'anonymous';
      img2.onload = function() {
        ctx.drawImage(img2, (idx % 2) * 256, Math.floor(idx / 2) * 256);
        loaded++; succeeded++;
        if(loaded === tiles.length) finishRVLoad();
      };
      img2.onerror = function() {
        loaded++;
        console.warn('RainViewer tile failed:', tileUrl);
        if(loaded === tiles.length) finishRVLoad();
      };
      img2.src = tileUrl;
    };
    img.src = proxyUrl;
  });
  
  function finishRVLoad() {
    if(succeeded > 0) {
      try {
        radarImageData = ctx.getImageData(0, 0, 512, 512);
        radarSource = 'rainviewer'; // color scheme analysis
        debugColorTable(radarImageData, 'RainViewer Color');
        analysisBounds[0][0] = tileLat(14, z);
        analysisBounds[1][0] = tileLat(12, z);
        analysisBounds[0][1] = tileLon(18, z);
        analysisBounds[1][1] = tileLon(20, z);
        console.log('✅ RainViewer tiles loaded: ' + succeeded + '/4, source=' + radarSource);
        setStatus('🌧️ RainViewer מוכן לניתוח (' + succeeded + '/4 tiles)');
      } catch(e) {
        console.error('Canvas getImageData failed (CORS?):', e);
        setStatus('⚠️ RainViewer: ניתוח נחסם (CORS) — נסה רענון');
        radarImageData = null;
      }
    } else {
      console.error('❌ All RainViewer tiles failed to load');
      setStatus('⚠️ RainViewer: לא הצלחתי לטעון tiles לניתוח');
      radarImageData = null;
    }
  }
}

// Slippy map tile → lat/lon conversion
function tileLon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
function tileLat(y, z) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function removeRainViewer() {
  if(rvTileLayer) { map.removeLayer(rvTileLayer); rvTileLayer = null; }
  document.getElementById('radarTime').style.display = 'none';
  document.getElementById('btnRefresh').style.display = 'none';
}

// Load multiple past frames from RainViewer for instant nowcast
function loadRVPastFramesForNowcast() {
  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if(!data.radar || !data.radar.past) return;
      var host = data.host || 'https://tilecache.rainviewer.com';
      var pastFrames = data.radar.past.slice(-8); // last 8 frames
      console.log('🔮 [Nowcast Bulk] טוען ' + pastFrames.length + ' פריימים מ-RainViewer...');
      
      var z = 5;
      var tiles = [{x:19,y:12},{x:19,y:13},{x:18,y:12},{x:18,y:13}];
      var framesLoaded = 0;
      
      // Clear old frame history
      frameHistory = [];
      
      pastFrames.forEach(function(frame, fIdx) {
        var canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        var ctx = canvas.getContext('2d');
        var tileLoaded = 0;
        var tileOk = 0;
        
        tiles.forEach(function(t, tIdx) {
          var tileUrl = host + frame.path + '/256/' + z + '/' + t.x + '/' + t.y + '/2/1_1.png';
          var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(tileUrl);
          
          var img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = function() {
            ctx.drawImage(img, (tIdx % 2) * 256, Math.floor(tIdx / 2) * 256);
            tileLoaded++; tileOk++;
            if(tileLoaded === tiles.length) finishFrame();
          };
          img.onerror = function() {
            tileLoaded++;
            if(tileLoaded === tiles.length) finishFrame();
          };
          img.src = proxyUrl;
        });
        
        function finishFrame() {
          if(tileOk > 0) {
            try {
              var imgData = ctx.getImageData(0, 0, 512, 512);
              var bnds = [
                [tileLat(14, z), tileLon(18, z)],
                [tileLat(12, z), tileLon(20, z)]
              ];
              frameHistory.push({
                timestamp: frame.time * 1000,
                imageData: imgData,
                bounds: bnds
              });
            } catch(e) {}
          }
          framesLoaded++;
          if(framesLoaded === pastFrames.length) {
            // Sort by time
            frameHistory.sort(function(a, b) { return a.timestamp - b.timestamp; });
            console.log('🔮 [Nowcast Bulk] ✅ ' + frameHistory.length + ' פריימים נטענו');
            if(frameHistory.length >= 3) {
              runNowcast();
            }
          }
        }
      });
    })
    .catch(function(e) {
      console.warn('🔮 [Nowcast Bulk] שגיאה:', e);
    });
}

// ============================================================
// SOURCE TOGGLE
// ============================================================
var activeSrc = null;

function toggleSrc(src) {
  var bI = document.getElementById('btnIms');
  var bW = document.getElementById('btnWindy');
  
  if(activeSrc === src) {
    // Deactivate
    bI.classList.remove('on'); bW.classList.remove('on');
    if(src==='ims') removeIMSRadar();
    if(src==='rainviewer') removeRainViewer();
    activeSrc = null;
    radarImageData = null;
    setStatus('מערכת פעילה');
  } else {
    // Deactivate previous
    if(activeSrc==='ims') removeIMSRadar();
    if(activeSrc==='rainviewer') removeRainViewer();
    bI.classList.remove('on'); bW.classList.remove('on');
    
    // Activate new
    (src==='ims'?bI:bW).classList.add('on');
    activeSrc = src;
    
    if(src==='ims') {
      radarSource = 'ims';
      analysisBounds = [[29.0,33.5],[34.0,36.5]];
      loadIMSRadar();
    }
    if(src==='rainviewer') { radarSource = 'rainviewer'; loadRainViewer(); }
  }
}

function refreshRadar() {
  if(activeSrc==='ims') loadIMSRadar();
  if(activeSrc==='rainviewer') loadRainViewer();
}

// ============================================================
// DEBUG: Auto-analyze radar image colors → console
// ============================================================
function debugColorTable(imgData, label) {
  if(!imgData) return;
  var d = imgData.data;
  var w = imgData.width, h = imgData.height;
  var counts = {};
  var total = w * h;
  
  for(var i = 0; i < d.length; i += 4) {
    var r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if(a < 80) continue;
    if(r < 15 && g < 15 && b < 15) continue;
    var avg = (r+g+b)/3;
    if(Math.abs(r-avg)<15 && Math.abs(g-avg)<15 && Math.abs(b-avg)<15 && avg>30 && avg<240) continue;
    // Round to nearest 5 to group similar colors
    var key = (Math.round(r/5)*5)+','+(Math.round(g/5)*5)+','+(Math.round(b/5)*5);
    counts[key] = (counts[key]||0) + 1;
  }
  
  var sorted = Object.entries(counts).sort(function(a,b){return b[1]-a[1]});
  var weatherPx = sorted.reduce(function(s,e){return s+e[1]},0);
  
  console.log('=== RADAR COLOR TABLE: ' + label + ' ===');
  console.log('Image: ' + w + 'x' + h + ', Weather pixels: ' + weatherPx + '/' + total);
  console.log('Top 30 weather colors (R,G,B → count):');
  console.table(sorted.slice(0,30).map(function(e){
    var rgb = e[0].split(',').map(Number);
    return {R:rgb[0], G:rgb[1], B:rgb[2], count:e[1], pct:(e[1]/weatherPx*100).toFixed(1)+'%'};
  }));
  
  // Also show as copyable JS array
  console.log('// Copy-paste color table:');
  var js = sorted.slice(0,30).map(function(e){
    var rgb = e[0].split(',').map(Number);
    return '  {r:'+rgb[0]+',g:'+rgb[1]+',b:'+rgb[2]+', mmhr:??, count:'+e[1]+'}';
  }).join(',\n');
  console.log('[\n' + js + '\n]');
}

// ============================================================
// ANALYSIS ENGINE v2 — enhanced radar pixel analysis
// ============================================================

// IMS radar legend: colors map DIRECTLY to mm/hr (NOT dBZ!)
// EXACT RGB values sampled from official IMS radar legend at ims.gov.il
// Screenshot dated 08 Feb 2026 14:25
var IMS_COLOR_TABLE = [
  // Blues/Cyans (very light rain)
  {r:1,  g:101,b:239, mmhr:0.1},   // כחול
  {r:0,  g:195,b:201, mmhr:0.2},   // תכלת כהה
  {r:0,  g:162,b:155, mmhr:0.7},   // ציאן-ירקרק
  {r:0,  g:140,b:77,  mmhr:1.2},   // ציאן-ירוק
  // Greens (light-moderate rain)
  {r:0,  g:175,b:44,  mmhr:2.0},   // ירוק-ציאן
  {r:1,  g:211,b:26,  mmhr:4.0},   // ירוק בהיר
  {r:18, g:242,b:24,  mmhr:6.0},   // ירוק-צהבהב
  {r:125,g:255,b:33,  mmhr:9.0},   // ירוק-צהוב
  // Yellows (moderate-heavy rain)
  {r:254,g:253,b:25,  mmhr:13},    // צהוב
  {r:255,g:207,b:0,   mmhr:18},    // צהוב כהה
  // Oranges (heavy rain)
  {r:255,g:168,b:0,   mmhr:24},    // כתום בהיר
  {r:255,g:125,b:1,   mmhr:30},    // כתום
  // Reds (very heavy rain)
  {r:251,g:63, b:0,   mmhr:40},    // אדום-כתום
  {r:225,g:10, b:18,  mmhr:50},    // אדום
  {r:208,g:0,  b:120, mmhr:100},   // אדום-ורוד
  // Magenta (extreme)
  {r:255,g:0,  b:254, mmhr:200},   // מגנטה
];

// RainViewer "Universal Blue" official color-to-dBZ table
// Extracted from rainviewer.com/files/rainviewer_api_colors_table.csv
// Only entries with visible (non-transparent) alpha included
var RAINVIEWER_COLOR_TABLE = [
  // Blues (light rain, 0-15 dBZ)
  {r:0x82,g:0x7b,b:0x69, dbz:0},
  {r:0x92,g:0x88,b:0x71, dbz:5},
  {r:0xce,g:0xc0,b:0x87, dbz:10},
  {r:0x88,g:0xdd,b:0xee, dbz:15},
  // Greens → Blues (moderate, 20-30 dBZ)
  {r:0x00,g:0xa3,b:0xe0, dbz:20},
  {r:0x00,g:0x77,b:0xaa, dbz:25},
  {r:0x00,g:0x55,b:0x88, dbz:30},
  // Yellows → Oranges (heavy, 35-45 dBZ)
  {r:0xff,g:0xee,b:0x00, dbz:35},
  {r:0xff,g:0xaa,b:0x00, dbz:40},
  {r:0xff,g:0x44,b:0x00, dbz:45},
  // Reds (very heavy, 50-55 dBZ)
  {r:0xc1,g:0x00,b:0x00, dbz:50},
  {r:0xff,g:0xaa,b:0xff, dbz:55},
  // Magentas → White (extreme, 60-70 dBZ)
  {r:0xff,g:0x77,b:0xff, dbz:60},
  {r:0xff,g:0xff,b:0xff, dbz:65},
  {r:0xff,g:0xff,b:0xff, dbz:70},
];

// RainViewer Black-and-White scheme: direct decode without color table
// dBZ = R_value - 32 (where R is the red channel, 0-255)
// If R & 128 == 128, pixel represents snow
function rainviewerBWDecode(r, g, b, a) {
  if(a < 10) return -1;
  var isSnow = (r & 128) === 128;
  var dbz = (r & 127) - 32;
  return dbz > 0 ? dbz : -1;
}

// Active source determines which color table to use
var radarSource = 'ims'; // 'ims', 'rainviewer', 'rainviewer_bw', 'govmap', 'upload'

// GovMap "מכ"מ גשם" color table — scale is mm/10min
// From the screenshot legend: purple(25)→red(20,15,12,10)→orange(5,4,3)→yellow(2,1.5)→green(1,0.8)→cyan(0.5,0.1)
// To convert mm/10min → mm/hr: multiply by 6
var GOVMAP_COLOR_TABLE = [
  // Light (cyan-blue) → low intensity
  {r:180,g:180,b:255, mm10:0.1, dbz:10},  // very light blue-purple
  {r:100,g:200,b:255, mm10:0.5, dbz:20},  // cyan
  {r:50, g:220,b:50,  mm10:0.8, dbz:25},  // light green
  {r:0,  g:180,b:0,   mm10:1.0, dbz:28},  // green
  {r:200,g:255,b:0,   mm10:1.5, dbz:32},  // yellow-green
  {r:255,g:255,b:0,   mm10:2.0, dbz:35},  // yellow
  {r:255,g:200,b:0,   mm10:3.0, dbz:40},  // dark yellow
  {r:255,g:150,b:0,   mm10:4.0, dbz:43},  // orange
  {r:255,g:100,b:0,   mm10:5.0, dbz:45},  // dark orange
  {r:255,g:0,  b:0,   mm10:10,  dbz:50},  // red
  {r:200,g:0,  b:0,   mm10:12,  dbz:53},  // dark red
  {r:170,g:0,  b:50,  mm10:15,  dbz:55},  // crimson
  {r:140,g:0,  b:80,  mm10:20,  dbz:58},  // maroon-purple
  {r:100,g:0,  b:120, mm10:25,  dbz:62},  // purple
];

// Background/non-weather colors to ignore
var BG_COLORS = [
  {r:0,g:0,b:0},         // black
  {r:255,g:255,b:255},    // white background (not radar white)
  {r:128,g:128,b:128},    // gray UI
  {r:200,g:200,b:200},    // light gray
  {r:170,g:170,b:170},    // map gray
];

function isBackground(r, g, b, a) {
  if(a < 80) return true;
  // Near-black
  if(r < 15 && g < 15 && b < 15) return true;
  // Grayscale (non-radar) — check if R≈G≈B within tolerance
  var avg = (r+g+b)/3;
  if(Math.abs(r-avg) < 15 && Math.abs(g-avg) < 15 && Math.abs(b-avg) < 15 && avg > 30 && avg < 240) return true;
  return false;
}

// Main pixel decoder: returns mm/hr directly
// IMS: color → mm/hr (direct from legend)
// RainViewer BW: R channel → dBZ → mm/hr
// RainViewer color: color → dBZ → mm/hr
// GovMap: color → mm/10min × 6 → mm/hr
function pixelToMmHr(r, g, b, a) {
  if(isBackground(r, g, b, a)) return -1;

  // RainViewer Black-and-White mode: direct dBZ decode
  if(radarSource === 'rainviewer_bw') {
    var dbz = rainviewerBWDecode(r, g, b, a);
    return dbz > 0 ? dbzToMmHr(dbz) : -1;
  }

  // Choose color table and value key
  var table, valKey, convertFn;
  if(radarSource === 'rainviewer') {
    table = RAINVIEWER_COLOR_TABLE;
    valKey = 'dbz';
    convertFn = dbzToMmHr;
  } else if(radarSource === 'govmap') {
    table = GOVMAP_COLOR_TABLE;
    valKey = 'mm10';
    convertFn = function(v) { return v * 6; }; // mm/10min → mm/hr
  } else {
    // IMS Radar4GIS — mm/hr direct from legend
    table = IMS_COLOR_TABLE;
    valKey = 'mmhr';
    convertFn = function(v) { return v; }; // already mm/hr
  }

  // Find two closest entries and interpolate
  var best1idx = 0, best1dist = 999999;
  var best2idx = 0, best2dist = 999999;

  for(var i = 0; i < table.length; i++) {
    var c = table[i];
    var dist = (r-c.r)*(r-c.r) + (g-c.g)*(g-c.g) + (b-c.b)*(b-c.b);
    if(dist < best1dist) {
      best2idx = best1idx; best2dist = best1dist;
      best1idx = i; best1dist = dist;
    } else if(dist < best2dist) {
      best2idx = i; best2dist = dist;
    }
  }

  // If closest match is too far, reject
  if(best1dist > 12000) return -1;

  // Direct close match
  var val;
  if(best1dist < 500) {
    val = table[best1idx][valKey];
  } else {
    // Interpolate
    var total = best1dist + best2dist;
    if(total === 0) { val = table[best1idx][valKey]; }
    else {
      var w1 = 1 - (best1dist / total);
      var w2 = 1 - (best2dist / total);
      val = (table[best1idx][valKey] * w1 + table[best2idx][valKey] * w2) / (w1 + w2);
    }
  }

  return convertFn(val);
}

// Marshall-Palmer Z-R: Z = 200 * R^1.6
// Convective (Israeli climate): Z = 300 * R^1.4
// Blend based on dBZ intensity
function dbzToMmHr(dbz) {
  if(dbz <= 0) return 0;
  var zLin = Math.pow(10, dbz / 10);
  // Standard Marshall-Palmer
  var rMP = Math.pow(zLin / 200, 0.625);
  // Convective (better for Israeli short intense storms)
  var rConv = Math.pow(zLin / 300, 1/1.4);
  // Blend: use convective formula more at higher intensities
  var convWeight = Math.min(1, Math.max(0, (dbz - 30) / 20));
  return rMP * (1 - convWeight) + rConv * convWeight;
}

function latLonToPixel(lat, lon, imgW, imgH) {
  var latMin = analysisBounds[0][0], latMax = analysisBounds[1][0];
  var lonMin = analysisBounds[0][1], lonMax = analysisBounds[1][1];
  var x = Math.round((lon - lonMin) / (lonMax - lonMin) * imgW);
  var y = Math.round((latMax - lat) / (latMax - latMin) * imgH);
  return {x: Math.max(0, Math.min(imgW-1, x)), y: Math.max(0, Math.min(imgH-1, y))};
}

// Enhanced sampling: returns full statistics for a settlement area
// Now works directly in mm/hr (no dBZ intermediate for IMS)
function sampleRadarAtLocation(imgData, lat, lon, radiusPx) {
  radiusPx = radiusPx || 6;
  var w = imgData.width, h = imgData.height;
  var center = latLonToPixel(lat, lon, w, h);
  var mmhrValues = [];
  var radarPixels = 0, totalPixels = 0;

  for(var dy = -radiusPx; dy <= radiusPx; dy++) {
    for(var dx = -radiusPx; dx <= radiusPx; dx++) {
      // Circular sampling (skip corners)
      if(dx*dx + dy*dy > radiusPx*radiusPx) continue;
      var px = center.x + dx;
      var py = center.y + dy;
      if(px < 0 || px >= w || py < 0 || py >= h) continue;
      totalPixels++;
      var idx = (py * w + px) * 4;
      var mmhr = pixelToMmHr(imgData.data[idx], imgData.data[idx+1], imgData.data[idx+2], imgData.data[idx+3]);
      if(mmhr > 0) {
        mmhrValues.push(mmhr);
        radarPixels++;
      }
    }
  }

  if(mmhrValues.length === 0) {
    return {avgMmHr:0, maxMmHr:0, p90MmHr:0, coverage:0, radarPixels:0, totalPixels:totalPixels};
  }

  // Sort for percentile calculations
  mmhrValues.sort(function(a,b){return a-b});
  var sum = 0;
  for(var i=0; i<mmhrValues.length; i++) sum += mmhrValues[i];
  var avgMmHr = sum / mmhrValues.length;
  var maxMmHr = mmhrValues[mmhrValues.length - 1];
  // 90th percentile
  var p90idx = Math.floor(mmhrValues.length * 0.9);
  var p90MmHr = mmhrValues[Math.min(p90idx, mmhrValues.length-1)];
  var coverage = radarPixels / totalPixels;

  return {
    avgMmHr: avgMmHr,
    maxMmHr: maxMmHr,
    p90MmHr: p90MmHr,
    coverage: coverage,
    radarPixels: radarPixels,
    totalPixels: totalPixels
  };
}

// Compute effective rainfall alert level combining radar data + vulnerability
function computeAlertScore(radarStats, riskScore) {
  if(radarStats.coverage < 0.05) return {mmhr: 0, effective: 0}; // less than 5% coverage = no significant rain

  // Use weighted combination: 60% p90, 30% avg, 10% max
  // p90 is robust against outliers but still catches heavy cores
  var representativeMmHr = radarStats.p90MmHr * 0.6 + radarStats.avgMmHr * 0.3 + radarStats.maxMmHr * 0.1;

  // Apply vulnerability multiplier: high-risk areas get boosted
  // Risk 50 = 1.0x, Risk 80 = 1.15x, Risk 100 = 1.25x
  var riskMultiplier = 1.0 + (riskScore - 50) / 200;
  riskMultiplier = Math.max(0.9, Math.min(1.3, riskMultiplier));

  var effectiveMmHr = representativeMmHr * riskMultiplier;

  return {
    mmhr: representativeMmHr,
    effective: effectiveMmHr,
    coverage: radarStats.coverage,
    maxMmHr: radarStats.maxMmHr
  };
}

function analyze() {
  if(!radarImageData) { 
    alert('אין נתוני מכ"מ. לחץ על שמ"ט או RainViewer קודם, או העלה תמונה.'); 
    return; 
  }

  console.log('⚡ [ניתוח] מתחיל ניתוח...');
  console.log('⚡ [ניתוח] מקור:', radarSource);
  console.log('⚡ [ניתוח] גודל תמונה:', radarImageData.width + 'x' + radarImageData.height);
  console.log('⚡ [ניתוח] bounds:', JSON.stringify(analysisBounds));

  var btn = document.getElementById('btnRun');
  btn.textContent = '⏳ מנתח...';
  btn.disabled = true;

  setTimeout(function() {
    for(var k in alerts) delete alerts[k];
    var cM=0, cH=0, cE=0;

    S.forEach(function(s) {
      var stats = sampleRadarAtLocation(radarImageData, s.la, s.lo, 6);
      var score = computeAlertScore(stats, s.r);
      var mmhr = score.effective;
      // Log settlements with any rain
      if(stats.avgMmHr > 0.5) {
        console.log('⚡ [ניתוח] ' + s.n + ': avg=' + stats.avgMmHr.toFixed(1) + ' max=' + stats.maxMmHr.toFixed(1) + ' P90=' + stats.p90MmHr.toFixed(1) + ' cover=' + (stats.coverage*100).toFixed(0) + '% → effective=' + mmhr.toFixed(1) + ' mm/hr');
      }
      var detail = {
        avgMm: stats.avgMmHr.toFixed(1),
        maxMm: stats.maxMmHr.toFixed(1),
        p90Mm: stats.p90MmHr.toFixed(1),
        cover: (stats.coverage * 100).toFixed(0),
        effMm: score.effective.toFixed(1),
        rawMm: score.mmhr.toFixed(1)
      };

      // Classify by effective mm/hr
      if(mmhr >= 40) {
        alerts[s.n] = {lv:'extreme', he:'כבד מאוד', mm:mmhr.toFixed(1), detail:detail};
        markers[s.n].setIcon(alertIcon('extreme'));
        cE++;
      } else if(mmhr >= 25) {
        alerts[s.n] = {lv:'heavy', he:'חזק', mm:mmhr.toFixed(1), detail:detail};
        markers[s.n].setIcon(alertIcon('heavy'));
        cH++;
      } else if(mmhr >= 15) {
        alerts[s.n] = {lv:'moderate', he:'בינוני-חזק', mm:mmhr.toFixed(1), detail:detail};
        markers[s.n].setIcon(alertIcon('moderate'));
        cM++;
      } else {
        markers[s.n].setIcon(mkIcon(riskColor(s.r)));
      }
    });

    // Update counters
    document.getElementById('cntM').textContent = cM;
    document.getElementById('cntH').textContent = cH;
    document.getElementById('cntE').textContent = cE;

    // Render alert cards with detailed info
    var html = '';
    var alerted = S.filter(function(s){return alerts[s.n]}).sort(function(a,b){
      var o = {extreme:0,heavy:1,moderate:2};
      return o[alerts[a.n].lv] - o[alerts[b.n].lv];
    });

    alerted.forEach(function(s) {
      var a = alerts[s.n];
      var cls = 'lv-'+(a.lv==='extreme'?'e':a.lv==='heavy'?'h':'m');
      var bcls = 'bg-'+(a.lv==='extreme'?'e':a.lv==='heavy'?'h':'m');
      html += '<div class="card '+cls+'" onclick="flyTo(\''+s.n+'\')">';
      html += '<div class="card-top"><span class="card-name">'+s.n+'</span>';
      html += '<span class="card-badge '+bcls+'">'+a.he+'</span></div>';
      html += '<div class="card-info"><span>🌧️ '+a.mm+' מ"מ/שעה</span>';
      html += '<span>⚠️ '+s.r+'</span><span>👥 '+(s.p/1000|0)+'K</span></div>';
      // Show detailed stats if available (real analysis)
      if(a.detail) {
        html += '<div class="card-info" style="margin-top:4px;font-size:10px;opacity:0.7">';
        html += '<span>ממוצע: '+a.detail.avgMm+'</span>';
        html += '<span>P90: '+a.detail.p90Mm+'</span>';
        html += '<span>מקס: '+a.detail.maxMm+'</span>';
        html += '<span>כיסוי: '+a.detail.cover+'%</span>';
        html += '</div>';
      }
      // Share buttons
      var safeName = s.n.replace(/'/g, "\\'");
      html += '<div style="display:flex;gap:6px;margin-top:4px;justify-content:flex-end">';
      html += '<button class="share-btn" onclick="event.stopPropagation();shareAlert(\''+safeName+'\')" title="שתף">📤</button>';
      html += '<button class="share-btn" onclick="event.stopPropagation();copyAlert(\''+safeName+'\')" title="העתק">📋</button>';
      html += '</div>';
      html += '</div>';
    });

    var modeText = '(ניתוח מכ"מ אמיתי)';
    document.getElementById('alertCards').innerHTML = html || '<p class="hint">✅ לא זוהו התראות — אין גשם משמעותי כרגע</p>';

    renderList(document.getElementById('search')?.value || '');
    if(cE > 0) playSound();

    btn.textContent = '⚡ נתח';
    btn.disabled = false;

    var t = new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    var srcName = radarSource === 'rainviewer_bw' ? 'RainViewer' : radarSource === 'ims' ? 'שמ"ט' : 'העלאה';
    setStatus('ניתוח הושלם '+t+' | '+(cM+cH+cE)+' התראות ('+srcName+')');
    showTab('alerts', document.querySelector('.tab'));
  }, 500);
}

var uploadSrcChoice = 'ims'; // default for manual uploads

function setUploadSrc(src) {
  uploadSrcChoice = src;
  document.querySelectorAll('.srcBtn').forEach(function(b){b.classList.remove('on')});
  document.getElementById(src==='ims'?'srcIms':src==='govmap'?'srcGov':'srcRv').classList.add('on');
  var units = {
    ims: '📏 שמ"ט: מ"מ/שעה (mm/hr) — ללא המרה',
    govmap: '📏 GovMap: מ"מ/10 דקות (mm/10min) — מוכפל ב-6 למ"מ/שעה',
    rainviewer: '📏 RainViewer: dBZ (עוצמת החזר) — ממיר ל-מ"מ/שעה לפי Marshall-Palmer'
  };
  document.getElementById('srcUnits').textContent = units[src];
}

// ============================================================
// FILE UPLOAD — with interactive geo-calibration
// ============================================================
var uploadImageUrl = null;
var calibMarkers = [];
var calibBounds = null;

function onUpload(ev) {
  var file = ev.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var c = document.getElementById('cvs');
      var ctx = c.getContext('2d');
      c.width = img.width; c.height = img.height;
      ctx.drawImage(img,0,0);
      
      // Store image data
      radarImageData = ctx.getImageData(0,0,c.width,c.height);
      uploadImageUrl = e.target.result;
      
      // Set source
      activeSrc = 'upload';
      radarSource = uploadSrcChoice;
      
      // Place image on map with default bounds
      var defaultBounds = [[29.5, 34.0], [33.5, 36.0]];
      if(imsOverlay) map.removeLayer(imsOverlay);
      imsOverlay = L.imageOverlay(uploadImageUrl, defaultBounds, {
        opacity: 0.55,
        interactive: false
      }).addTo(map);
      
      // Start calibration mode
      startCalibration(defaultBounds);
      
      debugColorTable(radarImageData, 'Upload: ' + radarSource);
      
      var scaleLabel = radarSource==='govmap' ? 'מ"מ/10 דק\'' : radarSource==='rainviewer' ? 'dBZ' : 'שמ"ט';
      document.getElementById('uploadRes').innerHTML =
        '<div style="background:var(--card);border:1px solid var(--brd);border-radius:8px;padding:12px;font-size:12px;line-height:1.8;margin-top:8px">'+
        '<b>📐 מצב כיול</b><br>'+
        'גרור את <b style="color:#dc2626">⬤ הפין האדום</b> (צפון-מערב) ו-<b style="color:#2563eb">⬤ הפין הכחול</b> (דרום-מזרח) '+
        'כדי ליישר את התמונה עם המפה.<br>'+
        '<div style="margin-top:8px;display:flex;gap:6px;">'+
        '<button onclick="finishCalibration()" style="flex:1;padding:8px;background:#22c55e;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer">✅ סיימתי — נתח</button>'+
        '<button onclick="cancelCalibration()" style="padding:8px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer">✖ בטל</button>'+
        '</div>'+
        '<div style="margin-top:6px;font-size:11px;color:var(--tx2)">סקלה: '+scaleLabel+'</div>'+
        '</div>';
      
      setStatus('📐 מצב כיול — גרור את הפינים ליישור התמונה');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function startCalibration(bounds) {
  // Remove old calibration markers
  clearCalibMarkers();
  
  var nw = L.latLng(bounds[1][0], bounds[0][1]); // north-west (top-left)
  var se = L.latLng(bounds[0][0], bounds[1][1]); // south-east (bottom-right)
  
  // NW marker (red) — top-left corner
  var nwIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;background:#dc2626;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,.5);cursor:grab"></div>',
    iconSize: [20,20], iconAnchor: [10,10]
  });
  var nwMarker = L.marker(nw, {icon: nwIcon, draggable: true}).addTo(map);
  nwMarker.bindTooltip('↖ צפון-מערב', {direction: 'right', permanent: false});
  
  // SE marker (blue) — bottom-right corner
  var seIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,.5);cursor:grab"></div>',
    iconSize: [20,20], iconAnchor: [10,10]
  });
  var seMarker = L.marker(se, {icon: seIcon, draggable: true}).addTo(map);
  seMarker.bindTooltip('↘ דרום-מזרח', {direction: 'left', permanent: false});
  
  // Update overlay on drag
  function updateOverlay() {
    var nwP = nwMarker.getLatLng();
    var seP = seMarker.getLatLng();
    var newBounds = [[seP.lat, nwP.lng], [nwP.lat, seP.lng]];
    if(imsOverlay) {
      map.removeLayer(imsOverlay);
      imsOverlay = L.imageOverlay(uploadImageUrl, newBounds, {
        opacity: 0.55,
        interactive: false
      }).addTo(map);
    }
    calibBounds = newBounds;
  }
  
  nwMarker.on('drag', updateOverlay);
  seMarker.on('drag', updateOverlay);
  
  calibMarkers = [nwMarker, seMarker];
  calibBounds = bounds;
}

function clearCalibMarkers() {
  calibMarkers.forEach(function(m) { map.removeLayer(m); });
  calibMarkers = [];
}

function finishCalibration() {
  if(!calibBounds || !radarImageData) return;
  
  // Set analysis bounds to calibrated bounds
  analysisBounds[0][0] = calibBounds[0][0]; // south lat
  analysisBounds[0][1] = calibBounds[0][1]; // west lon
  analysisBounds[1][0] = calibBounds[1][0]; // north lat
  analysisBounds[1][1] = calibBounds[1][1]; // east lon
  
  // Remove calibration markers
  clearCalibMarkers();
  
  // Run analysis
  analyze();
  
  document.getElementById('uploadRes').innerHTML =
    '<div style="background:var(--card);border:1px solid var(--brd);border-radius:8px;padding:12px;font-size:12px;line-height:1.8;margin-top:8px">'+
    '✅ כיול הושלם. גבולות: '+
    calibBounds[0][0].toFixed(2)+'°N — '+calibBounds[1][0].toFixed(2)+'°N, '+
    calibBounds[0][1].toFixed(2)+'°E — '+calibBounds[1][1].toFixed(2)+'°E'+
    '</div>';
  
  setStatus('✅ כיול הושלם — ניתוח הופעל');
}

function cancelCalibration() {
  clearCalibMarkers();
  if(imsOverlay) { map.removeLayer(imsOverlay); imsOverlay = null; }
  radarImageData = null;
  activeSrc = null;
  document.getElementById('uploadRes').innerHTML = '';
  setStatus('ביטול העלאה');
}

// ============================================================
// UTILS
// ============================================================
function setStatus(msg) {
  document.getElementById('statusMsg').textContent = msg;
}

function playSound() {
  try {
    var c = new (window.AudioContext||window.webkitAudioContext)();
    var o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(880,c.currentTime);
    o.frequency.setValueAtTime(660,c.currentTime+.2);
    o.frequency.setValueAtTime(880,c.currentTime+.4);
    g.gain.setValueAtTime(.3,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.01,c.currentTime+.6);
    o.start(c.currentTime); o.stop(c.currentTime+.6);
  } catch(e){}
}

setInterval(function(){
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
},1000);

// ============================================================
// AUTO-REFRESH: fetch + analyze every N minutes
// ============================================================
var autoInterval = null;
var AUTO_REFRESH_MIN = 5; // refresh every 5 minutes

function startAutoRefresh() {
  if(autoInterval) return; // already running
  
  // Run immediately
  autoFetchAndAnalyze();
  
  // Then repeat
  autoInterval = setInterval(autoFetchAndAnalyze, AUTO_REFRESH_MIN * 60 * 1000);
  
  document.getElementById('btnAuto').textContent = '⏸️ עצור';
  document.getElementById('btnAuto').classList.add('on');
  setStatus('🔄 מצב אוטומטי — רענון כל ' + AUTO_REFRESH_MIN + ' דקות');
}

function stopAutoRefresh() {
  if(autoInterval) { clearInterval(autoInterval); autoInterval = null; }
  document.getElementById('btnAuto').textContent = '🔄 אוטומטי';
  document.getElementById('btnAuto').classList.remove('on');
  setStatus('מצב אוטומטי כבוי');
}

function toggleAuto() {
  if(autoInterval) stopAutoRefresh();
  else startAutoRefresh();
}

function autoFetchAndAnalyze() {
  // If no source selected, default to RainViewer (most reliable)
  if(!activeSrc) {
    toggleSrc('rainviewer');
  } else {
    refreshRadar();
  }
  
  // Wait for data to load, then analyze
  // Try at 6s, if no data try again at 12s
  setTimeout(function() {
    if(radarImageData) {
      analyze();
    } else {
      // Give it more time
      setTimeout(function() {
        if(radarImageData) {
          analyze();
        } else {
          setStatus('⚠️ לא הצלחתי לשלוף מכ"מ — מנסה שוב בעוד ' + AUTO_REFRESH_MIN + ' דקות');
        }
      }, 6000);
    }
  }, 6000);
}

// === INIT ===
renderList();

// ============================================================
// FEATURE 1: GEOLOCATION — "📍 מצא את המיקום שלי"
// ============================================================
var userLocationMarker = null;
var userNearestSettlement = null;

function locateMe() {
  if(!navigator.geolocation) {
    alert('הדפדפן לא תומך במיקום');
    return;
  }
  setStatus('📍 מחפש מיקום...');
  document.getElementById('btnLocate').textContent = '⏳';
  
  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    console.log('📍 [מיקום] נמצא:', lat.toFixed(4), lon.toFixed(4));
    
    // Show user location on map
    if(userLocationMarker) map.removeLayer(userLocationMarker);
    userLocationMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className:'',
        html:'<div style="width:16px;height:16px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(37,99,235,.5)"></div>',
        iconSize:[16,16], iconAnchor:[8,8]
      })
    }).addTo(map).bindPopup('<b>📍 המיקום שלך</b>');
    
    map.flyTo([lat, lon], 11);
    
    // Find nearest settlement
    var minDist = Infinity;
    S.forEach(function(s) {
      var d = Math.sqrt(Math.pow(lat-s.la,2) + Math.pow(lon-s.lo,2));
      if(d < minDist) { minDist = d; userNearestSettlement = s.n; }
    });
    
    var distKm = (minDist * 111).toFixed(1);
    console.log('📍 [מיקום] יישוב קרוב:', userNearestSettlement, '(' + distKm + ' ק"מ)');
    
    document.getElementById('btnLocate').textContent = '📍';
    setStatus('📍 ' + userNearestSettlement + ' (' + distKm + ' ק"מ)');
    
    // If there's an active alert for nearest settlement, notify
    if(alerts[userNearestSettlement]) {
      var a = alerts[userNearestSettlement];
      sendNotification('⚠️ התראת גשם ב' + userNearestSettlement, 
        a.he + ' — ' + a.mm + ' מ"מ/שעה');
    }
    
    // Highlight nearest settlement
    if(markers[userNearestSettlement]) {
      markers[userNearestSettlement].openPopup();
    }
  }, function(err) {
    console.warn('📍 [מיקום] שגיאה:', err.message);
    document.getElementById('btnLocate').textContent = '📍';
    setStatus('📍 שגיאת מיקום: ' + err.message);
  }, {enableHighAccuracy: true, timeout: 10000});
}

// ============================================================
// FEATURE 2: NOWCASTING — frame history + motion prediction
// ============================================================
var frameHistory = []; // Array of {timestamp, imageData, bounds}
var MAX_FRAMES = 8;
var forecastResults = []; // predicted alerts per settlement

// Store current frame to history (called after each successful analysis)
function storeFrame() {
  if(!radarImageData) return;
  
  var frame = {
    timestamp: Date.now(),
    imageData: radarImageData, // reference to current ImageData
    bounds: [analysisBounds[0].slice(), analysisBounds[1].slice()]
  };
  
  frameHistory.push(frame);
  if(frameHistory.length > MAX_FRAMES) frameHistory.shift();
  
  console.log('🔮 [Nowcast] frame שמור, סה"כ:', frameHistory.length + '/' + MAX_FRAMES);
  
  // If we have at least 3 frames, run nowcast
  if(frameHistory.length >= 3) {
    runNowcast();
  }
}

// Simple nowcast: compare rain intensity between frames to detect trends
// For each settlement, check if rain is approaching (increasing) or leaving (decreasing)
function runNowcast() {
  if(frameHistory.length < 3) {
    document.getElementById('forecastStatus').textContent = 
      '⏳ צריך לפחות 3 פריימים (' + frameHistory.length + '/' + MAX_FRAMES + '). המתן...';
    return;
  }
  
  console.log('🔮 [Nowcast] מריץ תחזית עם ' + frameHistory.length + ' פריימים...');
  forecastResults = [];
  
  S.forEach(function(s) {
    var intensities = [];
    
    // Sample each frame at this settlement's location
    frameHistory.forEach(function(frame) {
      // Adjust bounds for this frame
      var oldBounds = [analysisBounds[0].slice(), analysisBounds[1].slice()];
      analysisBounds[0] = frame.bounds[0];
      analysisBounds[1] = frame.bounds[1];
      
      var stats = sampleRadarAtLocation(frame.imageData, s.la, s.lo, 4);
      intensities.push(stats.avgMmHr);
      
      // Restore bounds
      analysisBounds[0] = oldBounds[0];
      analysisBounds[1] = oldBounds[1];
    });
    
    // Calculate trend: linear regression over intensities
    var n = intensities.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for(var i = 0; i < n; i++) {
      sumX += i; sumY += intensities[i];
      sumXY += i * intensities[i];
      sumXX += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    var avg = sumY / n;
    var latest = intensities[n - 1];
    
    // Predict 30 min ahead (about 6 frames forward at 5-min intervals)
    var predicted30 = Math.max(0, latest + slope * 6);
    // Predict 60 min ahead
    var predicted60 = Math.max(0, latest + slope * 12);
    
    var trend = 'stable';
    if(slope > 1) trend = 'increasing';
    else if(slope > 0.3) trend = 'slight_increase';
    else if(slope < -1) trend = 'decreasing';
    else if(slope < -0.3) trend = 'slight_decrease';
    
    // Only include if there's meaningful rain now or predicted
    if(latest > 2 || predicted30 > 10 || predicted60 > 15) {
      forecastResults.push({
        name: s.n,
        risk: s.r,
        current: latest,
        predicted30: predicted30,
        predicted60: predicted60,
        trend: trend,
        slope: slope,
        history: intensities
      });
    }
  });
  
  // Sort by predicted danger
  forecastResults.sort(function(a, b) {
    return Math.max(b.predicted30, b.predicted60) - Math.max(a.predicted30, a.predicted60);
  });
  
  renderForecast();
  
  // Send push notification for dangerous predictions
  forecastResults.forEach(function(f) {
    if(f.predicted30 >= 25 && f.current < 15) {
      // Rain approaching settlement — warn!
      sendNotification('⚠️ גשם חזק מתקרב ל' + f.name, 
        'צפי: ~' + f.predicted30.toFixed(0) + ' מ"מ/שעה בעוד 30 דקות');
    }
  });
  
  // Extra notification for user's nearest settlement
  if(userNearestSettlement) {
    var myForecast = forecastResults.find(function(f) { return f.name === userNearestSettlement; });
    if(myForecast && myForecast.predicted30 >= 15 && myForecast.current < 10) {
      sendNotification('🌧️ גשם מתקרב אליך!', 
        userNearestSettlement + ' — צפי: ' + myForecast.predicted30.toFixed(0) + ' מ"מ/שעה');
    }
  }
}

function renderForecast() {
  var statusEl = document.getElementById('forecastStatus');
  var cardsEl = document.getElementById('forecastCards');
  
  var trendHe = {
    'increasing': '📈 מתחזק',
    'slight_increase': '↗️ עולה',
    'stable': '➡️ יציב',
    'slight_decrease': '↘️ יורד',
    'decreasing': '📉 נחלש'
  };
  var trendColor = {
    'increasing': '#dc2626',
    'slight_increase': '#f59e0b',
    'stable': '#6b7280',
    'slight_decrease': '#22c55e',
    'decreasing': '#22c55e'
  };
  
  statusEl.innerHTML = '✅ תחזית מבוססת ' + frameHistory.length + ' פריימים | ' + 
    forecastResults.length + ' יישובים עם גשם';
  
  if(forecastResults.length === 0) {
    cardsEl.innerHTML = '<p class="hint">✅ לא צפוי גשם משמעותי בשעה הקרובה</p>';
    return;
  }
  
  var html = '';
  forecastResults.forEach(function(f) {
    var dangerClass = '';
    if(f.predicted30 >= 40) dangerClass = 'lv-e';
    else if(f.predicted30 >= 25) dangerClass = 'lv-h';
    else if(f.predicted30 >= 15) dangerClass = 'lv-m';
    
    html += '<div class="card ' + dangerClass + '" onclick="flyTo(\'' + f.name + '\')">';
    html += '<div class="card-top"><span class="card-name">' + f.name + '</span>';
    html += '<span style="font-size:11px;color:' + trendColor[f.trend] + '">' + trendHe[f.trend] + '</span></div>';
    html += '<div class="card-info">';
    html += '<span>עכשיו: ' + f.current.toFixed(1) + '</span>';
    html += '<span>30 דק\': <b>' + f.predicted30.toFixed(0) + '</b></span>';
    html += '<span>60 דק\': <b>' + f.predicted60.toFixed(0) + '</b></span>';
    html += '</div>';
    
    // Mini sparkline using unicode blocks
    var maxH = Math.max.apply(null, f.history.concat([1]));
    var bars = f.history.map(function(v) {
      var h = Math.round((v / maxH) * 7);
      return ['▁','▂','▃','▄','▅','▆','▇','█'][Math.min(h, 7)];
    }).join('');
    html += '<div style="font-size:10px;color:var(--tx2);margin-top:2px;font-family:monospace">' + bars + ' מ"מ/שעה</div>';
    html += '</div>';
  });
  
  cardsEl.innerHTML = html;
}

// ============================================================
// FEATURE 3: PUSH NOTIFICATIONS
// ============================================================

// Register Service Worker
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    console.log('🔔 [SW] Service Worker רשום:', reg.scope);
  }).catch(function(err) {
    console.warn('🔔 [SW] שגיאה ברישום:', err);
  });
}

// Show notification permission banner if not yet granted
function checkNotifBanner() {
  if('Notification' in window && Notification.permission === 'default') {
    document.getElementById('notifBanner').style.display = 'block';
  }
}
setTimeout(checkNotifBanner, 3000);

function requestNotifPermission() {
  if(!('Notification' in window)) {
    alert('הדפדפן לא תומך בהתראות');
    return;
  }
  Notification.requestPermission().then(function(perm) {
    console.log('🔔 [Notifications] Permission:', perm);
    document.getElementById('notifBanner').style.display = 'none';
    if(perm === 'granted') {
      setStatus('🔔 התראות הופעלו');






