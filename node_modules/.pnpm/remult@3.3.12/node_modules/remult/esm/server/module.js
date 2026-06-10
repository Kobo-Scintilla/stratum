export class Module {
    key;
    priority;
    entities;
    controllers;
    initApi;
    initRequest;
    modules;
    constructor(options) {
        this.key = options.key;
        this.priority = options.priority ?? 0;
        this.entities = options.entities;
        this.controllers = options.controllers;
        this.initApi = options.initApi;
        this.initRequest = options.initRequest;
        this.modules = options.modules;
    }
}
/**
 * Full flat and ordered list by index and concatenaining the modules name
 */
export const modulesFlatAndOrdered = (modules) => {
    const flattenModules = (modules, parentName = '') => {
        return modules.reduce((acc, module) => {
            const fullKey = parentName ? `${parentName}-${module.key}` : module.key;
            // Create a new module object without the 'modules' property
            const { modules: _, ...flatModule } = module;
            const newModule = { ...flatModule, key: fullKey };
            const subModules = module.modules
                ? flattenModules(module.modules, fullKey)
                : [];
            return [...acc, newModule, ...subModules];
        }, []);
    };
    const flatModules = flattenModules(modules);
    flatModules.sort((a, b) => a.priority - b.priority);
    return flatModules;
};
