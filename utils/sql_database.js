const Sequelize = require("sequelize");

const sequelize = new Sequelize("comOffer_MGM","mme", "mme",{
    dialect:"mysql",
    host:"localhost",

    define: {
        freezeTableName:true
    }
});

module.exports = sequelize;

