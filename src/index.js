const BPromise = require('bluebird');
var restify = require('restify');
var builder = require('botbuilder');
var _ = require('lodash') 
const models = require('./models')
const fatsecret = require('./controllers/fatsecret')

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

var model = 'https://api.projectoxford.ai/luis/v1/application?id=a6e6904e-b94d-42e6-b7f3-77dd935e3328&subscription-key=cd14929565814d6d8bcdd3cfcc04d1ce';
console.log(model);
var recognizer = new builder.LuisRecognizer(model);

var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

//=========================================================
// Bots Dialogs
//=========================================================

// bot.dialog('/', [
//     function (session) {
//         // ORIGINAL - session.beginDialog('/user', session.userData.profile);
// 	session.beginDialog('/connection', session.userData.connectionProfile);
//     },
//     function (session, results, next) {
//       session.send('You are logged as %s', results.firstName);
//       session.send('So? What next?');
//     }
// ]);

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

// Add intent handlers

dialog.matches('CheckCalories', builder.DialogAction.send('You want to get your calories for the day.'));
dialog.onDefault(builder.DialogAction.send("Could you please rephrase what you just said?"));


//intent handler for adding foods.
dialog.matches('AddFoods', [
    function (session, args, next) {
        // console.log(JSON.stringify(args));        
        // console.log(_.filter(args.compositeEntities, entity=>true))
       var foods = _.filter(args.entities, entity => entity.type === 'Food');
       console.log(foods)
       if(foods.length==0)
       {
         session.send('Sorry, I could not determine which foods you just ate.'); 
       }
       
       BPromise.mapSeries(foods, food => {
         fatsecret.food.search(food.entity)
           .then( foodItems => {
             //  session.send(JSON.stringify(foodItems))
             if(foodItems.foods !== undefined)
             {
               session.send(foodItems.foods.food[0].food_name);
               session.send(foodItems.foods.food[0].food_description);
               session.send(JSON.stringify(foodItems.foods.food[0]));
               //"Per 972g - Calories: 1225kcal | Fat: 33.44g | Carbs: 3.21g | Protein: 213.27g"
               //we need to extract the calories from the description string               
               var foodCalories = parseInt(foodItems.foods.food[0].food_description.split('-')[1].split('|')[0].split(':')[1].replace("kcal",' '),10);
               
             }
             else
             {
               session.send("Sorry I could not find any food with that name.");
             }
             
           })
            //process each food with the api.
            //session.send('That sounds delicious!');
            //check how he's doing with the calories
            //session.send('Your food journal has been updated, keep up the good work!');         
       })
    }
    ]);

    //intent handler for adding foods.
dialog.matches('CouldIEat', [
    function (session, args, next) {
        console.log(JSON.stringify(args))

        // console.log(_.filter(args.entities, entity => entity.type === 'Food'))
       var foods = _.filter(args.entities, entity => entity.parentType === 'CompositeFood');
       if(foods.length==0)
       {
         session.send('Sorry, I could not determine which foods you just ate.'); 
       }
       session.send(foods.length);
       foods.forEach(function(i)
        {
            //process each food with the api.
            //session.send('That sounds delicious!');
            //check how he's doing with the calories
            //session.send('Your food journal has been updated, keep up the good work!');
        });
    }
    ]);
