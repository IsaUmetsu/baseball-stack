/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('order_overview', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    visitor_team: {
      type: DataTypes.STRING(2),
      allowNull: false
    },
    home_team: {
      type: DataTypes.STRING(2),
      allowNull: false
    },
    game_no: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    col_1: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    col_2: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    col_3: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'order_overview'
  });
};
