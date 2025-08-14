// 需要安装 axios 和 google-translate-api（或用你喜欢的翻译库）
// npm install axios google-translate-api

const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api'); // 或用其他翻译库

const basisDir = path.join(__dirname, '../basis');
const enBasisDir = path.join(__dirname, '../en/basis');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkSync(fullPath, filelist);
    } else if (file.endsWith('.md')) {
      filelist.push(fullPath);
    }
  });
  return filelist;
}

async function translateFile(srcPath, destPath) {
  const content = fs.readFileSync(srcPath, 'utf8');
  try {
    const res = await translate(content, {from: 'zh-CN', to: 'en'});
    fs.mkdirSync(path.dirname(destPath), {recursive: true});
    fs.writeFileSync(destPath, res.text, 'utf8');
    console.log(`Translated: ${srcPath} -> ${destPath}`);
  } catch (err) {
    console.error(`Error translating ${srcPath}:`, err);
  }
}

async function main() {
  const files = walkSync(basisDir);
  for (const file of files) {
    const relPath = path.relative(basisDir, file);
    const destPath = path.join(enBasisDir, relPath);
    await translateFile(file, destPath);
  }
}

main();