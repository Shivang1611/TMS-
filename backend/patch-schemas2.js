const fs = require('fs');
const path = '/Users/caderaedu/Desktop/test/tms/backend/src/agent/tool-schemas.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

data.push({
  "name": "searchProjects",
  "description": "Search for projects in the organization by name to find their Project ID.",
  "parameters": {
    "type": "object",
    "properties": {
      "searchQuery": {
        "type": "string",
        "description": "The name of the project to search for"
      }
    },
    "required": ["searchQuery"]
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Projects schema patched");
