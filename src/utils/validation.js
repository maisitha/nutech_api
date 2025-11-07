const Joi = require('joi');

const nutechRegValidation = Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    password: Joi.string().min(8).required()
});

const nutechLoginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

const nutechTopupValidation = Joi.object({
    top_up_amount: Joi.number().integer().min(1).required()
});

const nutechTransactionValidation = Joi.object({
    service_code: Joi.string().required()
});

const nutechProfileValidation = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required()
});

const nutechValidateMiddleware = (nutechSchema) => {
    return (req, res, next) => {
        const { error: nutechValidationError } = nutechSchema.validate(req.body);
        if (nutechValidationError) {
            return res.status(400).json({
                status: 102,
                message: nutechValidationError.details[0].message,
                data: null
            });
        }
        next();
    };
};

module.exports = {
    nutechRegValidation,
    nutechLoginValidation,
    nutechTopupValidation,
    nutechTransactionValidation,
    nutechProfileValidation,
    nutechValidateMiddleware
};