/**
 * Maatlaadi Bill - Intelligent Telugu & English Product & Customer Matcher (Next.js)
 * Handles Telugu morphological inflections, phonetic variations, aliases,
 * unit normalization, and ambiguity detection.
 */

import { store } from './store';

export const TELUGU_NUMBER_MAP = {
  'సగం': 0.5,
  'అర': 0.5,
  'ముప్పావు': 0.75,
  'పావు': 0.25,
  'ఒక': 1,
  'ఒకటి': 1,
  'ఒకటిన్నర': 1.5,
  'రెండు': 2,
  'రెండున్నర': 2.5,
  'మూడు': 3,
  'మూడున్నర': 3.5,
  'నాలుగు': 4,
  'నాలుగున్నర': 4.5,
  'ఐదు': 5,
  'ఆరు': 6,
  'ఏడు': 7,
  'ఎనిమిది': 8,
  'తొమ్మిది': 9,
  'పది': 10,
  'పదకొండు': 11,
  'పన్నెండు': 12,
  'పదమూడు': 13,
  'పద్నాలుగు': 14,
  'పదిహేను': 15,
  'ఇరవై': 20,
  'ముప్పై': 30,
  'నలభై': 40,
  'యాభై': 50,
  'వంద': 100
};

export const UNIT_SYNONYMS = {
  bag: ['bag', 'bags', 'బస్తా', 'బస్తాలు', 'బస్తాల', 'గోతము'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'కిలో', 'కిలోలు', 'కిలోల', 'కేజీ', 'కేజీలు', 'కేజీల'],
  litre: ['litre', 'litres', 'liter', 'liters', 'లీటర్', 'లీటర్లు', 'లీటర్ల'],
  pcs: ['pcs', 'piece', 'pieces', 'పీస్', 'పీసులు', 'పీసుల', 'నెంబర్', 'నెంబర్లు'],
  box: ['box', 'boxes', 'బాక్స్', 'బాక్సులు', 'డబ్బా', 'డబ్బాలు'],
  pair: ['pair', 'pairs', 'జత', 'జతలు'],
  coil: ['coil', 'coils', 'roll', 'rolls', 'కాయిల్', 'రోల్'],
  bucket: ['bucket', 'buckets', 'బకెట్', 'బకెట్లు', 'బకెట్ల'],
  gram: ['gram', 'grams', 'g', 'గ్రాము', 'గ్రాములు', 'గ్రాముల', 'గ్రాం'],
  packet: ['packet', 'packets', 'ప్యాకెట్', 'ప్యాకెట్లు', 'ప్యాకెట్ల', 'పాకెట్']
};

export class ProductMatcher {
  constructor(customStore = null) {
    this.store = customStore || store;
  }

