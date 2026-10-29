import type { StickerKind } from './model';

const drawings:Record<StickerKind,string>={
  bow:'<path fill="#f9cddd" d="M47 43C8 4 0 69 44 53L27 89 45 81 51 57 62 88 78 91 58 52C102 71 95 5 55 43Z"/><path d="M47 43C8 4 0 69 44 53M55 43C95 5 102 71 58 52M44 53 27 89 45 81 51 57 62 88 78 91 58 52"/><ellipse fill="#e9abc0" cx="51" cy="48" rx="7" ry="9"/>',
  flower:'<path stroke="#7d8b68" d="M51 43C60 68 47 80 47 95M54 71C77 47 88 69 53 78M50 82C25 61 14 84 47 88"/><path fill="#f2d4df" d="M49 38C24 47 19 23 39 22 28 1 54-4 54 19 72-2 86 20 66 31 92 42 68 61 58 42 48 63 30 50 49 38Z"/><circle fill="#dfae6a" cx="54" cy="31" r="8"/>',
  stamp:'<path fill="#fffaf4" stroke-dasharray="3 4" stroke-width="5" d="M17 11H83V91H17Z"/><path fill="#fde6ee" d="M24 18H76V84H24Z"/><path d="M29 24H71V67H29Z"/><path fill="#c85c82" stroke="none" d="M50 38C32 25 28 49 50 59 72 49 68 25 50 38Z"/><path d="M34 76H66"/>',
  clip:'<path stroke="#ba9068" stroke-width="6" d="M37 63 62 23C75 3 96 21 83 42L51 91C34 116 4 93 22 65L54 17"/><path stroke="#fffaf4" stroke-width="1.5" d="M39 64 64 24C74 9 89 22 80 38"/>',
  label:'<path fill="#f4e7d1" d="M9 29 30 9H91V76L72 91H9Z"/><path stroke-dasharray="3 3" d="M16 32 33 16H84V72L69 84H16Z"/><circle fill="#fffaf4" cx="28" cy="34" r="5"/><path d="M40 43H73M28 58H73M28 69H61"/><path stroke="#c85c82" d="M28 29C-6 9 12-5 36 14"/>',
  leaf:'<path stroke="#778064" d="M25 94C56 61 56 35 70 8"/><path fill="#c5c9af" stroke="#778064" d="M38 77C6 70 10 49 36 63L43 72C24 46 31 30 49 53L50 58C38 25 48 15 59 36L61 29C53 7 73 0 73 14L70 29C92 5 100 28 65 43L62 52C94 27 97 53 57 64L52 74C86 56 83 82 38 77Z"/>',
};
export function stickerArt(kind:StickerKind):string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 104" fill="none" stroke="#a46d7f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[kind]}</svg>`;
}
export function moodArt(index:number):string {
  const mouths=['M13 24Q20 31 27 24','M13 23Q20 30 27 23','M15 25Q20 28 25 25','M16 26h8','M14 28Q20 21 26 28','M14 27h12','M13 22Q20 33 27 22Z','M17 25h6','M16 26Q20 23 24 26','M14 28Q20 22 26 28'];
  const eyes=index===2||index===7?'<path d="M11 17q3 3 6 0m6 0q3 3 6 0"/>':'<path d="M14 17v2m12-2v2"/>';
  return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="20" cy="20" r="16"/>${eyes}<path d="${mouths[index]}"/>${index===9?'<path d="M10 22q-5 7 0 7t0-7"/>':''}${index===5?'<path d="m11 12 6 2m6 0 6-2"/>':''}</svg>`;
}
