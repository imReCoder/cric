/**
 * IPL NRR CALCULATOR
 * ===================
 * Calculate performance requirements to reach desired position in IPL points table
 * 
 * NRR Formula: (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)
 * 
 * Logic Verification:
 * - Win = +2 points
 * - Position decided by: Points (descending), then NRR (descending) if tied
 * - Overs format: 128.2 = 128 overs + 2 balls = 128 + 2/6 decimal overs
 * - To reach a position, need NRR > team currently at that position (if same points)
 */

// ============================================
// POINTS TABLE DATA (IPL 2022)
// ============================================

const pointsTable = {
  "Chennai Super Kings": {
    matches: 7, won: 5, lost: 2, nrr: 0.771,
    runsFor: 1130, oversFor: 133.1,
    runsAgainst: 1071, oversAgainst: 138.5,
    points: 10
  },
  "Royal Challengers Bangalore": {
    matches: 7, won: 4, lost: 3, nrr: 0.597,
    runsFor: 1217, oversFor: 140,
    runsAgainst: 1066, oversAgainst: 131.4,
    points: 8
  },
  "Delhi Capitals": {
    matches: 7, won: 4, lost: 3, nrr: 0.319,
    runsFor: 1085, oversFor: 126,
    runsAgainst: 1136, oversAgainst: 137,
    points: 8
  },
  "Rajasthan Royals": {
    matches: 7, won: 3, lost: 4, nrr: 0.331,
    runsFor: 1066, oversFor: 128.2,
    runsAgainst: 1094, oversAgainst: 137.1,
    points: 6
  },
  "Mumbai Indians": {
    matches: 8, won: 2, lost: 6, nrr: -1.75,
    runsFor: 1003, oversFor: 155.2,
    runsAgainst: 1134, oversAgainst: 138.1,
    points: 4
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert overs.balls format to decimal overs
 * @param {number} overs - Format: 128.2 (128 overs + 2 balls)
 * @returns {number} Decimal overs (128.333...)
 */
function oversToDecimal(overs) {
  const completeOvers = Math.floor(overs);
  const balls = Math.round((overs - completeOvers) * 10);
  return completeOvers + (balls / 6);
}

/**
 * Convert decimal overs back to overs.balls format
 * @param {number} decimal - Decimal overs (128.333...)
 * @returns {number} Format: 128.2 (128 overs + 2 balls)
 */
function decimalToOvers(decimal) {
  const completeOvers = Math.floor(decimal);
  const balls = Math.round((decimal - completeOvers) * 6);
  return completeOvers + (balls / 10);
}

/**
 * Calculate Net Run Rate
 * @param {number} runsFor - Total runs scored
 * @param {number} oversFor - Total overs faced
 * @param {number} runsAgainst - Total runs conceded
 * @param {number} oversAgainst - Total overs bowled
 * @returns {number} Net Run Rate
 */
function calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst) {
  const runRateFor = runsFor / oversToDecimal(oversFor);
  const runRateAgainst = runsAgainst / oversToDecimal(oversAgainst);
  return runRateFor - runRateAgainst;
}

/**
 * Calculate new NRR after a match
 * @param {Object} team - Team data from points table
 * @param {number} newRunsFor - Runs scored in new match
 * @param {number} newOversFor - Overs faced in new match
 * @param {number} newRunsAgainst - Runs conceded in new match
 * @param {number} newOversAgainst - Overs bowled in new match
 * @returns {number} New NRR after the match
 */
function calculateNewNRR(team, newRunsFor, newOversFor, newRunsAgainst, newOversAgainst) {
  const totalRunsFor = team.runsFor + newRunsFor;
  const totalOversFor = oversToDecimal(team.oversFor) + oversToDecimal(newOversFor);
  const totalRunsAgainst = team.runsAgainst + newRunsAgainst;
  const totalOversAgainst = oversToDecimal(team.oversAgainst) + oversToDecimal(newOversAgainst);
  
  return calculateNRR(totalRunsFor, totalOversFor, totalRunsAgainst, totalOversAgainst);
}

// ============================================
// CORE LOGIC FUNCTIONS
// ============================================

/**
 * Calculate new standings after a match and check if yourTeam reaches desired position
 * @returns {Object} { achievedPosition, standings, yourNRR, competitorNRRs }
 */
function calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR) {
  const teams = Object.entries(pointsTable)
    .map(([name, data]) => {
      let nrr = data.nrr;
      let points = data.points;
      
      if (name === yourTeam) {
        nrr = yourNewNRR;
        points = data.points + 2; // Win gives +2 points
      } else if (name === oppTeam) {
        nrr = oppNewNRR;
        // Opponent loses, points stay same
      }
      
      return { ...data, name, points, nrr }; // Spread data FIRST, then override
    })
    .sort((a, b) => b.points !== a.points ? b.points - a.points : b.nrr - a.nrr);
  
  const yourPosition = teams.findIndex(t => t.name === yourTeam) + 1;
  return { achievedPosition: yourPosition, standings: teams };
}

