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
  if(r>=75) return '#ef4444';
  if(r>=60) return '#f59e0b';
  if(r>=45) return '#3b82f6';
  return '#22c55e';
}

function mkIcon(color, sz) {
  sz = sz || 10;
  return L.divIcon({
    className:'',
    html:'<div style="width:'+sz+'px;height:'+sz+'px;background:'+color+';border:2px solid rgba(0,0,0,.3);border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.3)"></div>',
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
  
  var directUrl = getIMSRadarUrl();
  var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(directUrl);
  
  // Try multiple timestamps (current, -5min, -10min, -15min)
  tryLoadImage(proxyUrl, 0);
}

function tryLoadImage(baseProxyUrl, attempt) {
  if(attempt > 5) {
    setStatus('⚠️ לא נמצאה תמונת מכ"מ עדכנית');
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
  var imsUrl = IMS_RADAR_BASE + ts + '_0.png';
  var proxyUrl = PROXY_BASE + '?url=' + encodeURIComponent(imsUrl);
  
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    // Success! Show on map
    if(imsOverlay) map.removeLayer(imsOverlay);
    imsOverlay = L.imageOverlay(img.src, IMS_BOUNDS, {opacity: 0.6}).addTo(map);
    
    // Store image data for analysis
    var cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    var ctx = cvs.getContext('2d');
    ctx.drawImage(img,0,0);
    radarImageData = ctx.getImageData(0,0,cvs.width,cvs.height);
    
    // Show timestamp
    var localTime = now.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    document.getElementById('radarTimeVal').textContent = localTime + ' UTC';
    document.getElementById('radarTime').style.display = 'block';
    document.getElementById('btnRefresh').style.display = 'block';
    
    setStatus('📡 מכ"מ שמ"ט נטען — ' + localTime + ' UTC');
    
    // Auto-analyze colors and log to console
    debugColorTable(radarImageData, 'IMS Radar ' + ts);
  };
  img.onerror = function() {
    // Try older timestamp
    tryLoadImage(baseProxyUrl, attempt + 1);
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
  
  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if(!data.radar || !data.radar.past || data.radar.past.length === 0) {
        setStatus('⚠️ RainViewer — אין נתונים זמינים');
        return;
      }
      // Use most recent past radar frame
      var latest = data.radar.past[data.radar.past.length - 1];
      rvTimestamp = latest.time;
      var host = data.host || 'https://tilecache.rainviewer.com';
      var path = latest.path;
      
      // Add color tile layer for display (scheme 2 = Universal Blue)
      if(rvTileLayer) map.removeLayer(rvTileLayer);
      var tileUrl = host + path + '/256/{z}/{x}/{y}/2/1_1.png';
      rvTileLayer = L.tileLayer(tileUrl, {
        opacity: 0.65,
        zIndex: 400,
        maxZoom: 7 // free tier limit since Jan 2026
      }).addTo(map);
      
      // Also fetch a composite image for pixel analysis
      // Use BW scheme (color=0) for direct dBZ decode
      var bwTileUrl = host + path + '/256/{z}/{x}/{y}/0/0_0.png';
      fetchRainViewerForAnalysis(host, path);
      
      var t = new Date(rvTimestamp * 1000).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
      document.getElementById('radarTimeVal').textContent = t + ' (RainViewer)';
      document.getElementById('radarTime').style.display = 'block';
      document.getElementById('btnRefresh').style.display = 'block';
      setStatus('🌧️ RainViewer נטען — ' + t);
    })
    .catch(function(e) {
      setStatus('⚠️ RainViewer שגיאה: ' + e.message);
    });
}

function fetchRainViewerForAnalysis(host, path) {
  // Fetch BW tiles covering Israel (zoom 5 covers well)
  // Israel at z=5: x=18-19, y=12-13
  var z = 5;
  var tiles = [{x:19,y:12},{x:19,y:13},{x:18,y:12},{x:18,y:13}];
  var canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  var ctx = canvas.getContext('2d');
  var loaded = 0;
  
  tiles.forEach(function(t, idx) {
    var url = host + path + '/256/' + z + '/' + t.x + '/' + t.y + '/0/0_0.png';
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var dx = (idx % 2) * 256;
      var dy = Math.floor(idx / 2) * 256;
      ctx.drawImage(img, dx, dy);
      loaded++;
      if(loaded === tiles.length) {
        radarImageData = ctx.getImageData(0, 0, 512, 512);
        debugColorTable(radarImageData, 'RainViewer BW');
        // Update bounds to match these tiles
        // z=5 tiles: calculate lat/lon bounds
        // Tile 18,12 to 19,13 at z=5
        // Using standard slippy map math
        IMS_BOUNDS[0][0] = tileLat(14, z); // south
        IMS_BOUNDS[1][0] = tileLat(12, z); // north  
        IMS_BOUNDS[0][1] = tileLon(18, z); // west
        IMS_BOUNDS[1][1] = tileLon(20, z); // east
      }
    };
    img.onerror = function() { loaded++; };
    img.src = '/api/proxy?url=' + encodeURIComponent(url);
  });
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
    
    if(src==='ims') { radarSource = 'ims'; loadIMSRadar(); }
    if(src==='rainviewer') { radarSource = 'rainviewer_bw'; loadRainViewer(); }
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
  var latMin = IMS_BOUNDS[0][0], latMax = IMS_BOUNDS[1][0];
  var lonMin = IMS_BOUNDS[0][1], lonMax = IMS_BOUNDS[1][1];
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
  if(!activeSrc && !radarImageData) { alert('בחר מקור מכ"מ קודם (שמ"ט או Windy) או העלה תמונה'); return; }

  var btn = document.getElementById('btnRun');
  btn.textContent = '⏳ מנתח...';
  btn.disabled = true;

  var useRealData = radarImageData != null;

  setTimeout(function() {
    for(var k in alerts) delete alerts[k];
    var cM=0, cH=0, cE=0;
    var analysisDetails = {};

    S.forEach(function(s) {
      var mmhr = 0;
      var detail = null;

      if(useRealData) {
        // REAL analysis with enhanced engine
        var stats = sampleRadarAtLocation(radarImageData, s.la, s.lo, 6);
        var score = computeAlertScore(stats, s.r);
        mmhr = score.effective;
        detail = {
          avgMm: stats.avgMmHr.toFixed(1),
          maxMm: stats.maxMmHr.toFixed(1),
          p90Mm: stats.p90MmHr.toFixed(1),
          cover: (stats.coverage * 100).toFixed(0),
          effMm: score.effective.toFixed(1),
          rawMm: score.mmhr.toFixed(1)
        };
      } else {
        // Simulated (Windy iframe)
        var rand = Math.random();
        var thresh = s.r / 100;
        if(rand < thresh * 0.3) {
          if(s.r>=80 && rand<0.1) mmhr = 40 + Math.random()*30;
          else if(s.r>=65 && rand<0.2) mmhr = 25 + Math.random()*15;
          else mmhr = 15 + Math.random()*10;
        }
      }

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
      html += '</div>';
    });

    var modeText = useRealData ? '(ניתוח אמיתי מתמונת מכ"מ)' : '(סימולציה — Windy)';
    document.getElementById('alertCards').innerHTML = html || '<p class="hint">✅ לא זוהו התראות ' + modeText + '</p>';

    renderList(document.getElementById('search')?.value || '');
    if(cE > 0) playSound();

    btn.textContent = '⚡ נתח';
    btn.disabled = false;

    var t = new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    setStatus('ניתוח הושלם '+t+' | '+(cM+cH+cE)+' התראות ' + modeText);
    showTab('alerts', document.querySelector('.tab'));
  }, useRealData ? 500 : 1200);
}

