export async function fetchWithTimeout(url,options={},timeoutMs=7000,{
  fetchImpl=globalThis.fetch,
  AbortControllerImpl=globalThis.AbortController,
  setTimeoutImpl=globalThis.setTimeout,
  clearTimeoutImpl=globalThis.clearTimeout
}={}){
  const controller=new AbortControllerImpl();
  const external=options.signal;
  const forwardAbort=()=>controller.abort();
  if(external){
    if(external.aborted)controller.abort();
    else external.addEventListener('abort',forwardAbort,{once:true});
  }
  let timedOut=false;
  const timer=setTimeoutImpl(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{
    return await fetchImpl(url,{...options,signal:controller.signal});
  }catch(error){
    if(timedOut)throw new Error('Request timed out.');
    throw error;
  }finally{
    clearTimeoutImpl(timer);
    external?.removeEventListener('abort',forwardAbort);
  }
}

export async function getJson(url,{fetcher=fetchWithTimeout,timeoutMs=7000}={}){
  const response=await fetcher(url,{cache:'no-cache'},timeoutMs);
  if(!response.ok)throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
