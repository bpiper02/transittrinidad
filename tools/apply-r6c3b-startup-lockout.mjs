import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'startup failure helper',
  "const $=selector=>document.querySelector(selector);\n",
  "const $=selector=>document.querySelector(selector);\nfunction lockUnavailableUi(){\n  for(const selector of['#fromInput','#toInput','#swapButton','#planButton','#trayToggle']){const control=$(selector);if(control)control.disabled=true;}\n  $('#modeTabs')?.querySelectorAll('button').forEach(button=>{button.disabled=true;});\n}\n"
);

replaceOnce(
  'startup catch lockout',
  "  }catch(error){console.error(error);$('#plannerStatus').textContent='Transport data failed to load.';}\n",
  "  }catch(error){console.error(error);lockUnavailableUi();$('#plannerStatus').textContent='Transport data failed to load.';}\n"
);

writeFileSync(path,source);
console.log('R6c3b startup failure lockout applied');
