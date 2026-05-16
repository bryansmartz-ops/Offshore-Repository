/**
 * Moon Phase and Solunar Tables Calculation
 * Predicts optimal fishing times based on moon position and phase
 */

export type MoonPhase = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' |
                        'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';

export type FeedingPeriod = 'major' | 'minor';

export interface MoonData {
  phase: MoonPhase;
  phaseName: string;
  illumination: number; // 0-100%
  age: number; // days since new moon
  fishingQuality: 'excellent' | 'good' | 'fair' | 'slow';
  description: string;
}

export interface SolunarPeriod {
  type: FeedingPeriod;
  start: Date;
  end: Date;
  quality: number; // 0-100 score
}

export interface SolunarData {
  date: Date;
  moonData: MoonData;
  periods: SolunarPeriod[];
  dayScore: number; // 0-100 overall fishing quality
}

/**
 * Calculate moon phase and illumination
 */
export function getMoonPhase(date: Date = new Date()): MoonData {
  // Moon phase calculation using astronomical algorithm
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Calculate Julian date
  let jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) +
           Math.floor(275 * month / 9) + day + 1721013.5;

  // Days since known new moon (January 6, 2000)
  const daysSinceNew = jd - 2451550.1;
  const newMoons = daysSinceNew / 29.53058867; // Synodic month
  const phase = (newMoons - Math.floor(newMoons));
  const age = phase * 29.53058867;

  // Calculate illumination
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100;

  // Determine phase name
  let phaseName: MoonPhase;
  let phaseDisplay: string;
  let fishingQuality: 'excellent' | 'good' | 'fair' | 'slow';
  let description: string;

  if (phase < 0.03 || phase > 0.97) {
    phaseName = 'new';
    phaseDisplay = '🌑 New Moon';
    fishingQuality = 'excellent';
    description = 'Peak feeding activity - fish are most active during new moon';
  } else if (phase < 0.22) {
    phaseName = 'waxing-crescent';
    phaseDisplay = '🌒 Waxing Crescent';
    fishingQuality = 'good';
    description = 'Good fishing - activity increasing';
  } else if (phase < 0.28) {
    phaseName = 'first-quarter';
    phaseDisplay = '🌓 First Quarter';
    fishingQuality = 'fair';
    description = 'Moderate activity - consistent bite';
  } else if (phase < 0.47) {
    phaseName = 'waxing-gibbous';
    phaseDisplay = '🌔 Waxing Gibbous';
    fishingQuality = 'good';
    description = 'Good fishing - building to full moon';
  } else if (phase < 0.53) {
    phaseName = 'full';
    phaseDisplay = '🌕 Full Moon';
    fishingQuality = 'excellent';
    description = 'Peak feeding activity - best fishing of the month';
  } else if (phase < 0.72) {
    phaseName = 'waning-gibbous';
    phaseDisplay = '🌖 Waning Gibbous';
    fishingQuality = 'good';
    description = 'Good fishing - post-full moon activity';
  } else if (phase < 0.78) {
    phaseName = 'last-quarter';
    phaseDisplay = '🌗 Last Quarter';
    fishingQuality = 'fair';
    description = 'Moderate activity - steady bite';
  } else {
    phaseName = 'waning-crescent';
    phaseDisplay = '🌘 Waning Crescent';
    fishingQuality = 'good';
    description = 'Good fishing - building to new moon';
  }

  return {
    phase: phaseName,
    phaseName: phaseDisplay,
    illumination: Math.round(illumination),
    age: Math.round(age * 10) / 10,
    fishingQuality,
    description
  };
}

/**
 * Calculate solunar feeding periods (major and minor)
 * Based on moon transit (overhead/underfoot)
 */
