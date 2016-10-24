module.exports = (sequelize, DataTypes) => {
  const Food = sequelize.define('food', {
    name: {
      type: DataTypes.STRING,
      field: 'name'
    },
    fatSecretId: {
      type: DataTypes.STRING,
      field: 'fatSecretId'
    },
    calories: {
      type: DataTypes.INTEGER,
      field: 'calories'
    },
    date: {
      type: DataTypes.DATE
    }

  }, {
    classMethods: {
      associate: function (models) {
        Food.belongsTo(models.user)
      }
    },
    freezeTableName: true // Model tableName will be the same as the model name
  })
  return Food
}
