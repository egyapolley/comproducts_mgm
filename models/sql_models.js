const Sequelize = require("sequelize");

const sequelize = require("../utils/sql_database");


const Referral = sequelize.define("referral", {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },

    msisdn: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

});

const Voucher_Code = sequelize.define("voucher_code", {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },

    code: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,
    },

    status : {
        type:Sequelize.STRING,
        allowNull: false,

    },

    channel : {
        type:Sequelize.STRING,
        allowNull: false,

    },

    date_expiry: {
        type:Sequelize.DATE,
        allowNull:false
    },
    NumbOfActivatedRefs:{
        type:Sequelize.INTEGER,
        allowNull:false,
        defaultValue:0
    }

});

const Referred = sequelize.define("referred", {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },

    msisdn: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },


    channel : {
        type:Sequelize.STRING,
        allowNull: false,

    },


});

module.exports = {
    Referral:Referral,
    Voucher_Code:Voucher_Code,
    Referred:Referred,
}
