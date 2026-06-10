export function getRecommendations(watchHistory, favorites, ratings, currentContent = null, allContent = []) {
  if (!watchHistory.length && !favorites.length && !currentContent) {
    return allContent.filter(c => c.isTrending).slice(0, 8);
  }

  const watched = watchHistory.map(id => allContent.find(c => c.id === id)).filter(Boolean);
  const faved = favorites.map(id => allContent.find(c => c.id === id)).filter(Boolean);
  const allInteracted = [...watched, ...faved];

  const genreScores = {};
  const langScores = {};

  allInteracted.forEach(item => {
    if (!item) return;
    const weight = favorites.includes(item.id) ? 2 : 1;
    const userRating = ratings[item.id];
    const ratingMult = userRating ? userRating / 3 : 1;
    (item.genres || [item.genre]).forEach(g => {
      genreScores[g] = (genreScores[g] || 0) + weight * ratingMult;
    });
    langScores[item.language] = (langScores[item.language] || 0) + weight;
  });

  const seenIds = new Set([...watchHistory, ...favorites, currentContent?.id].filter(Boolean));
  const scored = allContent
    .filter(c => !seenIds.has(c.id))
    .map(c => {
      let score = 0;
      (c.genres || [c.genre]).forEach(g => { score += (genreScores[g] || 0) * 3; });
      score += (langScores[c.language] || 0) * 1.5;
      score += c.rating * 0.5;
      if (c.isTrending) score += 2;
      if (currentContent) {
        if (c.genre === currentContent.genre) score += 5;
        if (c.language === currentContent.language) score += 2;
        const sharedTags = (c.tags || []).filter(t => (currentContent.tags || []).includes(t));
        score += sharedTags.length * 3;
      }
      return { ...c, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, 10);
}