var uploadSrcChoice = 'ims'; // default for manual uploads

function setUploadSrc(src) {
  uploadSrcChoice = src;
  document.querySelectorAll('.srcBtn').forEach(function(b){b.classList.remove('on')});
  document.getElementById(src==='ims'?'srcIms':src==='govmap'?'srcGov':'srcRv').classList.add('on');
}

// ============================================================
// FILE UPLOAD
// ============================================================
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
      
      // Store as radar data for analysis
      radarImageData = ctx.getImageData(0,0,c.width,c.height);
      
      // Also overlay on map
      if(imsOverlay) map.removeLayer(imsOverlay);
      imsOverlay = L.imageOverlay(e.target.result, IMS_BOUNDS, {opacity:0.6}).addTo(map);
      
      // Set radar source based on user selection
      activeSrc = 'upload';
      radarSource = uploadSrcChoice;
      
      var scaleLabel = radarSource==='govmap' ? 'מ"מ/10 דק\'' : radarSource==='rainviewer' ? 'Universal Blue (dBZ)' : 'שמ"ט (dBZ)';
      
      // Count colored pixels
      var d = radarImageData.data;
      var red=0, org=0, ylw=0, grn=0, tot=c.width*c.height;
      for(var i=0;i<d.length;i+=4) {
        if(d[i+3]<100) continue;
        var r=d[i], g=d[i+1], b=d[i+2];
        if(r>200&&g<80&&b<80) red++;
        else if(r>200&&g>100&&g<180&&b<80) org++;
        else if(r>200&&g>200&&b<100) ylw++;
        else if(g>150&&r<100&&b<100) grn++;
      }
      
      document.getElementById('uploadRes').innerHTML =
        '<div style="background:var(--card);border:1px solid var(--brd);border-radius:8px;padding:12px;font-size:12px;line-height:1.8;margin-top:8px">'+
        '<b>תוצאות סריקה</b> — סקלה: '+scaleLabel+'<br>'+
        '📐 '+img.width+'×'+img.height+' פיקסלים<br>'+
        '🔴 כבד מאוד (40+): '+red.toLocaleString()+' px<br>'+
        '🟠 חזק (25-40): '+org.toLocaleString()+' px<br>'+
        '🟡 בינוני (15-25): '+ylw.toLocaleString()+' px<br>'+
        '🟢 קל: '+grn.toLocaleString()+' px<br>'+
        '<div style="margin-top:6px;padding:6px;background:rgba(59,130,246,.1);border-radius:6px;color:var(--ac)">'+
        '💡 התמונה הוצבה על המפה. לחץ "⚡ נתח" לניתוח מלא</div></div>';
      
      setStatus('📤 תמונה הועלתה ('+scaleLabel+') — מוכנה לניתוח');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
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
  setTimeout(function() {
    if(radarImageData) {
      analyze();
    }
  }, 4000); // give 4 seconds for tiles to load
}

// === INIT ===
renderList();
