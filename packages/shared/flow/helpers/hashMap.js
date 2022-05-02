/** @module src/formula/utils/helpers/hashMap */

const DynamicArray = require('./dynamicArray')

/**
 * This is each node of the HashTable. Each node of the hash table is also a linked list.
 * So in the worst cenario, if it has a collision we will not take up memory creating new list
 * we just append the next node to the first node. This way we can keep our code more efficient.
 */
class HashNode {
    /**
     * @param {number} orderAdded - The order that the node was added, with this we can get the 'key', 'value' and
     * 'index' for the given node respectively from 'keys', 'values' and 'indexes' list
     * in the HashTable            
     * @param {number} hash - The original hashing number. Sometimes the number can be '1231231231' so when we 
     * fill the space in the hashing table we devide this big integer by the capacity and get
     * the remainder.
     * @param {any} rawKey - If your key is an object, for example a FlowObject, you can't search from this key, but
     * you can store it for when you need to retrieve this value.
     * @param {any} key - This key can be of any type, this is the actual value you are storing as key (NOT THE HASH OF THE VALUE)
     * This way we can prevent duplicate keys from being added
     * @param {any} value - The actual value you want to store.
     */
    constructor(orderAdded, hash, rawKey, key, value) {
        this.orderAdded = orderAdded
        this.hash = hash
        this.rawKey = rawKey
        this.key = key
        this.value = value
        this.next = undefined
    }
}

/**
 * This is a HashTable object that uses Chaining as resolution for collisions, 
 * it also has a dynamic size, and works similar to DynamicArray. 
 * 
 * So you probably don't know what hashtables are, so let me try to explain.
 * First things first, you've probably seen HashTables and you've problably have been using for a LONG LONG time.
 * Have you ever used a Python Dict ({"chave": "valor"}) ? Or even, you've ever seen a JSON? Or a javascript object ({chave: "valor"}) ?
 * They are all examples of a HashTable. 
 * 
 * But you might be asking yourself, "okay, but why do we use it?"
 * 
 * While on lists/arrays we can retrieve a value by it's index always in a constant speed O(1), people wanted to retrieve
 * values using other stuff other than a index.
 * 
 * In a list we access stuff like 
 * ```
 * const lista = [1, 2, 3, 4, 5]
 * 
 * lista[1] // 2
 * lista[4] // 5
 * ```     
 * if we want to retrieve value 3 we do `lista[2]`, but what if i wanted to retrieve the value 3 using something 
 * that makes more sense for me, like a string? I wanted to access this value by making lista['age_of_lucas']. 
 * How do we do it? For that, if you are following along, we use a HashTable.
 * 
 * With a javascript object, we can access it like this:
 * ```  
 * const dictionary = {age_of_amanda: 1, age_of_bruna: 2, age_of_lucas: 3}
 * 
 * dictionary['age_of_amanda'] // 1
 * dictionary.age_of_bruna // 2
 * ```
 * ^ This, is a *Hash Table*.
 * 
 * But what are Hash Tables and how they are constructed? Simple, sorry to break the magic to you but a Hash Table is actually
 * a simple list/array. Nothing else. Only arrays for most programming languages give us the ability of finding an item in O(1).
 * The compiler mostly knows only how to deal with arrays (can be in C, in Erlang or others, the compiler understand only arrays)
 * 
 * In other words, the 'dictionary' variable above would be for the compiler, interpreter, something like:
 * ```
 * const dictionary =  [undefined, undefined, undefined, ["age_of_amanda", 1], undefined, undefined, ["age_of_bruna", 2], ["age_of_lucas", 3]]
 * ```
 * 
 * And that's it. Now you understand the "Table" part of the name "HashTable" but when does "Hash" comes into play?
 * 
 * So if you see, there is a lot of vacant space in the list above with the value of ```undefined```. Where we add Each Node or
 * key/value pair is not random. We use the power of Hashing and cryptography to solve this. Python also uses it.
 * check:
 * ```python
 * print(hash('Testar_valor_hash_de_string'))
 * print(hash(123.9))
 * print(hash(19))
 * print(hash(True))
 * ```
 * 
 * If you know python you know that the classes has those Dunder (Doube Underscore) methods like __init__. But we also got
 * __hash__ that is used when we use the hash() function on the object. 
 * 
 * Anyway, have you noticed something while printing this? All of those return INTEGERS, and that's actually really important.
 * because those integers will be the position we will add the element in the array. Of course we WILL NOT have an array of 
 * 50040178637243895 elements just to add one element this is a waste of memory. So what we do is get the remainder of the total
 * capacity of the array.
 * 
 * If we start with an array of 4 elements we will have 550040178637243895 % 4 which is equal 3. So we add this value to the index 3.
 * A nice thing about hashes is that on the same context and runtime, doesn't matter how many times you've generated a hash for an
 * element, it will ALWAYS be the same (for the same context).
 * 
 * There are many hashing functions out there that returns a integer: https://www.geeksforgeeks.org/string-hashing-using-polynomial-rolling-hash-function/
 * To understand how those functions work you will need to have a deep knowledge in Maths, but this is out of the scope here.
 * To choose one hashing function you will want to use a hashing that has the least number of collisions (we will explain that in a sec)
 * 
 * Okay, so now we've understood the "Hash" part of the "HashTable".
 * 
 * Last but not least, what are collisions?
 * 
 * A collision is when for different values the hash is the same. So let's suppose that 
 * 
 * ```
 * hash('Testar_valor_hash_de_string')
 * 
 * // and
 * 
 * hash(550040178637243895)
 * ```
 * 
 * generates the same hash 550040178637243895 (which is actually true if the hash generated by the string was this). Don't you agree that 
 * 'Testar_valor_hash_de_string' is a string and 550040178637243895 is an int so they are completly different values?
 * 
 * What do we do in this case? Both values will be stored in the index 3 as we saw before and this is collision. 
 * There are two ways of fixing this issue:
 * Linear Probing and Chaining.
 * 
 * Linear Probing will try to fill all of the elements in the array so we will end up with
 * ```
 * [undefined, undefined, ["Testar_valor_hash_de_string", 1], [550040178637243895, 2]] 
 * ```
 * notice that one of the elements was move to the index BEFORE (to the index 2) the actual index it should be.
 * 
 * One of the most efficient ways to do this is to use the robin hood hashing algorithm https://programming.guide/robin-hood-hashing.html
 * 
 * Chaining is what we do here, so in the worst case scenario you will end up with something like:
 * ```
 * [undefined, undefined, undefined, [["Testar_valor_hash_de_string", 1], [550040178637243895, 2]]]
 * ```
 * 
 * Notice that for the array of 4 elements, on the last position we have also an array. So in the worst case scenario to get the value of 550040178637243895
 * we will need to loop through all elements in the array at position 3 just to find the element with the key i'm looking for. So now
 * the efficiency will not be O(1) anymore.
 * 
 * Now you understand why trying to minimize collisions is extremely important for your hashing function.
 * 
 * Last but not least, some material for further reading (most of them are in python because it was the language that I used to write this):
 * - https://stephenagrice.medium.com/how-to-implement-a-hash-table-in-python-1eb6c55019fd This is mostly what i used.
 * - https://www.sebastiansylvan.com/post/robin-hood-hashing-should-be-your-default-hash-table-implementation/
 * - http://blog.chapagain.com.np/hash-table-implementation-in-python-data-structures-algorithms/#:~:text=Standard%20Implementation&text=Python's%20built%2Din%20%E2%80%9Chash%E2%80%9D,be%2020%2C%20and%20so%20on.
 * The last one explains linear probing and chaining better.
 */
