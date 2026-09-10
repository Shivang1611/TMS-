const fs = require('fs');
const path = '/Users/caderaedu/Desktop/test/tms/backend/src/agent/tool-schemas.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

data.push({
  "name": "searchUsers",
  "description": "Search for users in the organization by name or email to find their User ID.",
  "parameters": {
    "type": "object",
    "properties": {
      "searchQuery": {
        "type": "string",
        "description": "The name or email of the user to search for"
      }
    },
    "required": ["searchQuery"]
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Schema patched");
