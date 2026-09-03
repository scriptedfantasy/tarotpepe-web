// The 78-card deck. Slugs match /public/cards/<slug>.webp. Marseille names, as printed on the cards.
const MAJORS = [
  ['the-fool', 'The Fool', '0'],
  ['the-juggler', 'The Juggler', 'I'],
  ['the-popess', 'The Popess', 'II'],
  ['the-empress', 'The Empress', 'III'],
  ['the-emperor', 'The Emperor', 'IV'],
  ['the-pope', 'The Pope', 'V'],
  ['the-lovers', 'The Lovers', 'VI'],
  ['the-chariot', 'The Chariot', 'VII'],
  ['justice', 'Justice', 'VIII'],
  ['the-hermit', 'The Hermit', 'IX'],
  ['wheel-of-fortune', 'Wheel of Fortune', 'X'],
  ['strength', 'Strength', 'XI'],
  ['the-hanged-man', 'The Hanged Man', 'XII'],
  ['death', 'Death', 'XIII'],
  ['temperance', 'Temperance', 'XIV'],
  ['the-devil', 'The Devil', 'XV'],
  ['the-house-of-god', 'The House of God', 'XVI'],
  ['the-star', 'The Star', 'XVII'],
  ['the-moon', 'The Moon', 'XVIII'],
  ['the-sun', 'The Sun', 'XIX'],
  ['judgement', 'Judgement', 'XX'],
  ['the-world', 'The World', 'XXI'],
];
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = ['Cups', 'Pentacles', 'Swords', 'Wands'];

export const DECK = [
  ...MAJORS.map(([slug, name, numeral]) => ({ slug, name, numeral, arcana: 'major' })),
  ...SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      slug: `${rank.toLowerCase()}-of-${suit.toLowerCase()}`,
      name: `${rank} of ${suit}`,
      rank,
      suit,
      arcana: 'minor',
    })),
  ),
];
export const BACK_SLUG = 'tarotcard-backside';
export const bySlug = Object.fromEntries(DECK.map((c) => [c.slug, c]));
