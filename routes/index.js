const express = require("express");
const router = express.Router();
const User = require("../models/user");
const validator = require("../utils/validators");
const passport = require("passport");
const BasicStrategy = require("passport-http").BasicStrategy;

const Referral = require("../models/sql_models").Referral;
const Voucher_Code = require("../models/sql_models").Voucher_Code;
const Referred = require("../models/sql_models").Referred;

const Inf = require("../models/sql_models_Influencers").Referral
const Inf_Referred = require("../models/sql_models_Influencers").Referred

const moment = require("moment");
const {Op} = require("sequelize");
const sequelize = require("../utils/sql_database");

const axios = require("axios");


const soapRequest = require("easy-soap-request");
const parser = require('fast-xml-parser');
const he = require('he');
const options = {
    attributeNamePrefix: "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: true,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false,
    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),
    tagValueProcessor: (val, tagName) => he.decode(val),
    stopNodes: ["parse-me-as-string"]
};

passport.use(new BasicStrategy(
    function (username, password, done) {
        User.findOne({username: username}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            user.comparePassword(password, function (error, isMatch) {
                if (err) return done(error);
                else if (isMatch) {
                    return done(null, user)
                } else {
                    return done(null, false);
                }

            })

        });
    }
));


router.get("/code", passport.authenticate('basic', {
    session: false
}), async (req, res) => {
    try {

        const {error} = validator.validateGetCode(req.query);
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }
        const {subscriberNumber: msisdn, channel} = req.query;
        if (channel.toLowerCase() !== req.user.channel) {
            return res.json({
                status: 2,
                reason: `Invalid Request channel ${channel}`
            })

        }
        let finalcode = null;
        let code_expiry = null;
        let now = moment();
        let date_expiry = moment().add(30, "days");

        let result = await getContact(msisdn);

        if (result && result.contact) {

            let referral = await Referral.findOne({where: {msisdn}});
            if (referral) {
                let voucherCodes = await referral.getVoucher_codes({
                    where: {
                        [Op.and]: [
                            {
                                date_expiry: {
                                    [Op.gte]: now
                                },
                            },
                        ]
                    }
                });
                if (voucherCodes.length > 0) {
                    finalcode = voucherCodes[0].code;
                    code_expiry = voucherCodes[0].date_expiry;

                } else {
                    let createCode = await referral.createVoucher_code({
                        code: generateRandom(),
                        date_expiry: date_expiry,
                        status: "INACTIVE",
                        channel: channel,

                    })
                    if (createCode) {
                        finalcode = createCode.code;
                        code_expiry = createCode.date_expiry;
                    }
                }

            } else {
                const createCode = await sequelize.transaction(async (t) => {
                    let referral = await Referral.create({msisdn}, {transaction: t});

                    return await referral.createVoucher_code({
                        code: generateRandom(),
                        date_expiry: date_expiry,
                        status: "INACTIVE",
                        channel: channel
                    }, {transaction: t});


                })

                finalcode = createCode.code;
               // code_expiry = createCode.date_expiry;
            }

            let smsContent = `Your Code is ${finalcode} and valid for 30 days. Share with friends & family to activate a device now. They will enjoy 50% bonus on all recharges for the next 3 months`;
            let to_msisdn = result.contact;
            const url = "http://api.hubtel.com/v1/messages/";

            const headers = {
                "Content-Type": "application/json",
                Authorization: "Basic Y3BlcGZ4Z2w6Z3Rnb3B0c3E="
            }


            let messageBody = {
                Content: smsContent,
                FlashMessage: false,
                From: "Surfline",
                To: to_msisdn.toString(),
                Type: 0,
                RegisteredDelivery: true
            };

            axios.post(url, messageBody,
                {headers: headers})
                .then(function (response) {
                    console.log(response.data);
                    to_msisdn = to_msisdn.toString();
                    to_msisdn = `${to_msisdn.substring(0, 6)}***${to_msisdn.substring(to_msisdn.length - 3)}`;
                    res.json({
                        status: 0,
                        reason: "success",
                        phoneContact: to_msisdn
                    })
                }).catch(function (error) {
                console.log(error);
                to_msisdn = to_msisdn.toString();
                to_msisdn = `${to_msisdn.substring(0, 6)}***${to_msisdn.substring(to_msisdn.length - 3)}`;
                res.json({
                    status: 0,
                    reason: "success",
                    phoneContact: to_msisdn
                })

            });
        } else {
            res.json({
                status: 1,
                reason: `${msisdn} is not valid`
            })

        }


    } catch (error) {
        console.log(error);
        res.json({
            status: 1,
            reason: "System failure"
        })

    }


});

