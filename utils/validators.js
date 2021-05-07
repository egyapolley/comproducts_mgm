const Joi = require("joi");

module.exports = {

    validateGetCode: (body) => {

        const schema = Joi.object({
            subscriberNumber: Joi.string()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .required()
                .messages({"string.pattern.base": "subscriberNumber must start with 233"}),

            channel: Joi.string()
                .alphanum()
                .required()
                .min(4)
        });

        return schema.validate(body)


    },

    validateRedeemCode: (body) => {

        const schema = Joi.object({
            subscriberNumber: Joi.string()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .required()
                .messages({"string.pattern.base": "subscriberNumber must start with 233"}),

            channel: Joi.string()
                .alphanum()
                .required()
                .min(4),

            code: Joi.string()
                .alphanum()
                .length(6)
                .trim()
                .required()
        });

        return schema.validate(body)


    },

    validateGetCodeInfo: (body) => {

        const schema = Joi.object({
            code: Joi.string()
                .alphanum()
                .length(6)
                .trim()
                .required()
        });

        return schema.validate(body)


    },

    validateSubscriberNumber: (body) => {

        const schema = Joi.object({
            subscriberNumber: Joi.string()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .required()
                .trim()
                .messages({"string.pattern.base": "subscriberNumber must start with 233"}),
        });

        return schema.validate(body)


    },


    //Influencers

    validateGetCode_Inf: (body) => {

        const schema = Joi.object({
            subscriberNumber: Joi.string()
                .trim()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .messages({"string.pattern.base": "subscriberNumber must start with 233"}),
            firstName: Joi.string()
                .trim()
                .alphanum()
                .required()
                .min(4),
            lastName: Joi.string()
                .trim()
                .alphanum()
                .required()
                .min(4),
            code: Joi.string()
                .trim()
                .min(4)
                .max(12)
                .alphanum()
                .regex(/0/)
                .lowercase()
                .required()
                .messages({"string.pattern.base": "code must contain the digit '0' "}),
            channel: Joi.string()
                .trim()
                .alphanum()
                .required()
                .min(4)
        });

        return schema.validate(body)


    },
    validateRedeemCode_Inf: (body) => {

        const schema = Joi.object({
            subscriberNumber: Joi.string()
                .trim()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .required()
                .messages({"string.pattern.base": "subscriberNumber must start with 233"}),

            channel: Joi.string()
                .trim()
                .alphanum()
                .required()
                .min(4),

            code: Joi.string()
                .alphanum()
                .min(4)
                .max(12)
                .trim()
                .lowercase()
                .required()
        });

        return schema.validate(body)


    },


}

