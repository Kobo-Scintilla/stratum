// Check the file path
console.log('cwd:', process.cwd());
console.log('resolve db.sqlite:', import.meta.resolve?.('./db.sqlite') || 'N/A');
