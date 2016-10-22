const path = require('path');

module.exports = {
  db: {
    user: 'eliza',
    password: 'isSoPretty',
    db: 'emhackinathon',
    path: path.join(process.cwd(), 'sqlite_db.sqlite')
  },
  fatsecret: {
   consumerKey: process.env.FS_CONSUMER_KEY,
   sharedKey: process.env.FS_SHARED_KEY
  }
};
