import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after=''){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'presentation import',
  "import {boardingGuidance,transitAction} from './src/rider-instruction-core.mjs';\n",
  "import {boardingGuidance,transitAction} from './src/rider-instruction-core.mjs';\nimport {escapeHtml,formatMinutes,maxiBandLabel,modeLabel,routeColor,serviceConfidenceLabel} from './src/presentation-core.mjs';\n"
);

replaceOnce(
  'presentation constants',
  "const MODE_LABELS={ptsc:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'};\nconst MAXI_BAND_COLORS={1:'#F2C94C',2:'#D92D2D',3:'#2E9B4B',4:'#1C1C1E',5:'#8B5E3C',6:'#2F80ED'};\nconst MAXI_BAND_LABELS={1:'Route 1 / Yellow Band',2:'Route 2 / Red Band',3:'Route 3 / Green Band',4:'Route 4 / Black Band',5:'Route 5 / Brown Band',6:'Route 6 / Blue Band'};\nconst OPERATOR_COLORS={ptsc:'#C9252D',water_taxi:'#0A84FF',ferry:'#0077B6',route_taxi:'#6E6E73'};\n"
);

replaceOnce(
  'presentation helper cluster',
  "function escapeHtml(value=''){\n  return String(value).replace(/[&<>'\\\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',\"'\":'&#039;','\\\"':'&quot;'}[char]));\n}\nfunction modeLabel(mode){return MODE_LABELS[mode]||mode;}\nfunction routeColor(service){\n  if(service.mode==='maxi'){\n    const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);\n    if(MAXI_BAND_COLORS[routeArea])return MAXI_BAND_COLORS[routeArea];\n    const named={yellow:1,red:2,green:3,black:4,brown:5,blue:6}[String(service.bandColor||'').toLowerCase()];\n    if(named)return MAXI_BAND_COLORS[named];\n    return '#8E8E93';\n  }\n  return OPERATOR_COLORS[service.mode]||'#6E6E73';\n}\nfunction maxiBandLabel(service){\n  const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);\n  if(MAXI_BAND_LABELS[routeArea])return MAXI_BAND_LABELS[routeArea];\n  const color=String(service.bandColor||'').trim();\n  return color?`${color[0].toUpperCase()}${color.slice(1)} Band`:'Maxi';\n}\n"
);

replaceOnce(
  'service confidence label',
  "function serviceConfidenceLabel(service){\n  if(service.serviceConfidence==='verified_service')return'Verified route';\n  if(service.serviceConfidence==='reported_service')return'Reported route';\n  return'Route';\n}\n"
);

replaceOnce(
  'format minutes',
  "function formatMinutes(minutes){\n  const total=Math.max(1,Math.round(minutes||0));\n  if(total<60)return`~${total} min`;\n  const hours=Math.floor(total/60),mins=total%60;\n  return`~${hours}h${mins?` ${mins}m`:''}`;\n}\n"
);

writeFileSync(path,source);
console.log('R4a presentation extraction applied');