/**
 * Solve batting first scenario - find runs to restrict opponent to
 * DYNAMIC NRR: Calculates NRR for both teams based on match performance
 * Target: Achieve EXACTLY the desired position (not better, not worse)
 */
function solveBattingFirst(yourTeam, oppTeam, runsScored, matchOvers, desiredPosition) {
  const yourTeamData = pointsTable[yourTeam];
  const oppTeamData = pointsTable[oppTeam];
  
  // First, find the range where we achieve AT MOST the desired position (could be better)
  let left = 0;
  let right = runsScored - 1; // Must win
  let restrictMax = -1;
  
  // Binary search for maximum runs opponent can score while achieving desired position or better
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    // Calculate YOUR team's new NRR after this match
    const yourNewNRR = calculateNewNRR(yourTeamData, runsScored, matchOvers, mid, matchOvers);
    
    // Calculate OPPONENT's new NRR after losing this match
    const oppNewNRR = calculateNewNRR(oppTeamData, mid, matchOvers, runsScored, matchOvers);
    
    // Check if you achieve desired position with these NRRs
    const { achievedPosition } = calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR);
    
    if (achievedPosition <= desiredPosition) {
      restrictMax = mid;
      left = mid + 1; // Try allowing more runs
    } else {
      right = mid - 1;
    }
  }
  
  if (restrictMax === -1) {
    console.log("\n⚠️ Impossible to achieve desired position with this score!");
    // Let's show what happens if they restrict to 0
    const yourNewNRR = calculateNewNRR(yourTeamData, runsScored, matchOvers, 0, matchOvers);
    const oppNewNRR = calculateNewNRR(oppTeamData, 0, matchOvers, runsScored, matchOvers);
    const { achievedPosition } = calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR);
    console.log(`Even with best case (restrict to 0), you achieve position ${achievedPosition} (needed: ${desiredPosition})`);
    return null;
  }
  
  // Now find the MINIMUM restriction to avoid going ABOVE the desired position
  let restrictMin = 0;
  left = 0;
  right = restrictMax;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    const yourNewNRR = calculateNewNRR(yourTeamData, runsScored, matchOvers, mid, matchOvers);
    const oppNewNRR = calculateNewNRR(oppTeamData, mid, matchOvers, runsScored, matchOvers);
    const { achievedPosition } = calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR);
    
    if (achievedPosition === desiredPosition) {
      restrictMin = mid;
      right = mid - 1; // Try restricting more
    } else {
      left = mid + 1; // Need to allow more runs
    }
  }
  
  // Calculate NRR range for EXACT position
  const nrrMax = calculateNewNRR(yourTeamData, runsScored, matchOvers, restrictMin, matchOvers);
  const nrrMin = calculateNewNRR(yourTeamData, runsScored, matchOvers, restrictMax, matchOvers);
  
  // Calculate opponent's NRR range
  const oppNRRWhenYouGetMax = calculateNewNRR(oppTeamData, restrictMin, matchOvers, runsScored, matchOvers);
  const oppNRRWhenYouGetMin = calculateNewNRR(oppTeamData, restrictMax, matchOvers, runsScored, matchOvers);
  
  return { 
    restrictMin, 
    restrictMax, 
    nrrMin, 
    nrrMax,
    oppNRRMax: oppNRRWhenYouGetMax,
    oppNRRMin: oppNRRWhenYouGetMin
  };
}

