const _ = require('lodash')
const BPromise = require('bluebird');
const builder = require('botbuilder');
const models = require('../models')
const fatsecret = require('../controllers/fatsecret')

module.exports = [
  (session, args, next) => {
    session.dialogData.foods = args;

    if (session.userData.userId === undefined) {
      session.dialogData.createUser = true;
      session.beginDialog('/getId', { customPrompt: "Wow hold it! I dont know you, please tell me your name."});
    } else {
      session.dialogData.createUser = false;
      next();
    }
  },
  (session, args, next) => {
    var entities = args.entities;

    if (session.dialogData.createUser) {
      session.send("Now that this is out of the way, let's look at what you ate.")
      entities = session.dialogData.foods.entities;
    }
    var foods = _.filter(session.dialogData.foods.entities, entity => entity.type === 'Food');
    var foundFood = false;
    let totalCalories = 0;
    BPromise.mapSeries(foods, food => {
      return fatsecret.food.search(food.entity)
        .then( foodItems => {
          if(foodItems.foods && foodItems.foods.food) {
            foundFood=true;
            const foodItem = foodItems.foods.food[0];
            const name = foodItem.food_name;
            const calories = parseInt(foodItem.food_description.match(/(\d+) ?kcal/)[1],10);
            totalCalories += calories;
            session.send('Adding: ' + name + ' ' + calories + ' kcal');

            return models.food.create({
              name: name,
              calories: calories,
              date: new Date(),
              userId: session.userData.userId
            })
          }
          return null;
        })
    }).then(() => {
      if(!foundFood) {
        session.send(
          'Sorry, I could not find information about:\n %s',
          _.map(foods, food => food.entity).join('\n -- ')
        );
      } else {
        // TODO check goal and positive or negative message.
        session.send('%d calories !! Isn\'t that a bit much?', totalCalories)
      }
      session.endDialog();
    })

  }
];
