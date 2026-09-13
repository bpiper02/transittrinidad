export function readJsonStorage(storage,key,{fallback={}}={}){
  try{
    const raw=storage?.getItem(key);
    return raw==null?fallback:JSON.parse(raw);
  }catch{
    return fallback;
  }
}

export function writeJsonStorage(storage,key,value){
  try{
    storage?.setItem(key,JSON.stringify(value));
    return true;
  }catch{
    return false;
  }
}
