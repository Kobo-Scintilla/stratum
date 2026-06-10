export async function entityDbName(metadata, wrapIdentifier = (x) => x) {
    if (metadata.options.sqlExpression) {
        if (typeof metadata.options.sqlExpression === 'string')
            return metadata.options.sqlExpression;
        else if (typeof metadata.options.sqlExpression === 'function') {
            const prev = metadata.options.sqlExpression;
            try {
                metadata.options.sqlExpression =
                    "recursive sqlExpression call for entity '" + metadata.key + "'. ";
                return await prev(metadata);
            }
            finally {
                metadata.options.sqlExpression = prev;
            }
        }
    }
    return wrapIdentifier(metadata.dbName);
}
