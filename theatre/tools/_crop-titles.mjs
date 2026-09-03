// crop reference mastheads for close study
import sharp from 'sharp';
const R = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/reference/';
const O = '/tmp/titles-ref/';
import { mkdirSync } from 'node:fs';
mkdirSync(O, { recursive: true });
// poster masthead: 2279x3607; masthead roughly y 180..900, x 150..2200
await sharp(R + 'fd-poster-masthead.jpg').extract({ left: 150, top: 200, width: 2000, height: 700 }).png().toFile(O + 'poster-masthead.png');
// poster masthead detail: FRENCH letters
await sharp(R + 'fd-poster-masthead.jpg').extract({ left: 500, top: 220, width: 900, height: 340 }).resize(1800).png().toFile(O + 'poster-french-detail.png');
// poster zigzag spine left edge
await sharp(R + 'fd-poster-masthead.jpg').extract({ left: 0, top: 0, width: 260, height: 900 }).resize(520).png().toFile(O + 'poster-spine.png');
// cover masthead: 1599x2182
await sharp(R + 'fd-cover-commissariat.jpg').extract({ left: 250, top: 20, width: 1150, height: 560 }).resize(1800).png().toFile(O + 'cover-masthead.png');
await sharp(R + 'fd-cover-commissariat.jpg').extract({ left: 350, top: 110, width: 500, height: 220 }).resize(1800).png().toFile(O + 'cover-detail.png');
console.log('ok');
