// Handle debug mode - returns raw HTML preview
    if (type === 'debug') {
      const debugUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
      console.log('Fetching debug HTML from:', debugUrl)
      
      const response = await fetch(debugUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      console.log('Debug HTML length:', html.length)
      
      return res.status(200).json({
        success: true,
        type: 'debug',
        preview: html.slice(0, 1400), // First 1400 characters for debugging
        meta: {
          eventId,
          url: debugUrl,
          htmlLength: html.length,
          lastUpdated: new Date().toISOString()
        }
      })
    }

    let orcUrl
    
    switch (type) {
      case 'series':
        if (!classId) return res.status(400).json({ success: false, message: 'Missing classId for series' })
        orcUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`
        break
        
      case 'index':
        orcUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
        break
        
      case 'race':
        if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId for race' })
        orcUrl = classId 
          ? `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&classid=${classId}&raceid=${raceId}`
          : `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=${raceId}`
        break
        
      default:
        return res.status(400).json({ success: false, message: 'Invalid type' })
    }
