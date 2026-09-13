export function readJsonStorage(storage,key,{fallback={}}={}){
  try{
    const raw=storage?.getItem(key);
    return raw==null?fallback:JSON.parse(raw);
  }catch{
    return fallback;
  }
}

export function isPlainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===Object.prototype||prototype===null;
}

export function readJsonObjectStorage(storage,key,{fallback={}}={}){
  const value=readJsonStorage(storage,key,{fallback});
  return isPlainObject(value)?value:fallback;
}

export function writeJsonStorage(storage,key,value){
  try{
    storage?.setItem(key,JSON.stringify(value));
    return true;
  }catch{
    return false;
  }
}
