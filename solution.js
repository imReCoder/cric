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
 * Get target NRR threshold to reach desired position
 * Logic: After winning (+2 points), compare with teams at desired position with same points
 */
function getTargetNRRForPosition(yourTeam, desiredPosition) {
  const teamData = pointsTable[yourTeam];
  const newPoints = teamData.points + 2; // Points after winning
  
  // Create sorted standings
  const teams = Object.entries(pointsTable)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.points !== a.points ? b.points - a.points : b.nrr - a.nrr);
  
  // Display current standings
  console.log("\nCurrent Points Table:");
  teams.forEach((team, idx) => {
    console.log(`${idx + 1}. ${team.name} - Points: ${team.points}, NRR: ${team.nrr.toFixed(3)}`);
  });
  
  // Find teams with same points after winning
  const teamsWithSamePoints = teams.filter(t => t.name !== yourTeam && t.points === newPoints);
  
  console.log(`\nAfter winning, ${yourTeam} will have ${newPoints} points.`);
  if (teamsWithSamePoints.length > 0) {
    console.log(`Teams with same points (${newPoints}):`);
    teamsWithSamePoints.forEach(t => console.log(`  - ${t.name}: NRR = ${t.nrr.toFixed(3)}`));
  }
  
  // Determine target NRR
  const targetTeam = teams[desiredPosition - 1];
  const targetNRR = targetTeam.points === newPoints 
    ? targetTeam.nrr 
    : Math.max(...teamsWithSamePoints.map(t => t.nrr));
  
  console.log(`\nTo reach position ${desiredPosition}, ${yourTeam} needs NRR > ${targetNRR.toFixed(3)} (${targetTeam.name}'s NRR)`);
  return targetNRR;
}

/**
 * Solve batting first scenario - find runs to restrict opponent to
 * Uses binary search for efficiency: O(log n) instead of O(n)
 */
function solveBattingFirst(yourTeam, runsScored, matchOvers, targetNRR) {
  const team = pointsTable[yourTeam];
  let left = 0;
  let right = runsScored - 1; // Must win
  let restrictMax = -1;
  
  // Binary search for maximum runs opponent can score while still beating target NRR
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const newNRR = calculateNewNRR(team, runsScored, matchOvers, mid, matchOvers);
    
    if (newNRR > targetNRR) {
      restrictMax = mid;
      left = mid + 1; // Try allowing more runs
    } else {
      right = mid - 1;
    }
  }
  
  if (restrictMax === -1) {
    console.log("\n⚠️ Impossible to achieve target NRR with this score!");
    return null;
  }
  
  // Calculate NRR range
  const restrictMin = 0;
  const nrrMax = calculateNewNRR(team, runsScored, matchOvers, restrictMin, matchOvers);
  const nrrMin = calculateNewNRR(team, runsScored, matchOvers, restrictMax, matchOvers);
  
  return { restrictMin, restrictMax, nrrMin, nrrMax };
}

/**
 * Solve bowling first scenario - find overs to chase in
 * Uses binary search with floating point precision
 */
function solveBowlingFirst(yourTeam, runsToChase, matchOvers, targetNRR) {
  const team = pointsTable[yourTeam];
  const runsToScore = runsToChase + 1; // Need to score 1 more to win
  
  let left = 0.1; // Minimum 1 ball (0.1 decimal overs)
  let right = matchOvers;
  let maxOversDecimal = -1;
  const precision = 0.01;
  
  // Binary search for maximum overs (slowest chase that still beats target NRR)
  while (right - left > precision) {
    const mid = (left + right) / 2;
    const newNRR = calculateNewNRR(team, runsToScore, mid, runsToChase, matchOvers);
    
    if (newNRR > targetNRR) {
      maxOversDecimal = mid;
      left = mid; // Try slower chase
    } else {
      right = mid;
    }
  }
  
  if (maxOversDecimal === -1) {
    console.log("\n⚠️ Impossible to achieve target NRR even with fastest chase!");
    return null;
  }
  
  // Calculate NRR range
  const minOversDecimal = 0.1;
  const nrrMax = calculateNewNRR(team, runsToScore, minOversDecimal, runsToChase, matchOvers);
  const nrrMin = calculateNewNRR(team, runsToScore, maxOversDecimal, runsToChase, matchOvers);
  
  return { 
    minOversDecimal, 
    maxOversDecimal, 
    minOvers: decimalToOvers(minOversDecimal), 
    maxOvers: decimalToOvers(maxOversDecimal),
    nrrMin, 
    nrrMax 
  };
}

