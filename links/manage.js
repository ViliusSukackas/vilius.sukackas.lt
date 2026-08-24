const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const redirectsPath = path.join(__dirname, 'redirects.json');

function printUsage() {
    console.log('Usage:');
    console.log('  node links/manage.js add <key> <url>');
    console.log('  node links/manage.js delete <key>');
    process.exit(1);
}

// Ensure the redirects.json file exists
if (!fs.existsSync(redirectsPath)) {
    fs.writeFileSync(redirectsPath, JSON.stringify({}, null, 2), 'utf8');
}

const args = process.argv.slice(2);
if (args.length < 2) {
    printUsage();
}

const command = args[0].toLowerCase();

let redirects = {};
try {
    const rawData = fs.readFileSync(redirectsPath, 'utf8');
    redirects = JSON.parse(rawData);
} catch (err) {
    console.error('Error parsing redirects.json:', err.message);
    process.exit(1);
}

if (command === 'add') {
    if (args.length < 3) {
        console.error('Error: "add" command requires both a key and a URL.');
        printUsage();
    }
    const key = args[1].trim();
    const url = args[2].trim();

    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
        console.error('Error: Key must be alphanumeric (can include dashes or underscores).');
        process.exit(1);
    }

    if (!/^https?:\/\//i.test(url)) {
        console.error('Error: URL must start with http:// or https://');
        process.exit(1);
    }

    redirects[key] = url;
    console.log(`Adding link: /f/${key} -> ${url}`);

} else if (command === 'delete') {
    const key = args[1].trim();

    if (!redirects.hasOwnProperty(key)) {
        console.error(`Error: Key "${key}" not found.`);
        process.exit(1);
    }

    delete redirects[key];
    console.log(`Deleting link: /f/${key}`);

} else {
    console.error(`Error: Unknown command "${command}"`);
    printUsage();
}

// Sort redirects alphabetically
const sortedRedirects = {};
Object.keys(redirects).sort().forEach(k => {
    sortedRedirects[k] = redirects[k];
});

try {
    fs.writeFileSync(redirectsPath, JSON.stringify(sortedRedirects, null, 2), 'utf8');
    console.log('Successfully wrote to redirects.json.');

    // Run git commands to commit and push
    console.log('Staging changes with git...');
    execSync('git add links/redirects.json', { stdio: 'inherit' });

    const commitMessage = `Update short link: ${command} ${args[1]}`;
    console.log(`Committing: "${commitMessage}"...`);
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    console.log('Pushing to GitHub...');
    execSync('git push', { stdio: 'inherit' });

    console.log('Successfully updated and pushed short link!');
} catch (err) {
    console.error('Git task failed:', err.message);
}
