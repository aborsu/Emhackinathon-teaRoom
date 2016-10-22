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

const calculateIdealCalPerDay = (weight, height, age, sex) => {
  if (sex === 'F') {
    return (10 * weight) + (6.25 * height)  + ((5 * age) - 161) * 1.55;
  } else {
    return (10 * weight) + (6.25 * height)  + ((5 * age) + 5) * 1.55;
  }
}

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

bot.dialog('/', [
    function (session) {
        // ORIGINAL - session.beginDialog('/user', session.userData.profile);
	session.beginDialog('/connection', session.userData.connectionProfile);
    },
    function (session, results, next) {
      session.send('You are logged as %s', results.firstName);
      session.send('So? What next?');
    }
]);

//=========================================================
// CONNECTION BOT
//=========================================================

bot.dialog('/connection', [

  function (session, args, next) {
		session.userData.user = args || {};
    if (!session.userData.user.name) {
      builder.Prompts.text(session, "Hey ! What's your name mate ?");
    } else {
      next();
    }
	},
	function (session, results, next) {
    if (results.response) {
      session.userData.user.name = results.response;
    }

    const name = session.userData.user.name;
    models.user.findOne({
      where: {
        firstName: name
      }
    }).then(resultsDb => {
      if (resultsDb === null) {
        session.beginDialog('/user', session.userData.profile);
      } else {
        session.send("Tu existes ! %s", resultsDb.firstName);
        next(resultsDb);
      }
    })
	}
]);


//=========================================================
// TAKING USER INFORMATION BOT
//=========================================================

bot.dialog('/user', [
  function (session, args, results, next) {
    session.dialogData.profile = args || {};
    if (results.response && session.dialogData.profile.name) {
      console.log(response)
      session.dialogData.profile.name = results.response;
    }
    if (!session.dialogData.profile.gender) {
      builder.Prompts.choice(session, "What is your gender (M/F) ?", ["M", "F"]);
    } else {
      next();
    }
  },
  function (session, results, next) {
    if (results.response) {
      session.dialogData.profile.gender = results.response.entity;
    }
    if (!session.dialogData.profile.age) {
      builder.Prompts.number(session, "What is your age ?");
    } else {
      next();
    }
  },
  function (session, results, next) {
      if (results.response) {
      session.dialogData.profile.age = results.response;
    }
    if (!session.dialogData.profile.weight) {
      builder.Prompts.number(session, "What is your weight (kg)?");
    } else {
      next();
    }
  },
  function (session, results, next) {
    if (results.response) {
      session.dialogData.profile.weight = results.response;
    }
    if (!session.dialogData.profile.height) {
      builder.Prompts.number(session, "What is your height (cm) ?");
    } else {
      next();
    }
  },
  function (session, results, next) {
	if (results.response) {
      session.dialogData.profile.height = results.response;
    }

    if (!session.dialogData.profile.goal) {
      const idealCalPerDay = calculateIdealCalPerDay(
        session.dialogData.profile.weight,
        session.dialogData.profile.height,
        session.dialogData.profile.age,
        session.dialogData.profile.gender)
      builder.Prompts.number(
        session,
        `Your ideal calory intake is ${idealCalPerDay},` +
        'type enter to accept or another value.');
    } else {
      next();
    }
  },
  function (session, results, next) {
    if (results.response) {
      session.dialogData.profile.goal = results.response.entity;
    }
    //  CREATE THE INEXISTANT USER INFOS
    models.user.create({
      firstName: session.userData.user.name,
      gender: session.dialogData.profile.gender,
      age: session.dialogData.profile.age,
      weight: session.dialogData.profile.weight,
      height: session.dialogData.profile.height,
      goal: session.dialogData.profile.goal
    }).then( response => next(response))
  },
  function (session, results) {
    session.endDialogWithResult({response: results})
  }
]);
