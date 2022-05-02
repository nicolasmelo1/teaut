/** @module src/formula/utils/helpers/dynamicArray */

/**
 * Flow is language agnostic. This means that everything supported by flow needs to be supported by other languages.
 * Other languages might not implement dynamic arrays the same way as javascript or even python (the original language
 * flow was implemented in). Because of that we've created a dynamic array utility that can be used to implement arrays 
 * inside of flow.
 * 
 * Since performance is not actually an issue and the possibility to translate this code to another language
 * is. This is needed so in other languages we can just translate the implementation.
 * 
 * This is agnostic to the formulas, since this is a HELPER. So try to keep ._representation_() and other stuff in
 * The actual primitive objects of Flow
 * 
 * Reference: https://www.geeksforgeeks.org/implementation-of-dynamic-array-in-python/
 *            https://stackoverflow.com/a/3917632
 *            https://www.youtube.com/watch?v=5AllG-i_yto
 */
class DynamicArrayHelper {
    constructor() {
        this.numberOfElements = 0 // Count actual elements (Default is 0)
        this.capacity = 1 // Default capacity
        this.array = []
    }

    /**
     * You should always use this factory function to create a new class instead of the function because by doing so
     * you can use the async/await syntax to append values to the array and so on.
     * 
     * @param {Array<any>} elements - All of the elements of the array.
     * 
     * @returns {Promise<DynamicArrayHelper>} - Returns the actual DynamicArray class instance initialized with the given elements.
     */
    static async initialize(elements=[]) {
        const dynamicArray = new this()
        dynamicArray.array = await dynamicArray.makeArray(this.capacity) // Default array
        for (const element of elements) {
            await dynamicArray.append(element)
        }
        return dynamicArray
    }

    /**
     * Retrieves the length of the dynamic array.
     * 
     * @returns {Promise<number>} - Returns the length of the dynamic array.
     */
    async length() {
        return this.numberOfElements
    }

    /**
     * Gets an item at a specific index in the array. The index can also be negative so if the user
     * wants to retrieve the last element of the array he can use the index -1.
     * 
     * @param {number} index - The index of the element that should be retrieved.
     * 
     * @returns {Promise<any>} - Returns the element at the given index.
     */
    async getItem(index) {
        if (index < 0) index = this.numberOfElements + index

        if (index >= this.numberOfElements) {
            throw new Error(`Index out of bounds: ${index}`)
        }
        // Retrieve from the array at index
        return this.array[index]
    }

    /**
     * Appends the element at the end of the array.
     * 
     * @param {any} element - Any type of element can be inserted in the array.
     */
    async append(element) {
        if (this.numberOfElements === this.capacity) {
            // Double capacity if not enough room
            await this.#resize(this.capacity * 2)
        }
        const lastIndexOfTheArray = this.numberOfElements
        this.array[lastIndexOfTheArray] = element
        this.numberOfElements++
    }

    /**
     * Insert a given element at a specific index. We can also delete the element at the position to make space
     * for the new element. 
     * 
     * @param {any} item - The element that should be inserted in the array.
     * @param {number} index - The index where the element should be inserted.
     * @param {boolean} deleteElementAtIndex - If true the element at the given index will be deleted. Otherwise we will
     * add space for the new element.
     */
    async insertAt(item, index, deleteElementAtIndex=false) {
        if (index < 0) index = this.numberOfElements + index

        const isIndexBiggerThanNumberOfElements = index >= this.numberOfElements
        const isCapacityAtLimit = this.numberOfElements === this.capacity

        if (isIndexBiggerThanNumberOfElements) {
            throw new Error(`Index out of bounds: ${index}`)
        }

        if (isCapacityAtLimit) {
            // Double capacity if not enough room
            await this.#resize(this.capacity * 2)
        }
        
        // adds space for the element to be added
        if (!deleteElementAtIndex) {
            for (let i = this.numberOfElements - 1; i > index-1; i--) {
                this.array[i+1] = this.array[i]
            }
        }

        this.array[index] = item
        if (!deleteElementAtIndex) this.numberOfElements++
    }

    /**
     * Pop the last element of the array out of the array returning the element that was popped.
     * 
     * @returns {Promise<any>} - Returns the last element of the array that was popped and is not on the array anymore.
     */
    async pop() {
        const isArrayEmpty = this.number_of_elements == 0
        if (isArrayEmpty) {
            throw new Error(`Array is empty, cannot delete`)
        }

        const element = this.array[this.numberOfElements - 1]

        this.array[this.numberOfElements - 1] = undefined
        this.numberOfElements--

        // Resize down the array if the array is less than half full
        if (this.numberOfElements < (Math.ceil(this.capacity/2))) await this.#resize(Math.ceil(this.capacity/2))

        return element
    }

    /**
     * Remove an element at a specific index.
     * 
     * @param {number} index - The index of the element that should be removed.
     */
    async removeAt(index) {
        if (index < 0) index = this.numberOfElements + index

        const isArrayEmpty = this.numberOfElements == 0
        const isIndexBiggerThanNumberOfElements = index >= this.numberOfElements

        if (isArrayEmpty) throw new Error("Array is empty deletion not Possible")
        if (isIndexBiggerThanNumberOfElements) throw new Error("Index out of bounds")

        const isLastIndex = index == this.numberOfElements - 1

        if (isLastIndex) {
            this.array[index] = undefined
            this.numberOfElements--
        } else {
            // move the elements in the array to fill the gap
            for (let i = index; i < this.numberOfElements; i++) {
                this.array[i] = this.array[i + 1]            
            }
            this.array[this.numberOfElements - 1] = undefined
            this.numberOfElements--
        }
        
        // Resize down the array if the array is less than half full
        if (this.numberOfElements < (Math.ceil(this.capacity/2))) await this.#resize(Math.ceil(this.capacity/2))
    }

    /**
     * Resizes the array to a new capacity. This is what makes the array dynamic.
     * 
     * @param {number} newCapacity - The new capacity of the array.
     */
    async #resize(newCapacity) {
        let newArray = await this.makeArray(newCapacity)
        for (let i = 0; i < this.numberOfElements; i++) {
            newArray[i] = this.array[i]
        }
        this.array = newArray
        this.capacity = newCapacity
    }

    /**
     * Creates a new array with the given capacity.
     * 
     * @param {number} newCapacity - The newCapacity of the new array.
     * 
     * @returns {Promise<undefined[]>} - Returns the new array.
     */
    async makeArray(newCapacity) {
        return Array.apply(undefined, Array(newCapacity))
    }
}

module.exports = DynamicArrayHelper