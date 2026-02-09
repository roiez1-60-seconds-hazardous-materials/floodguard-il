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

