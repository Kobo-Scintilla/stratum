/**
 * Implementation of the [Standard Schema](https://standardschema.dev/) specification
 *
 * @example
 * ```ts
 * // The schema for the entire entity
 * const schema = standardSchema(repo(User))
 *
 * // The schema for a specific field
 * const schema = standardSchema(repo(User), 'id')
 *
 * // The schema for multiple fields
 * const schema = standardSchema(repo(User), 'name', 'age')
 * ```
 */
export function standardSchema(repo, ...fields) {
    return {
        '~standard': {
            version: 1,
            vendor: 'remult',
            async validate(value) {
                if (typeof value !== 'object') {
                    if (fields.length > 0) {
                        return {
                            issues: [
                                {
                                    message: `Invalid shape, expected: { ${fields
                                        .map((f) => `${String(f)}: ___`)
                                        .join(', ')} }`,
                                    path: [],
                                },
                            ],
                        };
                    }
                    return {
                        issues: [
                            {
                                message: `Invalid shape, expected an object of entity: ${String(repo.metadata.key)}`,
                                path: [],
                            },
                        ],
                    };
                }
                const item = value;
                try {
                    const error = await repo.validate(item, ...fields);
                    if (error && error.modelState) {
                        return {
                            issues: Object.entries(error.modelState).map(([key, message]) => ({
                                message: message,
                                path: [key],
                            })),
                        };
                    }
                }
                catch (err) {
                    if (err instanceof Error) {
                        return { issues: [{ message: err.message, path: [] }] };
                    }
                }
                if (fields.length > 0) {
                    const filteredItem = {};
                    for (const field of fields) {
                        if (field in item) {
                            filteredItem[field] = item[field];
                        }
                    }
                    return { value: filteredItem };
                }
                return { value: item };
            },
        },
    };
}