class HashMapHelper {
    constructor () {
        this.numberOfElements = 0
        this.capacity = 8

        this.rawKeys = new DynamicArray()
        this.hashes = new DynamicArray()
        this.keys = new DynamicArray()
        this.values = new DynamicArray()

        /** @type {Array<HashNode>} */
        this.table = []
    }

    /**
     * This is a factory method to create a new HashMapHelper. You need to always use this instead of using
     * the constructor directly. This is needed because we need to run async code in the constructor but the constructor
     * itself does not provide support for running async code in it. This happens because an async function 
     * always return a promise, but the constructor always return the class instance.
     * 
     * The rawKey is the key object that we use as key, not the actual key value but the key object, the key value is used 
     * to retrieve values from the hash table. But rawKeys can be for example a FlowObject, so we can know exactly what FlowObject 
     * was used as key and retrieve the actual representation of the key.
     * 
     * @param {Array<[any, number, any, any]>} rawKeysHashesKeysAndValues - An array of arrays of the form [rawKey, hash, key, value].
     * 
     * @returns {Promise<HashMapHelper>} A promise that resolves to a new HashMapHelper.
     */
    static async initialize(rawKeysHashesKeysAndValues=[]) {
        const hashMap = new HashMapHelper()

        hashMap.hashes = await DynamicArray.initialize()
        hashMap.rawKeys = await DynamicArray.initialize()
        hashMap.keys = await DynamicArray.initialize()
        hashMap.values = await DynamicArray.initialize()

        hashMap.table = await hashMap.makeTable(hashMap.capacity)


        for (const [rawKey, hash, key, value] of rawKeysHashesKeysAndValues) {
            await hashMap.append(rawKey, hash, key, value)
        }
        return hashMap
    }


