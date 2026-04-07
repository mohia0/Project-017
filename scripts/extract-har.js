const fs = require('fs');
const path = require('path');

const harPath = path.join(__dirname, '../studio.mohihassan.com.har');
const outDir = path.join(__dirname, '../extracted_har');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

console.log('Extracting from HAR file...');
try {
    const rawData = fs.readFileSync(harPath, 'utf8');
    const har = JSON.parse(rawData);
    
    if (!har.log || !har.log.entries) {
        console.error('Invalid HAR format');
        process.exit(1);
    }
    
    const entries = har.log.entries;
    let cssContent = '';
    let apiCount = 0;
    
    entries.forEach((entry, i) => {
        const req = entry.request;
        const res = entry.response;
        if (!req || !res) return;
        
        const url = req.url;
        const mimeType = res.content?.mimeType || '';
        const text = res.content?.text || '';
        
        if (!text) return;
        
        // 1. Collect JSON Responses
        if (mimeType.includes('application/json') || mimeType.includes('text/x-component') || mimeType.includes('application/trpc')) {
            try {
                // Determine a safe filename
                const safeName = url.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || `api_resp_${i}`;
                fs.writeFileSync(path.join(outDir, `api_${i}_${safeName}.json`), text);
                apiCount++;
            } catch (e) {}
        }
        
        // 2. Collect CSS
        if (mimeType.includes('text/css')) {
            cssContent += `\n/* URL: ${url} */\n` + text + '\n';
        }
        
        // 3. Collect SVGs
        if (mimeType.includes('image/svg+xml')) {
            const safeName = url.split('/').pop().replace(/[^a-zA-Z0-9.\-]/g, '_') || `icon_${i}.svg`;
            const fileName = safeName.endsWith('.svg') ? safeName : safeName + '.svg';
            fs.writeFileSync(path.join(outDir, fileName), text);
        }
    });
    
    if (cssContent) {
        fs.writeFileSync(path.join(outDir, 'extracted_styles.css'), cssContent);
    }
    
    console.log(`Extraction complete! Saved ${apiCount} API payloads, styles, and SVGs to ./extracted_har`);
} catch (err) {
    console.error('Error processing HAR file:', err);
}
