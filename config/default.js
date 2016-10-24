const path = require('path')

module.exports = {
  db: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    db: process.env.DB_DATABASE,
    host: process.env.DB_HOST
  },
  fatsecret: {
    consumerKey: process.env.FS_CONSUMER_KEY,
    sharedKey: process.env.FS_SHARED_KEY
  },
  luis: {
    applicationID: process.env.LUIS_APPLICATION_ID,
    subscriptionKey: process.env.LUIS_SUBSCRIPTION_KEY
  }
}
