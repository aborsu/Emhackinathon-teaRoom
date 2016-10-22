const builder = require('botbuilder');
const ElizaBot = require('elizabot');

// exports.beginDialog = function (session, options) {
//   session.beginDialog('/eliza', options || {});
// }

exports.create = function (bot) {
  const eliza = new ElizaBot()
  var prompt = new builder.IntentDialog()
    .onBegin(function (session, args) {
      session.dialogData.startConversation = process.uptime();
      session.send(eliza.getInitial());
    })
    .onDefault(function (session) {
      // Validate users reply.
      const seconds = process.uptime() - session.dialogData.startConversation
      if (seconds > 45) {
        session.send('Oh my! Just look at the time!!!')
        session.send(eliza.getFinal());
        session.endDialogWithResult({ response: false });
      } else if (session.message.text == 'quit') {
        session.send(eliza.getFinal());
        session.endDialogWithResult({ response: true });
      } else {
        // Re-prompt user
        session.send(eliza.transform(session.message.text));
      }
    });
  bot.dialog('/eliza', prompt);
}
