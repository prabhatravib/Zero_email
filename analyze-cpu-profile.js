const fs = require('fs');

// Read the CPU profile
const profilePath = './worker-startup-profile.cpuprofile';
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

console.log('=== Cloudflare Worker CPU Profile Analysis ===\n');

// Extract nodes and their hit counts
const nodes = profile.nodes;
const nodeMap = new Map();

// Build a map of nodes by ID
nodes.forEach(node => {
  nodeMap.set(node.id, node);
});

// Find the root node and analyze the call tree
const rootNode = nodes.find(n => n.callFrame.functionName === '(root)');
if (!rootNode) {
  console.log('No root node found');
  process.exit(1);
}

// Function to get node name
function getNodeName(node) {
  const frame = node.callFrame;
  if (frame.functionName) {
    return frame.functionName;
  }
  if (frame.url) {
    const parts = frame.url.split('/');
    return parts[parts.length - 1] || frame.url;
  }
  return `Node ${node.id}`;
}

// Function to analyze children recursively
function analyzeNode(nodeId, depth = 0, path = []) {
  const node = nodeMap.get(nodeId);
  if (!node) return;

  const indent = '  '.repeat(depth);
  const name = getNodeName(node);
  const hitCount = node.hitCount || 0;
  
  // Only show nodes with significant activity
  if (hitCount > 0 || node.children?.length > 0) {
    console.log(`${indent}${name} (hits: ${hitCount})`);
    
    // Add to path for context
    const currentPath = [...path, name];
    
    // Analyze children
    if (node.children) {
      node.children.forEach(childId => {
        analyzeNode(childId, depth + 1, currentPath);
      });
    }
  }
}

console.log('Top-level initialization calls:');
console.log('================================');

// Analyze the main initialization path
analyzeNode(rootNode.id);

// Find the most expensive operations
console.log('\n=== Performance Analysis ===');
console.log('Looking for high-hit-count operations...\n');

const expensiveNodes = nodes
  .filter(node => node.hitCount > 10)
  .sort((a, b) => b.hitCount - a.hitCount)
  .slice(0, 10);

console.log('Top 10 most expensive operations:');
expensiveNodes.forEach((node, index) => {
  const name = getNodeName(node);
  console.log(`${index + 1}. ${name} - ${node.hitCount} hits`);
});

// Look for specific problematic patterns
console.log('\n=== Potential Issues ===');

const problematicPatterns = [
  'cheerio',
  'parse5',
  'htmlparser2',
  'css-select',
  'effect',
  'fast-check',
  'googleapis',
  'mime-db',
  'core-js'
];

problematicPatterns.forEach(pattern => {
  const matchingNodes = nodes.filter(node => 
    getNodeName(node).toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (matchingNodes.length > 0) {
    const totalHits = matchingNodes.reduce((sum, node) => sum + (node.hitCount || 0), 0);
    console.log(`${pattern}: ${matchingNodes.length} nodes, ${totalHits} total hits`);
  }
});

console.log('\n=== Recommendations ===');
console.log('1. Consider lazy loading heavy dependencies');
console.log('2. Move initialization code inside event handlers');
console.log('3. Use dynamic imports for non-critical modules');
console.log('4. Consider bundling optimizations');
console.log('5. Review if all dependencies are necessary at startup'); 