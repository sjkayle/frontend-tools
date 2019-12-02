import moment from "moment";
import { isEmpty } from "./isEmpty";
import { isPhoneNumber } from "./isPhoneNumber";
import { isEmail } from "./isEmail";
import { deepCopy } from "./deepCopy";
import { clearTime } from "./clearTime";
import { isStrongPassword } from "./isStrongPassword";

export type ValidationSpecs = Object & {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    minDate?: Date;
    maxDate?: Date;
};

export type ModelFieldError = Object & {
    errorCode: ValidationErrors;
    specs?: ValidationSpecs;
};

export type ModelErrors<T> = { [K in keyof T]?: ModelFieldError; };
export type ValidationTypeWithoutSpecs = "required" | "isDate" | "noWhitespace" | "validEmail" | "strongPassword" | "isPhoneNumber";
export type ValidationTypeWithSpecs = "dateRange" | "valueRange" | "textLength";
export type ValidationType = ValidationTypeWithoutSpecs | ValidationTypeWithSpecs;
export type ValidationErrors = "empty"
    | "invalidDate"
    | "isWhitespace"
    | "invalidEmail"
    | "weakPassword"
    | "beforeMinDate"
    | "afterMaxDate"
    | "lessThanMinLength"
    | "moreThanMaxLength"
    | "lessThanMinValue"
    | "moreThanMaxValue"
    | "invalidInput"
    | "invalidPhoneNumber";
export type FormFieldTypes = "date" | "string" | "number" | "array" | "object";
type SpecialPick<T, K extends keyof T, P extends keyof T> = Required<Pick<T, K>> | Required<Pick<T, P>> | Required<Pick<T, K | P>>;

type CustomValidator<T> = {
    fields: Array<keyof T>;
    errorFields: Array<keyof T>;
    validator: (...args: any) => ModelFieldError;
};

class ValidatorModelItem<T> extends Object {
    name: keyof T;
    value: any = null;
    specs: ValidationSpecs = {};
    validations: Array<ValidationType> = [];

    constructor(name: keyof T, value: any) {
        super();
        if (name && typeof name === "string") {
            this.name = name;
            this.value = value;
            this.specs = {};
            this.validations = [];
        }
    }
}

export class FormValidator<T> {
    private formObject: Map<keyof T, ValidatorModelItem<T>> = new Map<keyof T, ValidatorModelItem<T>>();
    private formObjectErrors: ModelErrors<T> = {};
    private customValidators: Array<CustomValidator<T>> = [];

    constructor(formObject: T) {
        if (!isEmpty(formObject) && typeof formObject === "object") {
            const clone: T = deepCopy<T>(formObject);
            for (const field in clone) {
                this.formObject.set(field, new ValidatorModelItem<T>(field, clone[field]));
            }
        }
    }
    /**
     * Validates the specified fields based on the validation type
     * @param fields The fields to be validated
     * @param type The type of validation
     * @important Not matching `ValidationTypeWithoutSpecs` typescript error means that you need to provide a specs object as a third paramenter for the selected type
     * @returns The form validator
     */
    addValidation(fields: Array<keyof T>, type: ValidationTypeWithoutSpecs): FormValidator<T>;
    /**
     * Validates the specified fields based on the validation type
     * @param fields The fields to be validated
     * @param type The type of validation `"dateRange"`
     * @param spec The specifications of the validation (`minDate` and/or `maxDate`)
     * @returns The form validator
     */
    addValidation(fields: Array<keyof T>, type: "dateRange", specs: SpecialPick<ValidationSpecs, "minDate", "maxDate">): FormValidator<T>;
    /**
     * Validates the specified fields based on the validation type
     * @param fields The fields to be validated
     * @param type The type of validation `"textLength"`
     * @param spec The specifications of the validation (`minLength` and/or `maxLength`)
     * @returns The form validator
     */
    addValidation(fields: Array<keyof T>, type: "textLength", specs: SpecialPick<ValidationSpecs, "minLength", "maxLength">): FormValidator<T>;
    /**
     * Validates the specified fields based on the validation type
     * @param fields The fields to be validated
     * @param type The type of validation `"valueRange"`
     * @param spec The specifications of the validation (`minValue` and/or `maxValue`)
     * @returns The form validator
     */
    addValidation(fields: Array<keyof T>, type: "valueRange", specs: SpecialPick<ValidationSpecs, "minValue", "maxValue">): FormValidator<T>;
    addValidation(fields: Array<keyof T>, type: ValidationType, specs?: ValidationSpecs): FormValidator<T> {
        if (fields && fields instanceof Array && type && typeof type === "string" && this.isValidType(type)) {
            if (fields.length) {
                (fields as Array<keyof T>).map((field: keyof T) => {
                    if (this.formObject.has(field)) {
                        this.formObject.get(field).validations.push(type);
                        if (!isEmpty(specs)) {
                            this.formObject.get(field).specs = { ...this.formObject.get(field).specs, ...specs };
                        }
                    }
                });
            }
        }
        return this;
    }