// ============================================
// PUBLIC API - MAIN FUNCTION
// ============================================

/**
 * Calculate NRR performance requirements for IPL match
 * @param {Object} params - Input parameters
 * @param {string} params.yourTeam - Your team name
 * @param {string} params.oppTeam - Opposition team name
 * @param {number} params.matchOvers - Total overs in match (usually 20)
 * @param {number} params.desiredPosition - Target position in points table (1-5)
 * @param {string} params.tossResult - "batting" or "bowling"
 * @param {number} params.runs - Runs scored (if batting) OR opponent's runs (if bowling)
 * @returns {Object|null} Result object with performance requirements and NRR range
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

  // Get target NRR threshold
  const targetNRR = getTargetNRRForPosition(yourTeam, desiredPosition);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Match: ${yourTeam} vs ${oppTeam}`);
  console.log(`Toss: ${yourTeam} ${tossResult} first`);
  console.log(`Match Overs: ${matchOvers}`);
  console.log(`${"=".repeat(60)}`);

  if (tossResult.toLowerCase() === "batting") {
    // Batting first scenario
    console.log(`\n${yourTeam} bats first and scores ${runs} runs in ${matchOvers} overs`);
    const result = solveBattingFirst(yourTeam, runs, matchOvers, targetNRR);
    
    if (!result) return null;
    
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
      message: `If ${yourTeam} scores ${runs} runs in ${matchOvers} overs, ${yourTeam} needs to restrict ${oppTeam} between ${result.restrictMin} to ${result.restrictMax} runs in ${matchOvers} overs.`,
      nrrMessage: `Revised NRR of ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`
    };
  } else {
    // Bowling first scenario
    const chaseTarget = runs + 1;
    console.log(`\n${oppTeam} bats first and scores ${runs} runs in ${matchOvers} overs`);
    console.log(`${yourTeam} needs to chase ${chaseTarget} runs to win`);
    const result = solveBowlingFirst(yourTeam, runs, matchOvers, targetNRR);
    
    if (!result) return null;
    
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
      message: `${yourTeam} needs to chase ${chaseTarget} runs between ${result.minOvers.toFixed(1)} and ${result.maxOvers.toFixed(1)} overs.`,
      nrrMessage: `Revised NRR for ${yourTeam} will be between ${result.nrrMin.toFixed(3)} to ${result.nrrMax.toFixed(3)}.`
    };
  }
}

// ============================================
// EXAMPLE USAGE & TEST CASES
// ============================================

console.log("====================================");
console.log("IPL NRR CALCULATOR");
console.log("====================================");

// Question 1a: RR vs DC - RR bats first, scores 120
console.log("\n\n*** QUESTION 1a ***");
const result1a = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Delhi Capitals",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "batting",
  runs: 120
});
if (result1a) {
  console.log(`\n✓ ${result1a.message}`);
  console.log(`✓ ${result1a.nrrMessage}`);
}

// Question 1b: RR vs DC - DC bats first, scores 119
console.log("\n\n*** QUESTION 1b ***");
const result1b = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Delhi Capitals",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "bowling",
  runs: 119
});
if (result1b) {
  console.log(`\n✓ ${result1b.message}`);
  console.log(`✓ ${result1b.nrrMessage}`);
}

// Question 2c: RR vs RCB - RR bats first, scores 80
console.log("\n\n*** QUESTION 2c ***");
const result2c = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Royal Challengers Bangalore",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "batting",
  runs: 80
});
if (result2c) {
  console.log(`\n✓ ${result2c.message}`);
  console.log(`✓ ${result2c.nrrMessage}`);
}

// Question 2d: RR vs RCB - RCB bats first, scores 79
console.log("\n\n*** QUESTION 2d ***");
const result2d = calculateNRRRequirement({
  yourTeam: "Rajasthan Royals",
  oppTeam: "Royal Challengers Bangalore",
  matchOvers: 20,
  desiredPosition: 3,
  tossResult: "bowling",
  runs: 79
});
if (result2d) {
  console.log(`\n✓ ${result2d.message}`);
  console.log(`✓ ${result2d.nrrMessage}`);
}

console.log("\n====================================");
console.log("CALCULATION COMPLETE");
console.log("====================================");