/**
 * Solve bowling first scenario - find overs to chase in
 * DYNAMIC NRR: Calculates NRR for both teams based on match performance
 * Target: Achieve EXACTLY the desired position (not better, not worse)
 */
function solveBowlingFirst(yourTeam, oppTeam, runsToChase, matchOvers, desiredPosition) {
  const yourTeamData = pointsTable[yourTeam];
  const oppTeamData = pointsTable[oppTeam];
  const runsToScore = runsToChase + 1; // Need to score 1 more to win
  
  // First, find maximum overs to achieve AT MOST the desired position
  let left = 0.1; // Minimum 1 ball
  let right = matchOvers;
  let maxOversDecimal = -1;
  const precision = 0.01;
  
  // Binary search for maximum overs to achieve desired position or better
  while (right - left > precision) {
    const mid = (left + right) / 2;
    
    // Calculate YOUR team's new NRR after chasing in 'mid' overs
    const yourNewNRR = calculateNewNRR(yourTeamData, runsToScore, mid, runsToChase, matchOvers);
    
    // Calculate OPPONENT's new NRR after losing
    const oppNewNRR = calculateNewNRR(oppTeamData, runsToChase, matchOvers, runsToScore, mid);
    
    // Check if you achieve desired position
    const { achievedPosition } = calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR);
    
    if (achievedPosition <= desiredPosition) {
      maxOversDecimal = mid;
      left = mid; // Try slower chase
    } else {
      right = mid;
    }
  }
  
  if (maxOversDecimal === -1) {
    console.log("\n⚠️ Impossible to achieve desired position even with fastest chase!");
    return null;
  }
  
  // Now find the MINIMUM overs to avoid going ABOVE the desired position
  let minOversDecimal = 0.1;
  left = 0.1;
  right = maxOversDecimal;
  
  while (right - left > precision) {
    const mid = (left + right) / 2;
    
    const yourNewNRR = calculateNewNRR(yourTeamData, runsToScore, mid, runsToChase, matchOvers);
    const oppNewNRR = calculateNewNRR(oppTeamData, runsToChase, matchOvers, runsToScore, mid);
    const { achievedPosition } = calculateNewStandings(yourTeam, oppTeam, yourNewNRR, oppNewNRR);
    
    if (achievedPosition === desiredPosition) {
      minOversDecimal = mid;
      right = mid; // Try faster chase
    } else {
      left = mid; // Need to chase slower
    }
  }
  
  // Calculate NRR range for EXACT position
  const nrrMax = calculateNewNRR(yourTeamData, runsToScore, minOversDecimal, runsToChase, matchOvers);
  const nrrMin = calculateNewNRR(yourTeamData, runsToScore, maxOversDecimal, runsToChase, matchOvers);
  
  // Calculate opponent's NRR range
  const oppNRRWhenYouGetMax = calculateNewNRR(oppTeamData, runsToChase, matchOvers, runsToScore, minOversDecimal);
  const oppNRRWhenYouGetMin = calculateNewNRR(oppTeamData, runsToChase, matchOvers, runsToScore, maxOversDecimal);
  
  return { 
    minOversDecimal, 
    maxOversDecimal, 
    minOvers: decimalToOvers(minOversDecimal), 
    maxOvers: decimalToOvers(maxOversDecimal),
    nrrMin, 
    nrrMax,
    oppNRRMax: oppNRRWhenYouGetMax,
    oppNRRMin: oppNRRWhenYouGetMin
  };
}

// ============================================
// PUBLIC API - MAIN FUNCTION
// ============================================

/**
 * Calculate NRR performance requirements for IPL match
 * DYNAMIC NRR: Considers NRR changes for both teams
 */
