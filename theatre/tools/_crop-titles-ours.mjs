// crop our title shot's marquee region at 2x for close study
import sharp from 'sharp';
const [,, src, out, l = '180', t = '280', w = '700', h = '200'] = process.argv;
await sharp(src).extract({ left: +l, top: +t, width: +w, height: +h }).resize(+w * 2).png().toFile(out);
console.log('ok', out);
