var restify = require('restify');
var builder = require('botbuilder');
const models = require('./models')

const loadDatabase = () => {
  console.log('DATABASE_LOADING');

  return models.sequelize.sync()
    .then(() => {
      console.log('DATABASE_LOADING_SUCCESS');
    }).catch(err => {
      console.log('DATABASE_LOADING_FAIL', err);
      process.exit(-1);
    });
};

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);

loadDatabase().then(() => {
  server.post('/api/messages', connector.listen());
  console.log('Server is listenning on route /api/messages');
})

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
    session.send("Hello World");
});
