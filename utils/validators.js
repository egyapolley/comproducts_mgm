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


}

