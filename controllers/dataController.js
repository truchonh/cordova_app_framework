axios.defaults.timeout = ms('15s');

class dataCtrl {

    /**
     * Send a request to the api and handle errors
     * @param config
     * @private
     * @returns {Promise<*>}
     */
    static async _request(config) {
        if (storageCtrl.isCachingActive() && config.method === 'GET') {
            let cachedRes = await cacheCtrl.getCache(config.method, config.url);
            if (cachedRes) {
                return cachedRes.data;
            }
        }

        let start = window.performance.now();
        try {
            let response = await axios(config);

            if (deviceCtrl.state !== deviceState.deviceReady) {
                console.info(response);
            }

            app.log(
                this._formatRequestLogAsHTML({
                    method: config.method,
                    url: config.url,
                    status: response.status,
                    contentLength: response.headers['content-length'] || '',
                    responseTime: window.performance.now() - start,
                })
            );

            await cacheCtrl.updateCache(config.method, config.url, response);

            return response.data;
        } catch (err) {
            console.error(err);
            console.error(err.config);
            if (err.response) {
                console.info(err.response);
                console.error('--- RESPONSE LEVEL ERROR ---');
                console.error(err.response);
                // The server responded with an error
                app.log(
                    this._formatRequestLogAsHTML({
                        method: config.method,
                        url: config.url,
                        status: err.response.status,
                        contentLength: '',
                        responseTime: window.performance.now() - start,
                    })
                );

                switch (err.response.status) {
                    case 304: {
                        let cachedRes = await cacheCtrl.getCache(config.method, config.url);
                        if (cachedRes) {
                            return cachedRes.data;
                        } else {
                            app.displayError(this.buildErrorMessage(err.response));
                        }
                        break;
                    }
                    case 400: {
                        app.displayError(this.buildValidationErrorMessage(err.response));
                        break;
                    }
                    case 404: {
                        app.displayError('404 - Not Found');
                        break;
                    }
                    case 403: {
                        app.notify("[403] Erreur d'authentification.");
                        break;
                    }
                    default:
                        app.displayError(this.buildErrorMessage(err.response));
                }
            } else if (err.request) {
                console.info(err.request);
                console.error('--- REQUEST LEVEL ERROR ---');
                console.error(err.request);
                // The request failed.
                this.isServerAvailable = false;
                let cachedRes = await cacheCtrl.getCache(config.method, config.url);
                if (cachedRes) {
                    return cachedRes.data;
                } else {
                    throw new NetworkError();
                }
            } else {
                app.displayError(err.message);
            }
        }
    }

    static _formatRequestLogAsHTML(options) {
        let { method, url, status, contentLength, responseTime } = options;

        let html = '';

        html += `<span style="color:#f4d442">${method}</span> `;
        html += `<span style="color:#41aff4">${url}</span> `;

        let statusColor;
        if (200 <= status && status < 300) {
            statusColor = '#97f42d';
        } else if (300 <= status && status < 400) {
            statusColor = '#417ff4';
        } else if (400 <= status && status < 500) {
            statusColor = '#f4d442';
        } else {
            statusColor = '#f44141';
        }
        html += `<span style="color:${statusColor}">${status}</span> `;
        let contentLengthStr = contentLength ? ' - ' + contentLength : '';
        html += `<span style="color:#888888">| ${responseTime.toFixed(1)}ms${contentLengthStr}</span>`;

        return html;
    }

    /**
     * Build the html for the message from the error response.
     * @param response {{status: number, data: object}}
     * @returns {string}
     */
    static buildErrorMessage(response) {
        return `
                <b>[${response.status}] ${response.data.message}</b><br/>
                <small><pre>${
                    response.data.internalError ? response.data.internalError.join('<br/>') : response.data
                }</pre></small>
            `;
    }

    static buildValidationErrorMessage(response) {
        return `
                <b>[${response.status}] Erreur de validation</b><br/>
                ${response.data.message}
            `;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// MAPPING OF API ROUTES TO ASYNC/AWAIT FUNCTIONS
    ///

}
