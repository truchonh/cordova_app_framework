window.cacheCtrl = class cacheCtrl {
    static init() {
        this._cacheDb = new PouchDB('cache');
        this._cacheDb
            .createIndex({
                index: {
                    fields: ['type'],
                },
            })
            .catch(err => console.warn(`Error creating indexes (${err})`));
    }

    /**
     * Return the cache item, if the value is there and valid.
     * @param method {"GET" | "POST" | "PUT" | "DELETE"}
     * @param url {string}
     */
    static async getCache(method, url) {
        try {
            let entry = await this._cacheDb.get(`${method}${url}`);
            if (entry) {
                // allow to return an expired entry if the app is in offline mode
                if (entry.expiration === null || !dataCtrl.isServerAvailable || entry.expiration > Date.now())
                    return JSON.parse(entry.response);
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Update the value of a cache entry or expire cache entries related to that url
     * @param method {"GET" | "POST" | "PUT" | "DELETE"}
     * @param url {string}
     * @param response {*}
     */
    static async updateCache(method, url, response) {
        try {
            const cudUrlTypes = [
                this._urlType.POST__file,
                this._urlType.PUT__api__transaction__$transaction_id,
                this._urlType.DELETE__api__statement__$statement_id,
                this._urlType.PUT__api__statement__$statement_id__approve,
                this._urlType.POST__api__statement__file__$file_type,
                this._urlType.POST__api__category,
                this._urlType.DELETE__api__category__$category_id,
                this._urlType.GET__api__task__execute,
            ];

            let urlType = this._getUrlType(method, url);
            if (cudUrlTypes.includes(urlType)) {
                let urlTypesToExpire = this._getTypesToExpire(urlType);
                await this._expireCache(urlTypesToExpire);
            } else if (urlType !== null) {
                await this._setCache(urlType, `${method}${url}`, response);
            }
        } catch (err) {
            // do nothing
            console.warn(err);
        }
    }

    /**
     * Expire cache entries depending on the server event
     * @param {string} eventType
     * @returns {Promise<void>}
     */
    static async expireFromServerEvent(eventType) {
        let urlTypesToExpire = [];
        switch (eventType) {
            // Any kind of transaction has been imported
            case 'TRANSACTIONS_IMPORTED': {
                urlTypesToExpire = [
                    this._urlType.GET__api__account__balance,
                    this._urlType.GET__api__statement__count,
                    this._urlType.GET__api__transaction,
                    this._urlType.GET__api__transaction__balance_history,
                ];
                break;
            }
            // Transaction afecting the total balance has been imported
            case 'NON_TRANSFER_TRANSACTIONS_IMPORTED': {
                urlTypesToExpire = [
                    this._urlType.GET__api__account__balance,
                    this._urlType.GET__api__statement__count,
                    this._urlType.GET__api__transaction,
                    this._urlType.GET__api__transaction__balance_history,
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                ];
                break;
            }
            // A statement changed to the unapproved state (or a new one was created)
            case 'STATEMENT_UNAPPROVED': {
                urlTypesToExpire = [
                    this._urlType.GET__api__statement__approved__$is_approved,
                    this._urlType.GET__api__statement__history,
                    this._urlType.GET__api__statement__count,
                    this._urlType.GET__api__statement__$statement_id,
                ];
                break;
            }
        }
        try {
            await this._expireCache(urlTypesToExpire);
        } catch (err) {
            console.warn(err);
        }
    }

    /**
     * Delete the whole cache database and recreate fresh indexes.
     * Useful when switching users.
     */
    static async clearCache() {
        await this._cacheDb.destroy();
        this._cacheDb = new PouchDB('cache');
        await this._cacheDb.createIndex({
            index: {
                fields: ['type'],
            },
        });
    }

    /**
     * Get the url type
     * @param method {"GET" | "POST" | "PUT" | "DELETE"}
     * @param url {string}
     * @return {number|null}
     * @private
     */
    static _getUrlType(method, url) {
        const SECTION = {
            OBJECT_ID: `[0-9a-f]+`,
            BOOL: `(false|true)`,
            INT: `[0-9]+`,
            WORDS: `.+`,
        };
        // prettier-ignore
        const urlRegexp = [
            new RegExp(`^POST/file`),                                                   // "POST/file"

            new RegExp(`^GET/api/transaction/spending`),                                // "GET/api/transaction/spending"
            new RegExp(`^GET/api/transaction/recent`),                                  // "GET/api/transaction/recent"
            new RegExp(`^GET/api/transaction/balance_history`),                         // "GET/api/transaction/balance_history"
            new RegExp(`^GET/api/transaction/${SECTION.OBJECT_ID}`),                    // "GET/api/transaction/:transaction_id"
            new RegExp(`^GET/api/transaction`),                                         // "GET/api/transaction"
            new RegExp(`^PUT/api/transaction/${SECTION.OBJECT_ID}`),                    // "PUT/api/transaction/:transaction_id"

            new RegExp(`^GET/api/statement/approved/${SECTION.BOOL}`),                  // "GET/api/statement/approved/:is_approved"
            new RegExp(`^GET/api/statement/history`),                                   // "GET/api/statement/history"
            new RegExp(`^__GET/api/statement/count`),                                     // "GET/api/statement/count"
            new RegExp(`^GET/api/statement/${SECTION.OBJECT_ID}`),                      // "GET/api/statement/:statement_id"
            new RegExp(`^DELETE/api/statement/${SECTION.OBJECT_ID}`),                   // "DELETE/api/statement/:statement_id"
            new RegExp(`^PUT/api/statement/${SECTION.OBJECT_ID}/approve`),              // "PUT/api/statement/:statement_id/approve"
            new RegExp(`^POST/api/statement/file/${SECTION.INT}`),                      // "POST/api/statement/file/:file_type"

            new RegExp(`^GET/api/category/${SECTION.INT}`),                             // "GET/api/category/:category_type"
            new RegExp(`^__GET/api/category/count`),                                      // "GET/api/category/count"
            new RegExp(`^GET/api/category`),                                            // "GET/api/category"
            new RegExp(`^POST/api/category`),                                           // "POST/api/category"
            new RegExp(`^DELETE/api/category/${SECTION.OBJECT_ID}`),                    // "DELETE/api/category/:category_id"

            new RegExp(`^GET/api/account/balance`),                                     // "GET/api/account/balance"

            new RegExp(`^GET/api/task/execute`),                                        // "GET/api/task/execute"
        ];

        for (let index = 0; index < urlRegexp.length; index++) {
            let regexp = urlRegexp[index];
            if (regexp.test(`${method}${url}`)) {
                return index;
            }
        }
        return null;
    }

    /**
     * Update the value of a cache entry
     * @param urlType {number}
     * @param combinedUrl {string}
     * @param response {*}
     * @private
     */
    static async _setCache(urlType, combinedUrl, response) {
        // remove existing entry if present
        try {
            let entry = await this._cacheDb.get(combinedUrl);
            await this._cacheDb.remove(entry);
        } catch (err) {
            /* do nothing */
        }

        await this._cacheDb.put({
            _id: combinedUrl,
            type: urlType,
            response: JSON.stringify(response),
            expiration: null,
        });
    }

    /**
     * Expire cache entries related to that url
     * @param {number[]} urlTypesToExpire
     * @private
     */
    static async _expireCache(urlTypesToExpire) {
        let filteredDocs = await this._cacheDb.find({
            selector: {
                type: { $in: urlTypesToExpire },
            },
        });
        console.info(filteredDocs);
        app.log(`<span style="color:#f4d442">Expired ${filteredDocs.docs.length} cache entries</span>`);
        let promises = [];
        filteredDocs.docs.forEach(entry => {
            entry.expiration = Date.now();
            promises.push(this._cacheDb.put(entry));
        });
        await Promise.all(promises);
    }

    /**
     * @readonly
     * @enum {number}
     */
    static get _urlType() {
        // prettier-ignore
        return Object.freeze({
            POST__file: 0,                                              // Upload un fichier

            GET__api__transaction__spending: 1,                         // Valeur calculé du diagram des dépenses
            GET__api__transaction__recent: 2,                           // Historique des transactions
            GET__api__transaction__balance_history: 3,                  // Historique du solde des comptes
            GET__api__transaction__$transaction_id: 4,                  // Obtient les transactions du relevé avec la même description
            GET__api__transaction: 5,                                   // Obtient les transactions d'un relevé
            PUT__api__transaction__$transaction_id: 6,                  // Assigner une catégorie à un grp de transactions

            GET__api__statement__approved__$is_approved: 7,             // Obtient les relevés approuvés ou non
            GET__api__statement__history: 8,                            // Historique des relevés
            GET__api__statement__count: 9,                              // number of unapproved statements
            GET__api__statement__$statement_id: 10,                     // Obtient un relevé
            DELETE__api__statement__$statement_id: 11,                  // Supprimer un relevé
            PUT__api__statement__$statement_id__approve: 12,            // Approuver un relevé
            POST__api__statement__file__$file_type: 13,                 // Importer un relevé

            GET__api__category__$category_type: 14,                     // Obtient des catégories par type
            GET__api__category__count: 15,                              // Number of sub-category without a parent category
            GET__api__category: 16,                                     // Obtient toutes les catégories
            POST__api__category: 17,                                    // Ajouter ou modifier une catégorie
            DELETE__api__category__$category_id: 18,                    // Supprime une catégorie

            GET__api__account__balance: 19,                             // Balances actuelle des comptes

            GET__api__task__execute: 20,                                // Lance l'exécution du web scraper
        });
    }

    /**
     * @param urlType {number}
     * @returns {number[]}
     * @private
     */
    static _getTypesToExpire(urlType) {
        switch (urlType) {
            case this._urlType.PUT__api__transaction__$transaction_id:
                return [
                    this._urlType.GET__api__transaction__$transaction_id,
                    this._urlType.GET__api__transaction,
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                    this._urlType.GET__api__transaction__balance_history,
                    this._urlType.GET__api__category,
                    this._urlType.GET__api__category__$category_type,
                    this._urlType.GET__api__category__count,
                ];
            case this._urlType.DELETE__api__statement__$statement_id:
                return [
                    this._urlType.GET__api__transaction__$transaction_id,
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                    this._urlType.GET__api__transaction__balance_history,
                    this._urlType.GET__api__statement__approved__$is_approved,
                    this._urlType.GET__api__statement__history,
                    this._urlType.GET__api__statement__$statement_id,
                ];
            case this._urlType.PUT__api__statement__$statement_id__approve:
                return [
                    this._urlType.GET__api__statement__approved__$is_approved,
                    this._urlType.GET__api__statement__history,
                    this._urlType.GET__api__statement__$statement_id,
                    this._urlType.GET__api__transaction__recent,
                ];
            case this._urlType.POST__api__statement__file__$file_type:
                return [
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                    this._urlType.GET__api__transaction__balance_history,
                    this._urlType.GET__api__statement__approved__$is_approved,
                    this._urlType.GET__api__statement__history,
                    this._urlType.GET__api__statement__count,
                ];
            case this._urlType.POST__api__category:
                return [
                    this._urlType.GET__api__transaction,
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                    this._urlType.GET__api__category,
                    this._urlType.GET__api__category__$category_type,
                ];
            case this._urlType.DELETE__api__category__$category_id:
                return [
                    this._urlType.GET__api__transaction,
                    this._urlType.GET__api__transaction__spending,
                    this._urlType.GET__api__transaction__recent,
                    this._urlType.GET__api__category,
                    this._urlType.GET__api__category__$category_type,
                    this._urlType.GET__api__statement__count,
                    this._urlType.GET__api__category__count,
                ];
            default:
                return [];
        }
    }
};