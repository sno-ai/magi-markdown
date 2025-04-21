import * as fs from 'fs';
import * as path from 'path';

const docsDir = path.join(__dirname, '../docs');
const mdxDir = path.join(docsDir, 'mdx');
const excludedDirs = ['mdx', 'mda-examples']; // Directories within docs/ to exclude

console.log(`Starting MDX sync from ${docsDir} to ${mdxDir}`);

// Ensure mdx directory exists
if (!fs.existsSync(mdxDir)) {
  console.log(`Creating target directory: ${mdxDir}`);
  fs.mkdirSync(mdxDir, { recursive: true });
}

// Find .md files directly in docsDir, excluding specified subdirectories
fs.readdirSync(docsDir).forEach(file => {
  const sourcePath = path.join(docsDir, file);
  let fileStat: fs.Stats;
  try {
    fileStat = fs.statSync(sourcePath);
  } catch (error) {
    console.error(`Error stating file ${sourcePath}:`, error);
    return; // Skip if we can't stat the file
  }

  // Skip directories and files not ending with .md
  if (fileStat.isDirectory() || !file.endsWith('.md')) {
    return;
  }

  const baseName = path.basename(file, '.md');
  const targetPath = path.join(mdxDir, `${baseName}.mdx`);

  console.log(`Processing ${file}...`);
  try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    // Basic check: Only write if content is different or target doesn't exist
    let shouldWrite = true;
    if (fs.existsSync(targetPath)) {
      const existingContent = fs.readFileSync(targetPath, 'utf8');
      if (existingContent === content) {
        shouldWrite = false;
        console.log(`  Skipping ${file} (content identical).`);
      }
    }

    if (shouldWrite) {
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`  Synced ${sourcePath} to ${targetPath}`);
    }
  } catch (error) {
    console.error(`  Error syncing ${file}:`, error);
  }
});

console.log('MDX sync complete.'); 