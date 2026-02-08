export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow IMS and RainViewer domains
  const allowed = ['ims.gov.il', 'rainviewer.com', 'tilecache.rainviewer.com'];
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!allowed.some(d => hostname.endsWith(d))) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'Referer': 'https://ims.gov.il/he/RadarSatellite'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error: ' + response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Content-Type', contentType);
    res.status(200).send(buffer);
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed: ' + e.message });
  }
}







