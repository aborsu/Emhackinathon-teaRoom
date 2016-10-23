const _ = require('lodash')
const BPromise = require('bluebird');
const builder = require('botbuilder');
const config = require('config')
const fatsecret = require('./controllers/fatsecret')
const models = require('./models')
const restify = require('restify');
const userInfoDialogue = require('./dialogue/user-info')
const meaningOfLife = require('./controllers/meaningOfLife');
const eliza = require('./controllers/eliza');

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

// Create prompts
eliza.create(bot);
bot.beginDialogAction('eliza', '/eliza', { matches: /^eliza/i });
// dialog.matches('TalkToEliza',[
//   (session) => {
//     session.beginDialog('/eliza');
//   }]);

meaningOfLife.create(bot);
bot.beginDialogAction('Mounty Python', '/meaningOfLife', { matches: /^mounty python/i });
// dialog.matches('AfricanOrEuropeanSwallow',[
//   (session) => {
//     session.beginDialog('/meaningOfLife');
//   }]);

loadDatabase().then(() => {
  server.post('/api/messages', connector.listen());
  console.log('Server is listenning on route /api/messages');
})

var model = 'https://api.projectoxford.ai/luis/v1/application?' +
  `id=${config.luis.applicationID}&subscription-key=${config.luis.subscriptionKey}`;
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
dialog.matches('Greetings', '/greetings')
bot.dialog('/greetings',[

  function (session, args, next) {
		session.userData.user = args || {};
    if (!session.userData.user.name) {      
      builder.Prompts.text(session, args.customPrompt || "Hey ! What's your name mate ?");
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
        session.send("Nice to meet you %s", resultsDb.firstName);
        next(resultsDb);
      }
    })
	}
]);

//=========================================================
// Add intent handlers

dialog.onDefault(builder.DialogAction.send("Could you please rephrase what you just said?"));


//intent handler for adding foods.
dialog.matches('AddFoods', [
    function (session, args, next) {
      session.dialogData.foods = args;
      
      if (session.userData.user === undefined)
      {
        session.dialogData.createUser = true;
        session.beginDialog('/greetings', { customPrompt: "Wow hold it! I dont know you, please tell me your name."});
        //break
      }
      else {
        
        session.dialogData.createUser = false;
        next();
      }
    },
    function (session, args, next) {
      var entities =args.entities;
      if (session.dialogData.createUser) {
        session.send("Now that this is out of the way, let's look at what you ate.")
        entities = session.dialogData.foods.entities;
      }
             
      // console.log(JSON.stringify(args));        
      // console.log(_.filter(args.compositeEntities, entity=>true))
      var foods = _.filter(session.dialogData.foods.entities, entity => entity.type === 'Food');
      var foundFood = false;
      BPromise.all(
        BPromise.mapSeries(foods, food => {
          return fatsecret.food.search(food.entity)
            .then( foodItems => {
              //  session.send(JSON.stringify(foodItems))
              if(foodItems.foods !== undefined && foodItems.foods.food !== undefined)
              {
                foundFood=true;       
                        
                session.send(foodItems.foods.food[0].food_name);
                session.send(foodItems.foods.food[0].food_description);                
                //"Per 972g - Calories: 1225kcal | Fat: 33.44g | Carbs: 3.21g | Protein: 213.27g"
                //we need to extract the calories from the description string               
                var foodCalories = parseInt(foodItems.foods.food[0].food_description.split('-')[1].split('|')[0].split(':')[1].replace("kcal",' '),10);
                //create the food object and register it
              }
            })
            //process each food with the api.
            //session.send('That sounds delicious!');
            //check how he's doing with the calories
            //session.send('Your food journal has been updated, keep up the good work!');
        })
      ).then(() => {
        if(!foundFood)
        {          
          session.send('Sorry, I could not find information about these foods.');
        }
        next()
      })
    }
    
    ]);

    //intent handler for checking if you can eat something
dialog.matches('CouldIEat', [
    function (session, args, next) {
        // console.log(_.filter(args.entities, entity => entity.type === 'Food'))
       var foods = _.filter(args.entities, entity => entity.type === 'Food');
       if(foods.length==0)
       {
         session.send('Sorry, Could you repeat that?'); 
       }
       //process each of the food we receive and obtain the amount of calories.
       var totalCalories = 0;
      //  BPromise.all(
       BPromise.mapSeries(foods, food => {
         return fatsecret.food.search(food.entity)
           .then( foodItems => {
             //  session.send(JSON.stringify(foodItems))
             if(foodItems.foods !== undefined)
             {
               session.send(foodItems.foods.food[0].food_name);
               session.send(foodItems.foods.food[0].food_description);               
               //"Per 972g - Calories: 1225kcal | Fat: 33.44g | Carbs: 3.21g | Protein: 213.27g"
               //we need to extract the calories from the description string               
               totalCalories = totalCalories + parseInt(foodItems.foods.food[0].food_description.split('-')[1].split('|')[0].split(':')[1].replace("kcal",' '),10);
               session.send(totalCalories.toString());
             }
           })
       }).then(() => {
         session.send("come on ".concat(session.userData.user.name," that's " ,totalCalories.toString()," calories!"));
       })

    }
    ]);


    dialog.matches('CheckCalories', [
    function (session, args, next) {
        // console.log(_.filter(args.entities, entity => entity.type === 'Food'))    
        session.send("Let me check your food journal.");   
       var periods = _.filter(args.entities, entity => entity.type === 'builtin.datetime.date');
       periods.forEach(function(period)
       {
         var date = new Date(period.resolution.date.toString());
         
       });
       
        
    }
    ]);

// // TAKING USER INFORMATION BOT
// //=========================================================
bot.dialog('/user', userInfoDialogue);
