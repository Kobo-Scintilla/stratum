import { retry } from './retry.js';
export class RestDataProviderHttpProviderUsingFetch {
    fetch;
    constructor(fetch) {
        this.fetch = fetch;
    }
    async get(url) {
        return await retry(async () => this.myFetch(url).then((r) => {
            return r;
        }));
    }
    put(url, data) {
        return this.myFetch(url, {
            method: 'put',
            body: JSON.stringify(data),
        });
    }
    delete(url) {
        return this.myFetch(url, { method: 'delete' });
    }
    async post(url, data) {
        return await retry(() => this.myFetch(url, {
            method: 'post',
            body: JSON.stringify(data),
        }));
    }
    myFetch(url, options) {
        const headers = {};
        if (options?.body)
            headers['Content-type'] = 'application/json';
        if (typeof window !== 'undefined' &&
            typeof window.document !== 'undefined' &&
            typeof (window.document.cookie !== 'undefined'))
            for (const cookie of window.document.cookie.split(';')) {
                if (cookie.trim().startsWith('XSRF-TOKEN=')) {
                    headers['X-XSRF-TOKEN'] = cookie.split('=')[1];
                }
            }
        return (this.fetch || fetch)(url, {
            credentials: 'include',
            method: options?.method,
            body: options?.body,
            headers,
        })
            .then((response) => {
            return onSuccess(response);
        })
            .catch(async (error) => {
            let r = await error;
            throw r;
        });
    }
}
function onSuccess(response) {
    if (response.status == 204)
        return;
    if (response.status >= 200 && response.status < 300)
        return response.json();
    else {
        throw response
            .json()
            .then((x) => {
            return {
                ...x,
                message: x.message || response.statusText,
                url: response.url,
                status: response.status,
            };
        })
            .catch(() => {
            throw {
                message: response.statusText,
                url: response.url,
                status: response.status,
            };
        });
    }
}
