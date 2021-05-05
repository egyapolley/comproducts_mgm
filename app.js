const express = require("express");
const router = require("./routes/index");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan")

const sequelize = require("./utils/sql_database");
const Referral = require("./models/sql_models").Referral;
const Voucher_Code = require("./models/sql_models").Voucher_Code;
const Referred = require("./models/sql_models").Referred;

const Inf = require("./models/sql_models_Influencers").Referral
const Inf_Referred = require("./models/sql_models_Influencers").Referred


require("dotenv").config();

mongoose.connect("mongodb://localhost/comOffer_MGM", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
}).then(() => {
    console.log("MongoDB connected");

    Voucher_Code.belongsTo(Referral, {constraints: true, onDelete: "CASCADE"});
    Referral.hasMany(Voucher_Code);

    Referred.belongsTo(Voucher_Code, {constraints: true, onDelete: "CASCADE"});
    Voucher_Code.hasMany(Referred);

    Inf_Referred.belongsTo(Inf,{constraints: true, onDelete: "CASCADE"})
    Inf.hasMany(Inf_Referred)

    sequelize.sync({

    })
        .then(() =>{
            console.log("Sequelize connected")

            const app = express();
            app.use(helmet());
            app.use(express.json());
            app.use(express.urlencoded({extended: false}));


            let PORT = process.env.PORT || 5200;
            let HOST = process.env.PROD_HOST;

            if (process.env.NODE_ENV === "development") {
                HOST = process.env.TEST_HOST;
                app.use(morgan("combined"))
            }

            app.use(router);

            app.listen(PORT, () => {
                console.log(`Server running in ${process.env.NODE_ENV} on url : http://${HOST}:${PORT}`)
            })

        })
        .catch((error) =>{
            console.log("Cannot connect to MongoDB");
            throw error;

        })


}).catch(err => {
    console.log("Cannot connect to MongoDB");
    throw err;
});
