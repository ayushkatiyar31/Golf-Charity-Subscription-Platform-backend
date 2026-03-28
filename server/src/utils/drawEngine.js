const PLAN_PRICES = {
  monthly: 29,
  yearly: 299
};

const MATCH_SPLITS = {
  5: 0.4,
  4: 0.35,
  3: 0.25
};

const uniqueRandomNumbers = () => {
  const values = new Set();
  while (values.size < 5) {
    values.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(values).sort((a, b) => a - b);
};

const frequencyNumbers = (users) => {
  const counts = new Map();
  users.forEach((user) => {
    (user.scores || []).forEach((score) => {
      counts.set(score.value, (counts.get(score.value) || 0) + 1);
    });
  });

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 5)
    .map(([value]) => value);

  if (sorted.length < 5) {
    const filler = uniqueRandomNumbers().filter((value) => !sorted.includes(value));
    sorted.push(...filler.slice(0, 5 - sorted.length));
  }

  return sorted.sort((a, b) => a - b);
};

const countMatches = (entryScores, winningNumbers) => {
  const available = [...winningNumbers];
  let matches = 0;

  entryScores.forEach((score) => {
    const index = available.indexOf(score);
    if (index !== -1) {
      matches += 1;
      available.splice(index, 1);
    }
  });

  return matches;
};

export const getPlanAmount = (plan) => PLAN_PRICES[plan] || PLAN_PRICES.monthly;

export const buildDrawOutcome = ({ users, logic = 'random', rollover = 0 }) => {
  const winningNumbers = logic === 'algorithm' ? frequencyNumbers(users) : uniqueRandomNumbers();
  const activeUsers = users.filter((user) => user.subscription?.status === 'active');

  const entries = activeUsers
    .map((user) => {
      const scoreValues = [...(user.scores || [])]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map((score) => score.value);

      if (!scoreValues.length) {
        return null;
      }

      return {
        user: user._id,
        scoreValues,
        matchCount: countMatches(scoreValues, winningNumbers)
      };
    })
    .filter(Boolean);

  const basePool = activeUsers.reduce((sum, user) => sum + (user.subscription?.amount || 0), 0);
  const totalPool = basePool + rollover;

  const winnerBuckets = {
    5: entries.filter((entry) => entry.matchCount === 5),
    4: entries.filter((entry) => entry.matchCount === 4),
    3: entries.filter((entry) => entry.matchCount === 3)
  };

  let rolloverToNext = 0;
  const prizeMap = {};

  [5, 4, 3].forEach((matchCount) => {
    const winners = winnerBuckets[matchCount];
    const bucketValue = totalPool * MATCH_SPLITS[matchCount];
    if (!winners.length && matchCount === 5) {
      rolloverToNext += bucketValue;
      return;
    }

    const share = winners.length ? Number((bucketValue / winners.length).toFixed(2)) : 0;
    winners.forEach((winner) => {
      prizeMap[winner.user.toString()] = {
        amount: share,
        matchCount,
        status: 'pending'
      };
    });
  });

  return {
    winningNumbers,
    basePool,
    totalPool,
    rollover,
    rolloverToNext: Number(rolloverToNext.toFixed(2)),
    entries,
    prizeMap
  };
};
