const builder = require('botbuilder');
const models = require('../models')

const calculateIdealCalPerDay = (weight, height, age, sex) => {
  if (sex === 'F') {
    return (10 * weight) + (6.25 * height)  + ((5 * age) - 161) * 1.55;
  } else {
    return (10 * weight) + (6.25 * height)  + ((5 * age) + 5) * 1.55;
  }
}

module.exports = [
  function (session, args, results, next) {
    session.dialogData.profile = args || {};
    if (results.response && session.dialogData.profile.name) {
      session.dialogData.profile.name = results.response;
    }
    if (!session.dialogData.profile.gender) {
      session.send('hey there %s, it appears that we meet for the first time. Can you tell me a bit more about yourself?', session.userData.name)
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
      session.dialogData.profile.goal = results.response;
   }
    //  CREATE THE INEXISTANT USER INFOS
    models.user.create({
      firstName: session.userData.name,
      gender: session.dialogData.profile.gender,
      age: session.dialogData.profile.age,
      weight: session.dialogData.profile.weight,
      height: session.dialogData.profile.height,
      goal: session.dialogData.profile.goal
    }).then( response => { 
      session.send('Thanks %s, I have now updated your profile. Please tell me what you ate', session.userData.name)
      session.userData.userId = response.id;
      session.userData.userInstance = response;
      session.endDialog();
    })
  }
]
