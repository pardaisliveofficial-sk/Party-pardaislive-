const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("./src");
const issues = [];

files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const imgRegex = /<img\b([^>]*?)>/gs;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const lineNum = content.substring(0, match.index).split("\n").length;
    const srcMatch = fullTag.match(/src=(?:\{([^}]+)\}|"([^"]*)"|'([^']*)')/);
    if (srcMatch) {
      const dynamicSrc = srcMatch[1];
      const staticDouble = srcMatch[2];
      const staticSingle = srcMatch[3];
      if (staticDouble === "" || staticSingle === "") {
        issues.push({ file: f, line: lineNum, reason: "Static empty src", tag: fullTag.replace(/\s+/g, ' ').slice(0, 120) });
      } else if (dynamicSrc) {
        // If dynamicSrc contains fallback to empty string: || "" or || ''
        if (/\b(?:\|\|\s*["']\s*["'])/.test(dynamicSrc)) {
          issues.push({ file: f, line: lineNum, reason: "Fallback to empty string in dynamic src: " + dynamicSrc, tag: fullTag.replace(/\s+/g, ' ').slice(0, 120) });
        }
      }
    } else {
      issues.push({ file: f, line: lineNum, reason: "No src attribute on <img>", tag: fullTag.replace(/\s+/g, ' ').slice(0, 120) });
    }
  }
});

console.log("Found issues:", JSON.stringify(issues, null, 2));
