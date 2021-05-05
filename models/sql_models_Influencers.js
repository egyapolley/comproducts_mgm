const Sequelize = require("sequelize");

const sequelize = require("../utils/sql_database");


const Referral_Inf = sequelize.define("referral_inf", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },

    firstName: {
        type: Sequelize.STRING,
        allowNull: false,

    },

    lastName: {
        type: Sequelize.STRING,
        allowNull: false,

    },

    surflineNumber:{
        type:Sequelize.STRING,
        unique:true,
    },
    code: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,

    },
    code_status:{
        type:Sequelize.STRING,
        allowNull: false,
        defaultValue:'INACTIVE'
    },

    NumbOfActivatedRefs: {
        type:Sequelize.INTEGER,
        allowNull:false,
        defaultValue:0
    }


});


const Referred_Inf = sequelize.define("referred_Inf", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },

    msisdn: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
    },
    channel: {
        type: Sequelize.STRING,
        allowNull: false,
    },

});

module.exports = {
    Referral: Referral_Inf,
    Referred: Referred_Inf,
}