    /**
     * Retrieves the length of the hashMap.
     * 
     * @returns {Promise<number>} - Returns the length of the hashMap.
     */
    async length() {
        return this.numberOfElements
    }

    /**
     * This is responsible for adding a HashNode object in a 'table' list at a specific index.
     * If there is a collision we handle it by appending the hashNode to the last node of the linked list 
     * 
     * @param {Array<HashNode>} table - An array of hashNode instances, this is the actual hash map table
     * that we use to store and retrieve information from.
     * @param {number} index - The index of the hashNode that should be inserted in the hashTable.
     * @param {HashNode} hashNode - The actual hashNode that should be inserted in the hashTable at the
     * specified index.
     */
    async #addAtIndexAndHandleCollision(table, index, hashNode) {
        if (index < table.length) {
            // We are adding a different key to a index that is already occupied so we need to handle the collision
            // using the linked list inside of the HashNode
            if (table[index] !== undefined && table[index].key !== hashNode.key) {
                let alreadyExisingHashNode = table[index]
                // we loop until we find the last node in the linked list OR the same key we are trying to update
                while (alreadyExisingHashNode.next !== undefined && alreadyExisingHashNode.next.key !== hashNode.key) {
                    alreadyExisingHashNode = alreadyExisingHashNode.next
                }
                // if we found the same key we are trying to update we just update the value
                alreadyExisingHashNode.next = hashNode
            } else {
                // we are adding a fresh new node in the index, we clean hash_node.next for when resizing.
                hashNode.next = undefined
                table[index] = hashNode
            }
        } else {
            throw new Error('Index to add is out of bounds, resize the array')
        }
    }

    /**
     * Tries to get the node using the hash, if it is chained then loop through all nodes to find the key
     * 
     * @param {any} key - The key that we are searching for, this is can be of any type, generally it's better
     * if this is a string.
     * @param {number} hash - The actual hash we are searching for.      
     * 
     * @returns {Promise<HashNode>} A promise that resolves to the node that we are looking for.
     */
    async search(key, hash) {
        // We need the hashIndex even if it is not directly set, this is what we use to search for the element.
        const hashIndex = hash % this.capacity
        let existingHashNodeAtIndex = this.table[hashIndex]
        while (existingHashNodeAtIndex !== undefined && 
               existingHashNodeAtIndex.key !== key && 
               existingHashNodeAtIndex.next !== undefined) {
            existingHashNodeAtIndex = existingHashNodeAtIndex.next
        }
        if (existingHashNodeAtIndex === undefined) {
            throw new Error(`Key '${key}' not found`)
        }
        return existingHashNodeAtIndex
    }

    /**
     * Removes a certain key from the array.
     * 
     * Then after deleting we need to delete this hash from the `hashes`, `keys` and `values` arrays.
     * To do this we search for the key (which should be unique inside of the hashMap) and then we
     * remove it from the arrays.
     * 
     * This removal happens in linear time so it's not very efficient and can be improved.
     * 
     * @param {number} hash - The hash of the key that we want to remove.
     * @param {string} key - The key that we want to remove.
     */
    async remove(hash, key) {
        const hashIndex = hash % this.capacity
        let hashNodeToBeRemoved = this.table[hashIndex]
        const doesKeyAndHashNodeExists = this.keys.array.includes(key) && hashNodeToBeRemoved !== undefined

        if (doesKeyAndHashNodeExists) {
            // The hashNodeToBeRemoved is the first node in the linked list but is not the element we are looking for
            if (hashNodeToBeRemoved.key !== key) {
                // We need to loop through the linked list to find the element we are looking for keeping track of 
                // the previous node in the linked list.
                let previousNodeToUpdateLinkedList = hashNodeToBeRemoved
                while (hashNodeToBeRemoved.key !== key && hashNodeToBeRemoved.next !== undefined) {
                    previousNodeToUpdateLinkedList = hashNodeToBeRemoved
                    hashNodeToBeRemoved = hashNodeToBeRemoved.next
                }
                if (hashNodeToBeRemoved === undefined) {
                    throw new Error(`Key '${key}' not found`)
                }
                // We kept track of the last node in the linked list so we can update the reference and delete it.
                // the hashNodeToBeRemoved will lose reference
                previousNodeToUpdateLinkedList.next = hashNodeToBeRemoved.next
            } else {
                // Update the next index with the next value of the hashNodeToBeRemoved
                this.table[hashIndex] = hashNodeToBeRemoved.next
            }

            for (let i=0; i<this.keys.array.length; i++) {
                if (this.keys.array[i] === key) {
                    await this.rawKeys.removeAt(i)
                    await this.hashes.removeAt(i)
                    await this.keys.removeAt(i)
                    await this.values.removeAt(i)
                    break
                }
            } 
            // We subtract the number of elements in the hashTable in a factor of 1.
            this.numberOfElements--
        } else {
            throw new Error(`Key '${key}' not found`)
        }
    }

    /**
     * Appends a new value to the HashTable, we send a hash, the key and the value. The key is the actual value
     * you want to store in the table.
     * Collisions in hashes are acceptable but we cannot have collisions in keys (2 keys using the same value). 
     * The value is the value you are storing in this key, and the hasher is the key hashed.
     * 
     * @param {any} rawKey - If your key is an object, for example a FlowObject, you can't search from this key, but
     * you can store it for when you need to retrieve this value.
     * @param {number} hash - The hash value of the key that we want to store.
     * @param {string} key - Generally a string that you want to store in the table.
     * @param {any} value - Any value you want to store with the given key.
     *  
     * @returns {any} - Returns the appended value.
     */
    async append(rawKey, hash, key, value) {
        // we first check to see if the key was already inserted, if it was this means we are actually changing the value
        // of an existing key so we need to insert again.
        // WHY DON'T YOU JUST UPDATE THE EXISTING KEY? Because by doing so we would need to separate logic in this method: 
        // one for updating an existing node and other for inserting a new node. To keep it simple, just consider everything
        // as adding a new node.
        if (this.keys.array.includes(key)) {
            await this.remove(hash, key)
        }
        // we should resize before retrieving the hashIndex, i was running trough an error and it was hard to debug.
        // The bug happened because we got the index after resizing. This means the hashIndex would be wrong because after we resize
        // we change the capacity of the array generating a new hashIndex that should be used in the insertion.
        if (this.numberOfElements + 1 > this.capacity) await this.#resize(2 * this.capacity)

        const hashNode = new HashNode(this.numberOfElements, hash, rawKey, key, value)
        const hashIndex = hash % this.capacity

        await this.rawKeys.append(rawKey)
        await this.hashes.append(hash)
        await this.keys.append(key)
        await this.values.append(value)

        await this.#addAtIndexAndHandleCollision(this.table, hashIndex, hashNode)

        this.numberOfElements++
        return value
    }
    
    /**
     * Resize internal table to a newCapacity.
     * 
     * The idea is simple:
     * 1º We loop through all of the inserted hashes
     * 2º we set the new capacity, create a new table with the new capacity.
     * 
     * 3º we need One loop only to update the table. We loop through all of the hashes inserted in the table.
     * 4º we iterate by each hash in the hashes array of course filtering by everything that is not undefined (The DynamicArray
     * most of the times adds more elements than what is needed).
     * 5º Then we get the node to update and add this node to the previous variable. This 'previous' variable might not be all clear for everybody
     * 6º The 'previous' variables holds the previous node reference, this way we can get the next node WITHOUT LOSING REFERENCE to the previous.
     * 7º If node.next is a node, then we will lopp again, but we will not need 'previous' for everything else so we can update this node safely
     * 8º We calculate the new index by using the original hash value and retrieving the remainder for the new capacity
     * 9º Update the index and add node at index handling collisions. 
     * 10º Finish by udating the this.table with the new table and this.capacity with the new capacity.
     * 
     * @param {number} newCapacity - The new capacity of the table.
     */
    async #resize(newCapacity) {
        const newTable = await this.makeTable(newCapacity)
        const [newHashes, newRawKeys, newKeys, newValues] = await Promise.all([
            DynamicArray.initialize(), DynamicArray.initialize(),
            DynamicArray.initialize(), DynamicArray.initialize()
        ])

        for (const hash of this.hashes.array) {
            if (hash !== undefined) {
                const hashIndex = hash % this.capacity
                
                let node = this.table[hashIndex]
                let previous = node
                while (node !== undefined) {
                    previous = node
                    node = node.next
                    
                    const newHashIndex = previous.hash % newCapacity
                    
                    await this.#addAtIndexAndHandleCollision(newTable, newHashIndex, previous)
                    
                    await Promise.all([
                        newHashes.append(newHashIndex), newRawKeys.append(previous.rawKey),
                        newKeys.append(previous.key), newValues.append(previous.value)
                    ])
                }
            }
        }

        this.table = newTable
        this.capacity = newCapacity
    }

    /**
     * A copy of the DynamicArray `makeArray` function. Used to create a new table when resizing the hashMap.
     * 
     * @param {number} newCapacity - The new capacity of the hashMap.
     * 
     * @returns {Promise<Array<undefined>>} - A new empty array with the new capacity.
     */
    async makeTable(newCapacity) {
        return Array.apply(undefined, Array(newCapacity))
    }
}

module.exports = HashMapHelper