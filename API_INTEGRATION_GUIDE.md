# API Integration Guide

This app is designed to aggregate data from multiple marine intelligence sources to provide AI-driven fishing predictions. Currently using mock data for demonstration.

## Data Sources to Integrate

### 1. RipCharts
**Purpose**: Satellite sea surface temperature and chlorophyll data
**Integration Points**:
- `/components/PredictionsView.tsx` - Fetch SST imagery and temperature breaks
- API endpoint needed: Temperature gradients, SST maps, thermal boundaries

**Data to Extract**:
- Sea surface temperature (SST) values
- Temperature gradient locations (breaks/edges)
- Chlorophyll concentration levels
- Weed line positions

**Example API Structure**:
```javascript
// In production, replace mock data with:
const ripChartsData = await fetch('https://api.ripcharts.com/v1/sst', {
  headers: { 'Authorization': `Bearer ${process.env.RIPCHARTS_API_KEY}` },
  body: JSON.stringify({
    lat: 26.4,
    lon: -80.05,
    radius: 50 // miles
  })
});
```

---

### 2. Nautide Pro
**Purpose**: Tide predictions, currents, solunar data, and marine forecasts
**Integration Points**:
- `/components/TideView.tsx` - Tide schedules
- `/components/FishActivity.tsx` - Solunar tables and fish activity windows
- `/components/PredictionsView.tsx` - Current strength and direction

**Data to Extract**:
- Tide times and heights
- Current speed and direction
- Moon phase data and illumination percentage
- Solunar major/minor periods (optimal fishing times)
- Sunrise/sunset times
- Moonrise/moonset times
- Daily fishing rating (1-5 scale)

**Example API Structure**:
```javascript
// Tide data
const nautideData = await fetch('https://api.nautide.com/v1/tides', {
  params: {
    lat: 38.33,
    lon: -75.09,
    days: 1
  }
});

// Solunar data
const solunarData = await fetch('https://api.nautide.com/v1/solunar', {
  params: {
    lat: 38.33,
    lon: -75.09,
    date: '2026-05-14'
  }
});
```

**Solunar Data Structure Expected**:
- **Major Periods**: 2 per day (moon overhead/underfoot) - ~2 hour windows
- **Minor Periods**: 2 per day (moonrise/moonset) - ~1 hour windows
- Each period includes: start time, end time, peak time
- Overall daily fishing rating based on moon phase and position

---

### 3. Satfish (Satellite Fishing Data)
**Purpose**: Satellite imagery for baitfish, weed lines, and water clarity
**Integration Points**:
- `/components/PredictionsView.tsx` - Hotspot analysis

**Data to Extract**:
- Satellite imagery showing weed concentrations
- Water clarity/visibility measurements
- Baitfish aggregation indicators
- Color change boundaries

**Example API Structure**:
```javascript
const satfishData = await fetch('https://api.satfish.com/v1/analysis', {
  headers: { 'X-API-Key': process.env.SATFISH_API_KEY },
  params: {
    region: 'florida_east',
    features: ['weeds', 'clarity', 'chlorophyll']
  }
});
```

---

### 4. ROFFS (Roffer's Ocean Fishing Forecasting Service)
**Purpose**: Professional fishing forecasts and oceanographic analysis
**Integration Points**:
- `/components/PredictionsView.tsx` - Professional forecast integration
- `/components/HotspotCard.tsx` - Detailed analysis reasons

**Data to Extract**:
- Recommended fishing zones
- Oceanographic feature analysis
- Species-specific predictions
- Current and eddy formations

**Example API Structure**:
```javascript
const roffsData = await fetch('https://api.roffs.com/v1/forecast', {
  headers: { 'Authorization': `Bearer ${process.env.ROFFS_API_KEY}` },
  params: {
    region: 'southeast_florida',
    target_species: ['mahi', 'tuna', 'wahoo']
  }
});
```

---

## AI Analysis Algorithm

The prediction engine should combine all data sources to score potential fishing locations:

### Scoring Factors (weighted):
1. **Temperature Breaks** (25%) - Sharp SST gradients indicate convergence zones
2. **Chlorophyll/Bait** (20%) - Higher chlorophyll = more baitfish
3. **Current Edges** (15%) - Current breaks create feeding zones
4. **Historical Catches** (15%) - User's past success in similar conditions
5. **Species Preferences** (10%) - Match conditions to target species behavior
6. **Weed Lines** (10%) - Sargassum attracts pelagics
7. **Moon Phase** (5%) - Certain phases favor specific species

### Implementation Location:
`/src/utils/predictionEngine.ts` (to be created)

```typescript
export function analyzeFishingHotspots(
  ripCharts: RipChartsData,
  nautide: NautideData,
  satfish: SatfishData,
  roffs: RoffsData,
  userPreferences: UserPreferences
): Hotspot[] {
  // Score each potential location
  // Weight factors based on target species
  // Filter by vessel range
  // Return top 5 hotspots sorted by confidence
}
```

---

## Environment Variables Required

Create a `.env` file with:

```bash
# API Keys
RIPCHARTS_API_KEY=your_ripcharts_key
NAUTIDE_API_KEY=your_nautide_key
SATFISH_API_KEY=your_satfish_key
ROFFS_API_KEY=your_roffs_key

# Optional: NOAA, Weather Services
NOAA_API_KEY=your_noaa_key
OPENWEATHER_API_KEY=your_weather_key
```

---

## Data Refresh Intervals

- **RipCharts**: Every 15 minutes (satellite passes)
- **Nautide**: Every hour (tide predictions are static daily)
- **Satfish**: Every 30 minutes (imagery updates)
- **ROFFS**: Twice daily (morning/evening forecasts)

---

## Next Steps for Production

1. Obtain API keys from each service
2. Create `/src/services/` directory with integration files:
   - `ripcharts.service.ts`
   - `nautide.service.ts`
   - `satfish.service.ts`
   - `roffs.service.ts`
3. Create `/src/utils/predictionEngine.ts` for AI analysis
4. Add error handling and fallback logic
5. Implement caching to reduce API calls
6. Add real-time data refresh in background
7. Store historical catch data to improve predictions
8. Add machine learning model to improve scoring over time

---

## Cost Considerations

These are professional marine services with subscription costs:
- Budget for API access fees
- Consider usage limits and request throttling
- Implement efficient caching strategy
- Only fetch data when user actively viewing predictions
