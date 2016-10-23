const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('config');

let logging = false;
if (process.env.LOG_LEVEL === 'debug') {
  logging = console.log;
}

const sequelize = new Sequelize(
  config.db.db,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    dialect: 'mysql'
  }
);

const models = {};

fs
  .readdirSync(__dirname)
  .filter(file => file.indexOf('.') !== 0 && file !== 'index.js')
  .forEach(file => {
    const model = sequelize.import(path.join(__dirname, file));
    models[model.name] = model;
  });

Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
