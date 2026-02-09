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
    if(cE > 0) playSound('extreme');
    else if(cH > 0) playSound('heavy');
    else if(cM > 0) playSound('moderate');

    // Record to history and update dashboard
    recordAnalysis(cM, cH, cE);
    showDashboard();

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

