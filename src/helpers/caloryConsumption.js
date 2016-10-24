const _ = require('lodash')
const models = require('../models')

const getCaloryConsumption = (userId, start, end) => {
  // If end is null, will take the whole start.
  let startDate, endDate
  if (!end) {
    startDate = start.setHours(2)
    endDate = new Date(startDate)
    endDate.setDate(start.getDate() + 1)
  } else {
    startDate = start
    endDate = end
  }

  return models.food.findAll({
    attributes: ['calories'],
    where: {
      userId: userId,
      createdAt: {
        $lt: endDate,
        $gt: startDate
      }
    }
  }).then(
    results => {
      return _.reduce(results, (sum, result) => sum + result.calories, 0)
    })
}

module.exports = {
getCaloryConsumption}