router.post("/code", passport.authenticate('basic', {session: false}), redeemInf, async (req, res) => {
    const {subscriberNumber, channel, code} = req.body;
    try {
        const {error} = validator.validateRedeemCode({subscriberNumber, channel, code});
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }


        if (channel.toLowerCase() !== req.user.channel) {
            return res.json({
                status: 2,
                reason: `Invalid Request channel ${channel}`
            })

        }

        let now = moment();
        let voucherCode = await Voucher_Code.findOne({
            where: {
                [Op.and]: [
                    {
                        date_expiry: {
                            [Op.gte]: now
                        },
                    },
                    {
                        code: code
                    },

                ]
            },
            include: Referral
        });

        if (voucherCode) {
            let referralMsisdn = voucherCode.referral.msisdn
            if (referralMsisdn === subscriberNumber) {
                return res.json({
                    status: 2,
                    reason: 'Invalid Request. Both referral and referred must be unique'
                })

            }

            let activatedToday = false;

            let getAcctInfo = await getReferredAcctInfo(subscriberNumber);

            if (getAcctInfo && getAcctInfo.success) {

                let {status, activation_date} = getAcctInfo;
                if (status === 'A') {
                    let today = moment().format("YYYYMMDDHHmmss");
                    if (today.substr(0, 8) !== activation_date.toString().substr(0, 8)) {
                        return res.json({
                            status: 2,
                            reason: `Invalid Request. ${subscriberNumber} is not a newly registered sim`
                        })

                    }
                    activatedToday = true;

                } else {
                    return res.json({
                        status: 2,
                        reason: `Invalid Request. ${subscriberNumber} is not ACTIVE`
                    })
                }

            }

            if (activatedToday) {

                let discountReferral = "yes";

                await sequelize.transaction(async (t) => {

                    await voucherCode.createReferred({
                        msisdn: subscriberNumber,
                        channel: channel,
                    }, {transaction: t});
                    voucherCode.status = "ACTIVE";
                    voucherCode.NumbOfActivatedRefs = voucherCode.NumbOfActivatedRefs + 1
                    await voucherCode.save({transaction: t});
                })

                if (await notifyIN(subscriberNumber, referralMsisdn, code, discountReferral)) {
                    res.json({status: 0, reason: "success"})

                } else {
                    res.json({
                        status: 1,
                        reason: "System failure"
                    })

                }


            } else {
                return res.json({
                    status: 2,
                    reason: `Invalid Request. ${subscriberNumber} is not a newly registered sim`
                })

            }


        } else {
            res.json({
                status: 1,
                reason: `Invalid voucher code ${code}`
            })
        }

    } catch (error) {
        console.log(error);
        let errorType = error.errors[0].type;
        let errorMessage = "System Failure";
        if (errorType.includes("unique")) errorMessage = `${subscriberNumber} has already been referred`;
        res.json({
            status: 1,
            reason: errorMessage
        })

    }


});