    /**
     * Add a custom validator that returns an error message if found
     * @param {Array<string>} fields The fields to be validated
     * @param {Array<string>} errorFields The fields where the error is reported to
     * @param {function} validator The validator method
     * @returns {FormValidator} The form validator object
     * @example addValidator(["balance", "payment"], ["payment"], (balance: number, payment: number) => { return payment > balance ? "The payment exceeds your balance" : null; });
     */
    addCustomValidator(fields: Array<keyof T>, errorFields: Array<keyof T>, validator: (...params: Array<any>) => ModelFieldError): FormValidator<T> {
        if (fields && fields instanceof Array && fields.length && errorFields && errorFields instanceof Array && errorFields.length && validator && validator instanceof Function) {
            this.customValidators.push({ fields, errorFields, validator });
        }
        return this;
    }

    /**
     * Get the error found in the form object. Has to be called after `validate` method has been called.
     * @returns {any} The form object object populated by validation errors, if found any. Otherwise, it's an empty object.
     */
    getErrors(): ModelErrors<T> {
        return this.formObjectErrors;
    }

    /**
     * Get a specific error found during validation, if any. Has to be called after `validate` method has been called.
     * @returns {any} The error of the specific item in the form, if any.
     */
    getError(name: keyof T): ModelFieldError {
        return this.formObjectErrors[name];
    }

    /**
     * Validates the form object passed in the constructor
     * @returns {FormValidator} The form validator object
     */
    validate(): FormValidator<T> {
        this.formObject.forEach((item: ValidatorModelItem<T>) => {
            if (item.validations.length) {
                let fieldError: ModelFieldError;
                let i: number = 0;
                do {
                    fieldError = this.validateField(item.value, item.validations[i], item.specs);
                    if (!isEmpty(fieldError)) {
                        this.formObjectErrors[item.name] = fieldError;
                    }
                    i++;
                } while (i < item.validations.length && this.formObjectErrors[item.name]);
            }
        });

        // if (this.extraValidators.length) {
        //     this.extraValidators.map((extraValidator: ExtraValidator<T>) => {
        //         const valuesOfFields: Array<any> = [];
        //         extraValidator.fields.map((field: keyof T) => {
        //             if (this.formObject.hasOwnProperty(field)) {
        //                 valuesOfFields.push(this.formObject[field].value);
        //             }
        //         });
        //         const extraValidatorError: string = extraValidator.validate(...valuesOfFields);
        //         extraValidator.errorFields.map((field: keyof T) => {
        //             if (this.formObject.hasOwnProperty(field) && !this.errors[field]) {
        //                 (extraValidatorError) && (this.errors[field] = extraValidatorError);
        //             }
        //         });
        //     });
        // }
        return this;
    }

    /**
     * Validate a parameter in the form formObject based on predefined set of criteria
     * @param {ValidatorModelItem} fieldObject The field object stored in the local formObject
     * @returns {string} The error found in the parameter
     */
    private validateField(value: any, type: ValidationType, specs: ValidationSpecs): ModelFieldError {
        let fieldError: ModelFieldError = null;
        switch (type) {
            case "required": return isEmpty(value) ? { errorCode: "empty" } : null;
            case "isDate": return value instanceof Date ? null : { errorCode: "invalidDate" };
            case "noWhitespace": return value && (value as string).trim() === "" ? { errorCode: "isWhitespace" } : null;
            case "dateRange":
                if (value instanceof Date) {
                    if (specs.minDate) {
                        fieldError = moment(clearTime(value)).isBefore(clearTime(specs.minDate)) ? { errorCode: "beforeMinDate", specs: { minDate: specs.minDate } } : null;
                    }
                    if (!fieldError && specs.maxDate) {
                        fieldError = moment(clearTime(value)).isAfter(clearTime(specs.maxDate)) ? { errorCode: "afterMaxDate", specs: { maxDate: specs.maxDate } } : null;
                    }
                    return fieldError;
                } else {
                    return { errorCode: "invalidDate" };
                }
            case "textLength":
                if (typeof value === "string") {
                    if (specs.minLength) {
                        fieldError = value.length < specs.minLength ? { errorCode: "lessThanMinLength", specs: { minLength: specs.minLength } } : null;
                    }
                    if (!fieldError && specs.maxLength) {
                        fieldError = value.length > specs.maxLength ? { errorCode: "moreThanMaxLength", specs: { maxLength: specs.maxLength } } : null;
                    }
                    return fieldError;
                } else {
                    return { errorCode: "invalidInput" };
                }
            case "valueRange":
                if (typeof value === "number") {
                    if (specs.minValue) {
                        fieldError = value < specs.minValue ? { errorCode: "lessThanMinValue", specs: { minValue: specs.minValue } } : null;
                    }
                    if (!fieldError && specs.maxValue) {
                        fieldError = value > specs.maxValue ? { errorCode: "moreThanMaxValue", specs: { maxValue: specs.maxValue } } : null;
                    }
                    return fieldError;
                } else {
                    return { errorCode: "invalidInput" };
                }
            case "validEmail": return isEmail(value) ? null : { errorCode: "invalidEmail" };
            case "strongPassword": return isStrongPassword(value) ? null : { errorCode: "weakPassword" };
            case "isPhoneNumber": return isPhoneNumber(value) ? null : { errorCode: "invalidPhoneNumber" };
            default: return null;
        }
    }

    // Helpers
    private isValidType(type: ValidationType): boolean {
        const availableValidationTypes: Object & { [K in ValidationType]-?: any } = {
            required: true,
            isDate: true,
            noWhitespace: true,
            dateRange: true,
            textLength: true,
            valueRange: true,
            validEmail: true,
            strongPassword: true,
            isPhoneNumber: true,
        };
        return availableValidationTypes.hasOwnProperty(type);
    }
}
