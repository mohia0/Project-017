const fs = require('fs');
const ts = require('typescript');

const src = fs.readFileSync('src/components/forms/FormEditor.tsx', 'utf8');

const sourceFile = ts.createSourceFile('FormEditor.tsx', src, ts.ScriptTarget.Latest, true);

const diagnostics = sourceFile.parseDiagnostics;
if (diagnostics.length > 0) {
    diagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`Line ${line + 1}, col ${character + 1}: ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });
} else {
    console.log("No syntax errors found by TypeScript parser!");
}