function calculateNRRRequirement(params) {
  const { yourTeam, oppTeam, matchOvers, desiredPosition, tossResult, runs } = params;

  // Input validation
  if (!pointsTable[yourTeam]) {
    throw new Error(`Team "${yourTeam}" not found in points table`);
  }
  if (!pointsTable[oppTeam]) {
    throw new Error(`Team "${oppTeam}" not found in points table`);
  }
  if (!["batting", "bowling"].includes(tossResult.toLowerCase())) {
    throw new Error('tossResult must be "batting" or "bowling"');
  }
  if (matchOvers <= 0 || runs < 0) {
    throw new Error('matchOvers and runs must be positive numbers');
  }

  if (tossResult.toLowerCase() === "batting") {
    // Batting first scenario
    const result = solveBattingFirst(yourTeam, oppTeam, runs, matchOvers, desiredPosition);
    
    if (!result) return null;
    
    console.log(`\n✓ Answer:`);
    console.log(`  If ${yourTeam} scores ${runs} runs in ${matchOvers} overs, ${yourTeam} needs to restrict ${oppTeam} between ${result.restrictMin} to ${result.restrictMax} runs in ${matchOvers} overs.`);
    console.log(`  Revised NRR of ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`);
    
    return {
      scenario: "batting_first",
      yourTeam,
      oppTeam,
      runsScored: runs,
      matchOvers,
      restrictMin: result.restrictMin,
      restrictMax: result.restrictMax,
      nrrMin: result.nrrMin,
      nrrMax: result.nrrMax,
      oppNRRMin: result.oppNRRMin,
      oppNRRMax: result.oppNRRMax,
      message: `If ${yourTeam} scores ${runs} runs in ${matchOvers} overs, ${yourTeam} needs to restrict ${oppTeam} between ${result.restrictMin} to ${result.restrictMax} runs in ${matchOvers} overs.`,
      nrrMessage: `Revised NRR of ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`
    };
  } else {
    // Bowling first scenario
    const chaseTarget = runs + 1;
    const result = solveBowlingFirst(yourTeam, oppTeam, runs, matchOvers, desiredPosition);
    
    if (!result) return null;
    
    console.log(`\n✓ Answer:`);
    console.log(`  ${yourTeam} needs to chase ${chaseTarget} runs between ${result.minOvers.toFixed(1)} and ${result.maxOvers.toFixed(1)} overs.`);
    console.log(`  Revised NRR for ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`);
    
    return {
      scenario: "bowling_first",
      yourTeam,
      oppTeam,
      runsToChase: chaseTarget,
      matchOvers,
      minOvers: result.minOvers,
      maxOvers: result.maxOvers,
      minOversDecimal: result.minOversDecimal,
      maxOversDecimal: result.maxOversDecimal,
      nrrMin: result.nrrMin,
      nrrMax: result.nrrMax,
      oppNRRMin: result.oppNRRMin,
      oppNRRMax: result.oppNRRMax,
      message: `${yourTeam} needs to chase ${chaseTarget} runs between ${result.minOvers.toFixed(1)} and ${result.maxOvers.toFixed(1)} overs.`,
      nrrMessage: `Revised NRR for ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`
    };
  }
}

// ============================================
// EXAMPLE USAGE & TEST CASES
// ============================================

console.log("====================================");
console.log("IPL NRR CALCULATOR - DYNAMIC NRR");
console.log("====================================");

// Question 1a: RR vs DC - RR bats first, scores 120
console.log("\n● Q-1a: RR vs DC (RR bats first, scores 120)");
const result1a = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Delhi Capitals",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "batting",
  runs: 120
});

// Question 1b: RR vs DC - DC bats first, scores 119
console.log("\n● Q-1b: RR vs DC (DC bats first, scores 119)");
const result1b = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Delhi Capitals",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "bowling",
  runs: 119
});

// Question 2c: RR vs RCB - RR bats first, scores 80
console.log("\n● Q-2c: RR vs RCB (RR bats first, scores 80)");
const result2c = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Royal Challengers Bangalore",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "batting",
  runs: 80
});

// Question 2d: RR vs RCB - RCB bats first, scores 79
console.log("\n● Q-2d: RR vs RCB (RCB bats first, scores 79)");
const result2d = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Royal Challengers Bangalore",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "bowling",
  runs: 79
});

console.log("\n====================================");
console.log("CALCULATION COMPLETE");
console.log("====================================");
