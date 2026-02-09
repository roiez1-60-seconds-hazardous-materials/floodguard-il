// ============================================================
// UTILS
// ============================================================
function setStatus(msg) {
  document.getElementById('statusMsg').textContent = msg;
}

// ============================================================
// FEATURE 4: ENHANCED ALERT SOUND SYSTEM
// Different tones per severity: moderate=gentle, heavy=urgent, extreme=alarm
// ============================================================
var soundEnabled = true;
var lastSoundTime = 0;

function playSound(level) {
  if(!soundEnabled) return;
  var now = Date.now();
  if(now - lastSoundTime < 3000) return; // debounce 3s
  lastSoundTime = now;
  
  level = level || 'moderate';
  try {
    var c = new (window.AudioContext||window.webkitAudioContext)();
    
    if(level === 'extreme') {
      // ALARM: triple rising tone, loud
      playTone(c, 0, 660, 0.35, 0.15);
      playTone(c, 0.18, 880, 0.35, 0.15);
      playTone(c, 0.36, 1100, 0.4, 0.2);
      playTone(c, 0.6, 660, 0.35, 0.15);
      playTone(c, 0.78, 880, 0.35, 0.15);
      playTone(c, 0.96, 1100, 0.4, 0.25);
    } else if(level === 'heavy') {
      // WARNING: two-tone siren
      playTone(c, 0, 800, 0.3, 0.2);
      playTone(c, 0.25, 600, 0.3, 0.2);
      playTone(c, 0.5, 800, 0.3, 0.2);
    } else {
      // NOTICE: gentle single ping
      playTone(c, 0, 523, 0.2, 0.3);
      playTone(c, 0.15, 659, 0.15, 0.2);
    }
  } catch(e){}
}

function playTone(ctx, delay, freq, vol, dur) {
  var o = ctx.createOscillator();
  var g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  o.type = 'sine';
  g.gain.setValueAtTime(vol, ctx.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  o.start(ctx.currentTime + delay);
  o.stop(ctx.currentTime + delay + dur + 0.05);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  var btn = document.getElementById('btnSound');
  if(btn) {
    btn.textContent = soundEnabled ? '🔔' : '🔕';
    btn.title = soundEnabled ? 'השתק התראות' : 'הפעל צלילים';
  }
  setStatus(soundEnabled ? '🔔 צלילים מופעלים' : '🔕 צלילים מושתקים');
}

function testSound() {
  playSound('extreme');
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
      // Test notification
      sendNotification('FloodGuard IL', 'התראות הופעלו בהצלחה ✅');
    }
  });
}

function sendNotification(title, body) {
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    // Use service worker notification if available (works when app is closed)
    if(navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function(reg) {
        reg.showNotification(title, {
          body: body,
          icon: '🌧️',
          badge: '⚠️',
          tag: 'floodguard-alert',
          renotify: true,
          vibrate: [200, 100, 200]
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, { body: body, tag: 'floodguard-alert' });
    }
  } catch(e) {
    console.warn('🔔 Notification error:', e);
  }
}

// ============================================================
// HOOK: Store frames after analysis & send notifications
// ============================================================
var _origAnalyze = analyze;
analyze = function() {
  _origAnalyze();
  // After analysis completes (inside setTimeout), store frame
  setTimeout(function() {
    if(radarImageData) {
      storeFrame();
      
      // Send push notifications for extreme alerts
      var extremeAlerts = [];
      for(var name in alerts) {
        if(alerts[name].lv === 'extreme' || alerts[name].lv === 'heavy') {
          extremeAlerts.push(name + ' (' + alerts[name].mm + ' מ"מ/שעה)');
        }
      }
      if(extremeAlerts.length > 0) {
        sendNotification('⚠️ התראת הצפה — ' + extremeAlerts.length + ' יישובים', 
          extremeAlerts.slice(0, 3).join(', '));
      }
      
      // If user located, check their area specifically
      if(userNearestSettlement && alerts[userNearestSettlement]) {
        var a = alerts[userNearestSettlement];
        sendNotification('🚨 גשם כבד ליד המיקום שלך!', 
          userNearestSettlement + ': ' + a.he + ' — ' + a.mm + ' מ"מ/שעה');
      }
    }
  }, 800);
};

// ============================================================
