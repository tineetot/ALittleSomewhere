import { FRAME_STYLES, type PhotoFrame } from './model';
const names:Record<PhotoFrame,string>={print:'Print border',tape:'Taped corners',scallop:'Scalloped'};
export function frameOptions(selected:PhotoFrame='print'):string{return FRAME_STYLES.map(frame=>`<option value="${frame}" ${frame===selected?'selected':''}>${names[frame]}</option>`).join('');}