  normalizeUnit(unitStr) {
    if (!unitStr) return 'pcs';
    const clean = unitStr.toLowerCase().trim();
    for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
      if (canonical === clean || synonyms.some(s => clean.includes(s) || s.includes(clean))) {
        return canonical;
      }
    }
    return unitStr;
  }

  parseQuantity(rawQuantity) {
    if (typeof rawQuantity === 'number') return rawQuantity;
    if (!rawQuantity) return 1;

    const trimmed = String(rawQuantity).trim();
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) return parsed;

    for (const [word, val] of Object.entries(TELUGU_NUMBER_MAP)) {
      if (trimmed.includes(word)) return val;
    }

    return 1;
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;

    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    const distance = this.levenshtein(str1, str2);
    return Math.max(0, 1 - distance / maxLen);
  }

  matchProduct(spokenName) {
    if (!spokenName || typeof spokenName !== 'string') {
      return { status: 'unknown', product: null, candidates: [], confidence: 0 };
    }

    const cleanSpoken = spokenName.toLowerCase().trim();
    const products = this.store.getActiveProducts();

    // 1. Direct alias or name exact match
    for (const p of products) {
      if (p.name.toLowerCase() === cleanSpoken || (p.name_te && p.name_te.toLowerCase() === cleanSpoken)) {
        return { status: 'exact', product: p, candidates: [p], confidence: 1.0 };
      }
      if (p.aliases && p.aliases.some(alias => alias.toLowerCase() === cleanSpoken)) {
        const sharedAliasMatches = products.filter(item =>
          item.aliases && item.aliases.some(a => a.toLowerCase() === cleanSpoken)
        );
        if (sharedAliasMatches.length > 1) {
          return {
            status: 'ambiguous',
            product: null,
            candidates: sharedAliasMatches,
            confidence: 0.75,
            ambiguityPrompt: `ఏ ${p.category || 'Product'} కావాలి?`
          };
        }
        return { status: 'exact', product: p, candidates: [p], confidence: 0.98 };
      }
    }

    // 2. Multi-match ambiguity check for broad categories
    const broadTokens = ['cement', 'సిమెంట్', 'paint', 'పెయింట్', 'switch', 'స్విచ్', 'fan', 'ఫ్యాన్', 'rice', 'బియ్యం'];
    for (const token of broadTokens) {
      if (cleanSpoken === token || cleanSpoken.startsWith(token + ' ') || cleanSpoken.endsWith(' ' + token)) {
        const matches = products.filter(p =>
          p.name.toLowerCase().includes(token) ||
          (p.name_te && p.name_te.toLowerCase().includes(token)) ||
          (p.aliases && p.aliases.some(a => a.toLowerCase().includes(token)))
        );
        if (matches.length > 1) {
          return {
            status: 'ambiguous',
            product: null,
            candidates: matches,
            confidence: 0.80,
            ambiguityPrompt: `ఏ ${token.toUpperCase()} కావాలి?`
          };
        }
      }
    }

    // 3. Substring & Fuzzy search
    const scoredCandidates = [];

    for (const p of products) {
      let maxScore = 0;

      const nameScore = this.similarity(cleanSpoken, p.name);
      if (nameScore > maxScore) maxScore = nameScore;

      if (p.name_te) {
        const teScore = this.similarity(cleanSpoken, p.name_te);
        if (teScore > maxScore) maxScore = teScore;
      }

      if (p.aliases && p.aliases.length > 0) {
        for (const alias of p.aliases) {
          const aliasScore = this.similarity(cleanSpoken, alias);
          if (aliasScore > maxScore) maxScore = aliasScore;
        }
      }

      if (maxScore >= 0.55) {
        scoredCandidates.push({ product: p, score: maxScore });
      }
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) {
      return {
        status: 'unknown',
        product: null,
        candidates: [],
        confidence: 0.2,
        unmatchedSpoken: spokenName,
        errorPrompt: 'ఈ product catalogueలో లేదు. Product add చేయాలా?'
      };
    }

    if (
      scoredCandidates[0].score >= 0.82 &&
      (scoredCandidates.length === 1 || scoredCandidates[0].score - scoredCandidates[1].score >= 0.15)
    ) {
      return {
        status: 'exact',
        product: scoredCandidates[0].product,
        candidates: [scoredCandidates[0].product],
        confidence: scoredCandidates[0].score
      };
    }

    return {
      status: 'ambiguous',
      product: null,
      candidates: scoredCandidates.slice(0, 3).map(c => c.product),
      confidence: scoredCandidates[0].score,
      ambiguityPrompt: `మీరు చెప్పిన "${spokenName}" కి సరిపోయే ఉత్పత్తులు:`
    };
  }

  matchCustomer(spokenCustomer) {
    if (!spokenCustomer) return null;

    let clean = spokenCustomer.trim();
    clean = clean.replace(/(కి|కు|గారికి|గారి|తో|నుండి|గారు)$/g, '').trim();

    const customers = this.store.getCustomers();

    for (const c of customers) {
      if (
        c.name.toLowerCase() === clean.toLowerCase() ||
        (c.name_te && c.name_te.toLowerCase() === clean.toLowerCase())
      ) {
        return c;
      }
    }

    let best = null;
    let highestScore = 0;
    for (const c of customers) {
      const s1 = this.similarity(clean, c.name);
      const s2 = c.name_te ? this.similarity(clean, c.name_te) : 0;
      const score = Math.max(s1, s2);
      if (score > highestScore && score >= 0.65) {
        highestScore = score;
        best = c;
      }
    }

    return best;
  }
}

export const matcher = new ProductMatcher();