export function getSolunarPeriods(date: Date = new Date(), lat: number = 38.328, lon: number = -75.089): SolunarData {
  const moonData = getMoonPhase(date);

  // Simplified solunar calculation
  // Major periods: Moon overhead (transit) and underfoot
  // Minor periods: Moon rise and set

  // Calculate moon transit time (when moon is directly overhead)
  // Approximate using lunar day (24.84 hours)
  const lunarDay = 24.84;
  const moonAge = moonData.age;

  // Moon transit occurs approximately at moonAge * lunarDay / 29.53 hours after midnight
  const transitHour = (moonAge * lunarDay / 29.53) % 24;

  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  // Major period 1: Moon overhead (transit)
  const major1Start = new Date(today);
  major1Start.setHours(Math.floor(transitHour), (transitHour % 1) * 60);
  const major1End = new Date(major1Start.getTime() + 2 * 60 * 60 * 1000); // 2 hours

  // Major period 2: Moon underfoot (12 hours after transit)
  const major2Start = new Date(major1Start.getTime() + 12 * 60 * 60 * 1000);
  const major2End = new Date(major2Start.getTime() + 2 * 60 * 60 * 1000);

  // Minor period 1: Moonrise (approximately 6 hours before transit)
  const minor1Start = new Date(major1Start.getTime() - 6 * 60 * 60 * 1000);
  const minor1End = new Date(minor1Start.getTime() + 1 * 60 * 60 * 1000); // 1 hour

  // Minor period 2: Moonset (approximately 6 hours after transit)
  const minor2Start = new Date(major1Start.getTime() + 6 * 60 * 60 * 1000);
  const minor2End = new Date(minor2Start.getTime() + 1 * 60 * 60 * 1000);

  // Calculate quality scores based on moon phase
  let phaseBonus = 0;
  if (moonData.fishingQuality === 'excellent') phaseBonus = 25;
  else if (moonData.fishingQuality === 'good') phaseBonus = 15;
  else if (moonData.fishingQuality === 'fair') phaseBonus = 5;

  const periods: SolunarPeriod[] = [
    { type: 'major', start: major1Start, end: major1End, quality: 75 + phaseBonus },
    { type: 'major', start: major2Start, end: major2End, quality: 75 + phaseBonus },
    { type: 'minor', start: minor1Start, end: minor1End, quality: 50 + phaseBonus },
    { type: 'minor', start: minor2Start, end: minor2End, quality: 50 + phaseBonus },
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Calculate overall day score
  const baseScore = moonData.fishingQuality === 'excellent' ? 90 :
                    moonData.fishingQuality === 'good' ? 75 :
                    moonData.fishingQuality === 'fair' ? 60 : 50;

  return {
    date,
    moonData,
    periods,
    dayScore: baseScore
  };
}

/**
 * Get the next 4 upcoming feeding periods (may include tomorrow/next day)
 */
export function getUpcomingPeriods(lat: number = 38.328, lon: number = -75.089): SolunarPeriod[] {
  const now = new Date();
  const allPeriods: SolunarPeriod[] = [];

  // Generate periods for today, tomorrow, and day after (to ensure we have enough future periods)
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    const solunarData = getSolunarPeriods(date, lat, lon);
    allPeriods.push(...solunarData.periods);
  }

  // Filter to only future periods and sort by start time
  let futurePeriods = allPeriods
    .filter(p => p.end > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Remove overlapping periods (keep the earlier one)
  const nonOverlappingPeriods: SolunarPeriod[] = [];
  for (const period of futurePeriods) {
    // Check if this period overlaps with any already added period
    const hasOverlap = nonOverlappingPeriods.some(existing => {
      // Periods overlap if one starts before the other ends
      return (period.start < existing.end && period.end > existing.start);
    });

    if (!hasOverlap) {
      nonOverlappingPeriods.push(period);
    }
  }

  // Take next 4 non-overlapping periods
  return nonOverlappingPeriods.slice(0, 4);
}

/**
 * Get the next upcoming feeding period
 */
export function getNextFeedingPeriod(solunarData: SolunarData): SolunarPeriod | null {
  const now = new Date();
  return solunarData.periods.find(p => p.end > now) || null;
}

/**
 * Check if currently in a feeding period
 */
export function isInFeedingPeriod(solunarData: SolunarData): SolunarPeriod | null {
  const now = new Date();
  return solunarData.periods.find(p => p.start <= now && p.end >= now) || null;
}

/**
 * Check if currently in any of the given periods
 */
export function isInAnyPeriod(periods: SolunarPeriod[]): SolunarPeriod | null {
  const now = new Date();
  return periods.find(p => p.start <= now && p.end >= now) || null;
}

/**
 * Format time with date if not today
 */
export function formatPeriodTimeWithDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) return timeStr;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${timeStr}`;
}

/**
 * Format time for display
 */
export function formatPeriodTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
