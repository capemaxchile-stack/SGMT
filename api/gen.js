const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const modules = ['faenas', 'assets', 'items', 'suppliers', 'warehouses', 'users'];

for (const mod of modules) {
    const modDir = path.join(__dirname, 'src', 'modules', mod);
    ensureDir(modDir);
    ensureDir(path.join(modDir, 'dto'));
    ensureDir(path.join(modDir, 'entities'));
    
    // Create simple empty files
    fs.writeFileSync(path.join(modDir, `${mod}.module.ts`), '');
    fs.writeFileSync(path.join(modDir, `${mod}.controller.ts`), '');
    fs.writeFileSync(path.join(modDir, `${mod}.service.ts`), '');
}

console.log('Folders and basic files created.');
