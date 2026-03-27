/**
 * Tokenizer — TypeScript port of Python stopwords.py.
 *
 * Splits text on whitespace/punctuation, lowercases, filters stopwords.
 * Matches the Python tokenize_and_filter() behavior exactly.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "and", "or", "but", "if", "because", "as", "while", "although",
  "though", "since", "when", "where", "which", "who", "whom", "whose",
  "what", "this", "that", "these", "those", "it", "its", "their", "they",
  "we", "our", "you", "your", "he", "his", "she", "her", "i", "my",
  "me", "him", "us", "not", "no", "so", "up", "also", "more", "most",
  "other", "some", "such", "only", "own", "same", "than", "too", "very",
  "just", "both", "each", "few", "all", "any", "how", "about",
])

/** Tokenize text and filter stopwords and short tokens */
export function tokenizeAndFilter(text: string, minLength = 2): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W_]+/)
    .filter((t) => t.length >= minLength && !STOPWORDS.has(t))
}

/** Extract character n-grams from a string */
export function charNgrams(text: string, minN: number, maxN: number): string[] {
  const lower = text.toLowerCase().trim()
  const ngrams: string[] = []
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= lower.length - n; i++) {
      ngrams.push(lower.slice(i, i + n))
    }
  }
  return ngrams
}
