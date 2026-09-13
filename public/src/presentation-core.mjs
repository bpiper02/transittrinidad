export const MODE_LABELS=Object.freeze({
  ptsc:'PTSC',
  maxi:'Maxi',
  route_taxi:'Route taxi',
  water_taxi:'Water Taxi',
  ferry:'Ferry'
});

export const MAXI_BAND_COLORS=Object.freeze({
  1:'#F2C94C',
  2:'#D92D2D',
  3:'#2E9B4B',
  4:'#1C1C1E',
  5:'#8B5E3C',
  6:'#2F80ED'
});

export const MAXI_BAND_LABELS=Object.freeze({
  1:'Route 1 / Yellow Band',
  2:'Route 2 / Red Band',
  3:'Route 3 / Green Band',
  4:'Route 4 / Black Band',
  5:'Route 5 / Brown Band',
  6:'Route 6 / Blue Band'
});

export const OPERATOR_COLORS=Object.freeze({
  ptsc:'#C9252D',
  water_taxi:'#0A84FF',
  ferry:'#0077B6',
  route_taxi:'#6E6E73'
});

export function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}

export function modeLabel(mode){
  return MODE_LABELS[mode]||mode;
}

export function routeColor(service={}){
  if(service.mode==='maxi'){
    const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);
    if(MAXI_BAND_COLORS[routeArea])return MAXI_BAND_COLORS[routeArea];
    const named={yellow:1,red:2,green:3,black:4,brown:5,blue:6}[String(service.bandColor||'').toLowerCase()];
    if(named)return MAXI_BAND_COLORS[named];
    return '#8E8E93';
  }
  return OPERATOR_COLORS[service.mode]||'#6E6E73';
}

export function maxiBandLabel(service={}){
  const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);
  if(MAXI_BAND_LABELS[routeArea])return MAXI_BAND_LABELS[routeArea];
  const color=String(service.bandColor||'').trim();
  return color?`${color[0].toUpperCase()}${color.slice(1)} Band`:'Maxi';
}

export function formatMinutes(minutes){
  const total=Math.max(1,Math.round(minutes||0));
  if(total<60)return`~${total} min`;
  const hours=Math.floor(total/60),mins=total%60;
  return`~${hours}h${mins?` ${mins}m`:''}`;
}

export function serviceConfidenceLabel(service={}){
  if(service.serviceConfidence==='verified_service')return'Verified route';
  if(service.serviceConfidence==='reported_service')return'Reported route';
  return'Route';
}