router.get("/codeinfo", passport.authenticate('basic', {
    session: false
}), async (req, res) => {
    try {
        const {error} = validator.validateGetCodeInfo(req.query);
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }
        let {code} = req.query;
        code = code.toString().trim();
        let codedb = await Voucher_Code.findOne(
            {
                where: {code},
                include: [Referral, Referred]
            })
        if (codedb) {
            let finalCodeInfo = {};
            finalCodeInfo.code = codedb.code;
            finalCodeInfo.date_generated = moment(codedb.createdAt).format("DD-MM-YYYY HH:mm:ss");
            finalCodeInfo.date_expiry = moment(codedb.date_expiry).format("DD-MM-YYYY HH:mm:ss");
            finalCodeInfo.referral = codedb.referral.msisdn;
            finalCodeInfo.referreds = "";
            finalCodeInfo.status = codedb.status === 'INACTIVE' && moment().isSameOrAfter(moment(codedb.date_expiry)) ? "EXPIRED" : codedb.status;
            finalCodeInfo.referreds = codedb.NumbOfActivatedRefs;

            return res.json({
                status: 0,
                reason: "success",
                data: finalCodeInfo
            })
        }

        return res.json({
            status: 1,
            reason: `${code} does not exist`
        })


    } catch (error) {
        console.log(error);
        res.json({
            status: 1,
            reason: "System failure"
        })

    }


});

router.get("/subref", passport.authenticate('basic', {
    session: false
}), async (req, res) => {
    try {
        const {error} = validator.validateSubscriberNumber(req.query);
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }
        let {subscriberNumber} = req.query;
        let referral = await Referral.findOne(
            {
                where: {msisdn: subscriberNumber},
                include: [
                    {
                        model: Voucher_Code,
                        include: Referred

                    }
                ]

            });
        if (referral) {
            let finalResult = [];
            const voucherCodes = referral.voucher_codes;
            voucherCodes.forEach(function (voucherCode) {
                const referreds = voucherCode.referreds;
                console.log(referreds)
                if (referreds.length > 0) {
                    referreds.forEach(function (referred) {
                        let tempItem = {};
                        tempItem.msisdn = referred.msisdn;
                        tempItem.code = voucherCode.code;
                        tempItem.activation_date = moment(referred.createdAt).format("DD-MM-YYYY HH:mm:ss");
                        finalResult.push(tempItem)
                    })


                }


            })

            res.json({
                status: 0,
                reason: "success",
                data: finalResult
            })

        } else {
            res.json({
                status: 1,
                reason: `${subscriberNumber} has not referred any subscriber yet`,

            })

        }


    } catch (error) {
        console.log(error);
        res.json({
            status: 1,
            reason: "System failure"
        })

    }


});

router.post("/user", async (req, res) => {
    try {
        let {username, password, channel} = req.body;
        let user = new User({
            username,
            password,
            channel
        });
        user = await user.save();
        res.json(user);

    } catch (error) {
        res.json({error: error.toString()})
    }


});


//Influences Routes

router.post("/code_inf", passport.authenticate('basic', {
    session: false
}), async (req, res) => {
    const {code, firstName, lastName, channel, subscriberNumber} = req.body;
    try {

        const {error} = validator.validateGetCode_Inf(req.body);
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }
        if (channel.toLowerCase() !== req.user.channel) {
            return res.json({
                status: 2,
                reason: `Invalid Request channel ${channel}`
            })

        }
        let referral = await Inf.findOne({where: {code}});
        if (referral) {
            return res.json({
                status: 1,
                reason: `Code Already assigned`,
                referral
            })

        } else {
            let referral2 = await Inf.create({
                firstName,
                lastName,
                code,
                surflineNumber: subscriberNumber
            })
            if (referral2) {
                return res.json({
                    status: 0,
                    reason: "Code successfully assigned",
                    referral: referral2
                })
            }

        }


    } catch (error) {
        console.log(error);
        let message = error && error.errors[0] && error.errors[0].message && error && error.errors[0] && error.errors[0].message.includes("unique") ? `${subscriberNumber} already assigned` : "System Error"
        res.json({
            status: 1,
            reason: message
        })

    }


});

