export const RUNTIME_DATA_KEYS=Object.freeze([
  'nodes',
  'services',
  'transfers',
  'schedules',
  'places',
  'fares'
]);

export function validateRuntimeData(data){
  if(data===null||typeof data!=='object'||Array.isArray(data))throw new TypeError('Invalid runtime dataset container.');
  for(const key of RUNTIME_DATA_KEYS){
    if(!Array.isArray(data[key]))throw new TypeError(`Invalid runtime dataset: ${key}`);
  }
  return data;
}
