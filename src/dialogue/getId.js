const builder = require('botbuilder');
const models = require('../models')

module.exports = [
  (session, args, next) => {
    if (session.userData.userId && session.userData.name) {
      // To DO random message.
      session.send('Hey %s!', session.userData.name)
      return session.endDialogWithResult({ suserId: session.userData.userId})
    }
    next(args)
  },
  (session, args, next) => {
    if (!session.userData.name) {
      builder.Prompts.text(
        session,
        args.customPrompt || "Hey ! What's your name mate ?");
    } else {
      next()
    }
  },
  (session, args, next) => {
    console.log(args)
    if (args.response) {
      session.userData.name = args.response
    }
    console.log(session.userData.name)

    models.user.findOne({
      where: {
        firstName: session.userData.name
      }
    }).then(resultsDb => {
      if (resultsDb === null) {
        session.beginDialog('/user');
      } else {
        console.log(resultsDb.id)
        session.userData.userId = resultsDb.id;
        session.send("Oh! Yes I remember you now %s.", resultsDb.firstName);
        next(resultsDb);
      }
    })
  }
]
