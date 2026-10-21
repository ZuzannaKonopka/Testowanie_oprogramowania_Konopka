const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class JsonStore {
  constructor(directory) {
    this.directory = directory;
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, 'data.json');
    if (!fs.existsSync(this.file)) this.save({ users: [], lists: [] });
    this.data = this.load();
  }
  load() {
    try {
      const value = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (!value || !Array.isArray(value.users) || !Array.isArray(value.lists)) throw new Error('Invalid store shape');
      return value;
    } catch (error) {
      throw new Error(`Nie można odczytać bazy danych JSON: ${error.message}`);
    }
  }
  save(data = this.data) {
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, this.file);
    this.data = data;
  }
  id() { return crypto.randomUUID(); }
  userByEmail(email) { return this.data.users.find(u => u.email === email.toLowerCase()); }
  userById(id) { return this.data.users.find(u => u.id === id); }
  listById(id) { return this.data.lists.find(l => l.id === id); }
  persist() { this.save(this.data); }
}
module.exports = { JsonStore };