router.get("/all_inf", passport.authenticate('basic', {
    session: false
}), async (req, res) => {
    try {
        let referrals = await Inf.findAll({order: [['NumbOfActivatedRefs', 'DESC']],raw:true})
        if (referrals) {
            if (referrals.length > 0) {

                referrals = referrals.map(item =>{
                    item.createdAt = moment(item.createdAt).format("DD-MM-YYYY")
                    return item

                })

            }
            res.json({
                status: 0,
                reason: "success",
                data: referrals
            })
        }
    } catch (error) {
        console.log(error)
        res.json({
            status: 1,
            reason: "System failure"
        })
    }
})


async function redeemInf(req, res, next) {
    const {subscriberNumber, channel, code} = req.body;

    if (code.includes('0')) {
        try {
            const {error} = validator.validateRedeemCode_Inf({subscriberNumber, channel, code});
            if (error) {
                return res.json({
                    status: 2,
                    reason: error.message
                })
            }


            if (channel.toLowerCase() !== req.user.channel) {
                return res.json({
                    status: 2,
                    reason: `Invalid Request channel ${channel}`
                })

            }

            let referral = await Inf.findOne({where: {code}})
            if (referral) {
                if (referral.surflineNumber === subscriberNumber) {
                    return res.json({
                        status: 2,
                        reason: 'Invalid Request. Both referral and referred must be unique'
                    })

                }

                let activatedToday = false;

                let getAcctInfo = await getReferredAcctInfo(subscriberNumber);

                if (getAcctInfo && getAcctInfo.success) {

                    let {status, activation_date} = getAcctInfo;
                    if (status === 'A') {
                        let today = moment().format("YYYYMMDDHHmmss");
                        if (today.substr(0, 8) !== activation_date.toString().substr(0, 8)) {
                            return res.json({
                                status: 2,
                                reason: `Invalid Request. ${subscriberNumber} is not a newly registered sim`
                            })

                        }
                        activatedToday = true;

                    } else {
                        return res.json({
                            status: 2,
                            reason: `Invalid Request. ${subscriberNumber} is not ACTIVE`
                        })
                    }


                }

                if (activatedToday) {

                    let discountReferral = "ignore";

                    await sequelize.transaction(async (t) => {

                        await referral.createReferred_Inf({
                            msisdn: subscriberNumber,
                            channel: channel,
                        }, {transaction: t});
                        referral.code_status = "ACTIVE";
                        referral.NumbOfActivatedRefs = referral.NumbOfActivatedRefs + 1
                        await referral.save({transaction: t});
                    })

                    if (await notifyIN(subscriberNumber, referral.surflineNumber, code, discountReferral)) {
                        res.json({status: 0, reason: "success"})
                    } else {
                        res.json({
                            status: 1,
                            reason: "System failure"
                        })

                    }

                } else {
                    return res.json({
                        status: 2,
                        reason: `Invalid Request. ${subscriberNumber} is not a newly registered sim`
                    })

                }


            } else {
                return res.json({
                    status: 2,
                    reason: `Invalid Code ${code}`
                })

            }


        } catch (error) {
            console.log(error)
            let message = error && error.errors[0] && error.errors[0].message && error && error.errors[0] && error.errors[0].message.includes("unique") ? `${subscriberNumber} already activated` : "System Error"
            res.json({
                status: 1,
                reason: message
            })
        }

    } else {
        return next()
    }

}


function generateRandom() {
    const STRING = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    const length = STRING.length;
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += STRING.charAt(Math.floor(Math.random() * length))

    }

    return code;

}


