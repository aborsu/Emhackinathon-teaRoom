const _ = require('lodash')
const BPromise = require('bluebird');
const builder = require('botbuilder');
const config = require('config')
const fatsecret = require('./controllers/fatsecret')
const models = require('./models')
const restify = require('restify');
const userInfoDialogue = require('./dialogue/user-info')
const getId = require('./dialogue/getId')
const postFood = require('./dialogue/postFood')
const meaningOfLife = require('./controllers/meaningOfLife');
const eliza = require('./controllers/eliza');

models.sequelize.sync()
  .then(() => console.log('DATABASE_SYNCED'))
  .catch(err => {
    console.log('Could not sync with database')
    console.log(err)
    process.exit(-1)
  })

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

meaningOfLife.create(bot);
bot.beginDialogAction('Mounty Python', '/meaningOfLife', { matches: /^mounty python/i });

server.post('/api/messages', connector.listen());

var model = 'https://api.projectoxford.ai/luis/v1/application?' +
  `id=${config.luis.applicationID}&subscription-key=${config.luis.subscriptionKey}`;
console.log(model);
var recognizer = new builder.LuisRecognizer(model);

var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.matches('TalkToEliza',[
  (session) => {
    session.beginDialog('/eliza');
  }]);

dialog.matches('AfricanOrEuropeanSwallow',[
  (session) => {
    session.beginDialog('/meaningOfLife');
  }]);

//=========================================================
// CONNECTION BOT
//=========================================================
dialog.onDefault(builder.DialogAction.send("Could you please rephrase what you just said?"));

bot.dialog('/user', userInfoDialogue);
bot.dialog('/getId', getId);
bot.dialog('/postFood', postFood);

dialog.matches('Greetings','/getId');
dialog.matches('AddFoods', '/postFood');

//=========================================================
// Add intent handlers



//intent handler for adding foods.

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

const getCalories = (foodItem) =>
  parseInt(foodItem.match(/(\d+) ?kcal/)[1],10);
