import { OptionType } from "./option.type";
import { OpenApiGenerator } from "../generatorList";

export interface CustomOptionType extends OptionType {
    mappingName?: string;
    dependedOption?: Array<string>;
    errorMessage?: string;
    noValue?: boolean;
}

export interface SEBTemplate {
    generator: OpenApiGenerator;
    templatePath: string;
}

enum OptionName {
    baseUrl = "--baseUrl",
    baseUrlShort = "-u",
    sebTemplate = "--sebTemplate",
    interceptorPath = "--interceptorPath",
    interceptorPathShort = "-ip",
    interceptorName = "--interceptorName",
    interceptorNameShort = "-in",
    configPath = "--configPath",
    configPathShort = "-cp",
    configName = "--configName",
    configNameShort = "-cn"
}

/**
 * custom options
 */

const options: Array<CustomOptionType> = [
    {
        option: [OptionName.baseUrlShort, OptionName.baseUrl],
        description: "baseUrl",
        mappingName: "baseUrl"
    },
    {
        option: [OptionName.sebTemplate],
        description: "use seb template",
        noValue: true
    },
    {
        option: [OptionName.interceptorPathShort, OptionName.interceptorPath],
        description: "path of axios interceptor",
        mappingName: "interceptorPath",
        dependedOption: [OptionName.interceptorName, OptionName.interceptorNameShort],
        errorMessage: `${OptionName.interceptorPathShort} must be defined along with ${OptionName.interceptorNameShort}`
    },
    {
        option: [OptionName.interceptorNameShort, OptionName.interceptorName],
        description: "name of axios interceptor",
        mappingName: "interceptorName",
        dependedOption: [OptionName.interceptorPath, OptionName.interceptorPathShort],
        errorMessage: `${OptionName.interceptorPathShort} must be defined along with ${OptionName.interceptorNameShort}`
    },
    {
        option: [OptionName.configPathShort, OptionName.configPath],
        description: "path of axios config",
        mappingName: "configPath",
        dependedOption: [OptionName.configName, OptionName.configNameShort],
        errorMessage: `${OptionName.configPathShort} must be defined along with ${OptionName.configNameShort}`
    },
    {
        option: [OptionName.configNameShort, OptionName.configName],
        description: "name of axios config",
        mappingName: "configName",
        dependedOption: [OptionName.configPath, OptionName.configPathShort],
        errorMessage: `${OptionName.configPathShort} must be defined along with ${OptionName.configNameShort}`
    }
];

const templates: Array<SEBTemplate> = [
    {
        generator: "typescript-axios",
        templatePath: "./node_modules/@sebgroup/frontend-tools/dist/openapiGenerator/templates/typescript-axios"
    },
    {
        generator: "typescript-angular",
        templatePath: "./node_modules/@sebgroup/frontend-tools/dist/openapiGenerator/templates/typescript-angular"
    }
]

export { options as CustomOptions, OptionName as CustomOptionName, templates as CustomTemplates };