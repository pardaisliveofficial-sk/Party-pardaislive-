const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const required = ['@capacitor/core', '@capacitor/app'];
for (const name of required) {
  if (!pkg.dependencies?.[name] && !pkg.devDependencies?.[name]) {
    throw new Error(`Missing dependency declaration: ${name}`);
  }
  console.log(`OK ${name}: ${pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]}`);
}
console.log('Capacitor dependency declarations are complete.');