async function getReferredAcctInfo(msisdn) {
    try {
        const url = "http://172.25.39.13:3003";
        const sampleHeaders = {
            'User-Agent': 'NodeApp',
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': 'urn:CCSCD1_QRY',
        };

        let xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pi="http://xmlns.oracle.com/communications/ncc/2009/05/15/pi">
   <soapenv:Header/>
   <soapenv:Body>
      <pi:CCSCD1_QRY>
         <pi:username>admin</pi:username>
         <pi:password>admin</pi:password>
         <pi:MSISDN>${msisdn}</pi:MSISDN>
         <pi:WALLET_TYPE>Primary</pi:WALLET_TYPE>
      </pi:CCSCD1_QRY>
   </soapenv:Body>
</soapenv:Envelope>`;


        const {response} = await soapRequest({url: url, headers: sampleHeaders, xml: xmlBody, timeout: 5000}); // Optional timeout parameter(milliseconds)
        const {body} = response;
        let jsonObj = parser.parse(body, options);
        let result = {}
        if (jsonObj.Envelope.Body.CCSCD1_QRYResponse) {
            let queryResult = jsonObj.Envelope.Body.CCSCD1_QRYResponse;
            result.success = true;
            result.status = queryResult.STATUS;
            result.activation_date = queryResult.FIRST_ACTIVATION_DATE
        } else {
            let soapFault = jsonObj.Envelope.Body.Fault;
            let faultString = soapFault.faultstring;
            console.log(faultString);
            result.success = false;
            result.status = null
            result.activation_date = null

        }
        return result;

    } catch (error) {
        console.log(error);

        return {
            success: false,
            status: null,
            activation_date: null
        }


    }

}

async function notifyIN(referred_msisdn, referral_msisdn, code, discountReferral) {
    const url = "http://172.25.39.16:2222";
    const sampleHeaders = {
        'User-Agent': 'NodeApp',
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'http://SCLINSMSVM01P/wsdls/Surfline/VoucherRecharge_USSD/VoucherRecharge_USSD',
        'Authorization': 'Basic YWlhb3NkMDE6YWlhb3NkMDE='
    };

    let xmlRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:red="http://SCLINSMSVM01P/wsdls/Surfline/RedeemCodeMGM.wsdl">
   <soapenv:Header/>
   <soapenv:Body>
      <red:RedeemCodeMGMRequest>
         <Referral_Msisdn>${referral_msisdn}</Referral_Msisdn>
         <CC_Calling_Party_Id>${referred_msisdn}</CC_Calling_Party_Id>
         <MGMCode>${code}</MGMCode>
         <MGMdiscountReferral>${discountReferral}</MGMdiscountReferral>
      </red:RedeemCodeMGMRequest>
   </soapenv:Body>
</soapenv:Envelope>`;
    try {
        const {response} = await soapRequest({url: url, headers: sampleHeaders, xml: xmlRequest, timeout: 6000}); // Optional timeout parameter(milliseconds)

        const {body} = response;


        let jsonObj = parser.parse(body, options);
        let result = jsonObj.Envelope.Body;
        return !result.RedeemCodeMGMResult;


    } catch (error) {
        console.log(error);
        return false;

    }


}


async function getContact(msisdn) {

    try {
        const url = "http://172.25.39.16:2222";
        const sampleHeaders = {
            'User-Agent': 'NodeApp',
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': 'http://SCLINSMSVM01P/wsdls/Surfline/MGMGetReferralAcctInfo/MGMGetReferralAcctInfo',
            'Authorization': 'Basic YWlhb3NkMDE6YWlhb3NkMDE='
        };

        let xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mgm="http://SCLINSMSVM01P/wsdls/Surfline/MGMGetReferralAcctInfo.wsdl">
   <soapenv:Header/>
   <soapenv:Body>
      <mgm:MGMGetReferralAcctInfoRequest>
         <CC_Calling_Party_Id>${msisdn}</CC_Calling_Party_Id>
      </mgm:MGMGetReferralAcctInfoRequest>
   </soapenv:Body>
</soapenv:Envelope>`;


        const {response} = await soapRequest({url: url, headers: sampleHeaders, xml: xmlBody, timeout: 5000});
        const {body} = response;
        let jsonObj = parser.parse(body, options);
        let jsonResult = jsonObj.Envelope.Body;
        let result = {}
        if (jsonResult.MGMGetReferralAcctInfoResult && jsonResult.MGMGetReferralAcctInfoResult.Result) {
            result.contact = jsonResult.MGMGetReferralAcctInfoResult.Result
            result.success = true;


        } else {
            result.contact = null;
            result.success = false;

        }
        return result;

    } catch (error) {
        console.log(error.toString())
        return {
            contact: null,
            success: false,
        }

    }

}

module.exports = router;

