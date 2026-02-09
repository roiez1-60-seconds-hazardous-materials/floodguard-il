module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const type = req.query.type || 'stations';
  const lang = req.query.lang || 'he';
  
  const BASE = 'https://hydro.water.gov.il/db_requests';
  const endpoints = {
    stations:     BASE + '/get_hydro_stations_A7f3Q.php',
    observations: BASE + '/get_hydro_observations_A7f3Q.php',
    rain:         BASE + '/get_rain_observations_A7f3Q.php'
  };
  
  const url = endpoints[type];
  if (!url) {
    return res.status(400).json({ error: 'Invalid type. Use: stations, observations, rain' });
  }

  try {
    const headers = {
      'X-Hydro-Client': 'hydro_obs_v2',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://hydro.water.gov.il/index.php/?page=hydro_obs&lang=he',
      'Origin': 'https://hydro.water.gov.il'
    };

    const fetchOptions = {
      method: 'POST',
      headers: headers
    };

    // stations endpoint needs lang param
    if (type === 'stations') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOptions.body = 'lang=' + lang;
    }

    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Upstream error: ' + response.status 
      });
    }

    const data = await response.text();
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    res.status(200).send(data);
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed: ' + e.message });
  }
}
