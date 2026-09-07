const fs = require('fs');
let code = fs.readFileSync('src/services/historyService.ts', 'utf8');
code = code.replace(/localStorage\.getItem/g, "typeof localStorage !== 'undefined' ? localStorage.getItem : () => null");
code = code.replace(/localStorage\.setItem/g, "typeof localStorage !== 'undefined' ? localStorage.setItem : () => {}");
code = code.replace(/localStorage\.clear/g, "typeof localStorage !== 'undefined' ? localStorage.clear : () => {}");
fs.writeFileSync('src/services/historyService.ts', code);
