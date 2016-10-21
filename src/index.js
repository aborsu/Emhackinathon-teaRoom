var builder = require('botbuilder');

// ConsoleConnector ‐> chat in the console only, we'll use another connector for chat platforms
var connector = new builder.ConsoleConnector().listen()

// ConsoleConnector ‐> chat in the console only, we'll use another connector for chat platforms
var bot = new builder.UniversalBot(connector);
// root dialog '/' ‐ when a message comes in, check what kind of dialog it is, currently, we only use the 'root'
bot.dialog('/', function (session) {
  session.send('Hello World');
});
