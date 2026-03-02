const fs = require('fs');

const dir = '/Users/christopherhowell/Sites/chrishowell-folio-swiss/src/content/projects';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

for (const file of files) {
  const filePath = `${dir}/${file}`;
  let content = fs.readFileSync(filePath, 'utf8');

  // Specific Erni ones
  content = content.replace(/colSpan=\{3\}\s+colStart=\{5\}/g, 'colSpan={4} colStart={8}');
  content = content.replace(/colSpan=\{3\}\s+colStart=\{10\}/g, 'colSpan={4} colStart={12}');

  // General 3/6 and 3/9 combos
  content = content.replace(/colSpan=\{3\}\s+colStart=\{6\}/g, 'colSpan={4} colStart={8}');
  content = content.replace(/colSpan=\{3\}\s+colStart=\{9\}/g, 'colSpan={4} colStart={12}');
  content = content.replace(/colStart=\{6\}\s+colSpan=\{3\}/g, 'colStart={8} colSpan={4}');
  
  // Specific overlapping Erni ones 
  content = content.replace(/colSpan=\{3\}\s+colStart=\{3\}/g, 'colSpan={2} colStart={8}'); // adjust 3-col grids carefully.. maybe just 4? Let's make them 4s.
  content = content.replace(/colSpan=\{3\}\s+colStart=\{7\}/g, 'colSpan={4} colStart={12}');
  content = content.replace(/colSpan=\{3\}\s+colStart=\{11\}/g, 'colSpan={4} colStart={16}');

  content = content.replace(/colSpan=\{2\}\s+colStart=\{9\}/g, 'colSpan={4} colStart={12}');



  fs.writeFileSync(filePath, content, 'utf8');
}
console.log("Replaced columns in MDX files.");
