/**
 * This is a utility class for handling pagination inside of reflow, just some handy methods
 * you can use to paginate your data. By default we paginate by 25 items, but you can change
 * this value.
 * 
 * IMPORTANT: You should have consistency in your pagination, if you start at page 1 with 15 items per page
 * all subsequent pages should have 15 items per page also. If you change this number you should go back to page 1.
 */
class Pagination {
    /**
     * @param {number} [itemsPerPage=25] - This is the number of items by each page, by default it's 25.s
     */
    constructor(itemsPerPage=25) {
        this.itemsPerPage = itemsPerPage
    }

    /**
     * This method will return the offset and limit for the query for the number of pages.
     * 
     * @param {number} currentPage - This is the current page number, is it page 1, page 2?
     * 
     * @returns {Promise<{offset: number, limit: number}>} - The offset and the limit to filter the data
     * in your queries.
     */
    async getOffsetAndLimit(currentPage) {
        const limit = this.itemsPerPage * currentPage
        const offset = limit - this.itemsPerPage
        return {
            offset,
            limit
        }
    }

    /**
     * Will return the pagination data to send to the user. This is default, if your controller uses any pagination
     * you should use this.
     * 
     * @param {number} currentPage - This is the current page number, is it page 1, page 2?
     * @param {number} totalItems - This is the total number of items that it retrieves.
     * 
     * @returns {Promise<{current: number, total: number}>} - The pagination data to send to the user in your controller.
     */
    async getPaginationData(currentPage, totalItems) {
        return {
            current: currentPage,
            total: Math.ceil(totalItems / this.itemsPerPage)
        }
    }
}

module.exports = Pagination