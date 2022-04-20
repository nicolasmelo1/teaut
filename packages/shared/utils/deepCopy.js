/**
 * Makes a deep copy of an object while keeping the reference for types that does not support a shallow copy.
 * 
 * When you pass an object for a function we copy it's reference in javascript. Let's suppose the following code:
 * ```
 *      class HoldObject {
 *          constuctor(objectToHold) {
 *              this.holdedObject = objectToHold
 *          }
 *          
 *          logHoldedObject() {
 *              console.log(this.holdedObject)
 *          }  
 * }
 * ```
 * 
 * This class will be responsible for holding a object and printing that object in the console. When we do this:
 * ```
 * let objectToHold = {
 *      a: 1,
 *      b: 2
 * }
 * 
 * const holdObject = new HoldObject(objectToHold)
 * 
 * holdObject.logHoldedObject() --> This will output { a: 1, b:2 } as expected
 * ```
 * But when we make this, the following happens:
 * 
 * ```
 * let objectToHold = {
 *      a: 1,
 *      b: 2
 * }
 * const holdObject = new HoldObject(objectToHold)
 * 
 * holdObject.logHoldedObject() --> This will output { a: 1, b:2 } as expected
 * 
 * objectToHold.a = 4
 * 
 * holdObject.logHoldedObject() --> This will output { a: 4, b:2 }, // WHYYYYY? I'VE never touched the object inside of 
 * // the class
 * ```
 * 
 * This happens because the object is passed as reference, it is an address in the memory that represents this object.
 * This means any change on the original object will reflect everywhere. To prevent this you might want to do a shallowCopy
 * of the object.
 * 
 * So your original class should be like the following to prevent this behaviour:
 * ```
 *      class HoldObject {
 *          constuctor(objectToHold) {
 *              // THIS LINE
 *              this.holdedObject = deepCopy(objectToHold)
 *          }
 *          
 *          logHoldedObject() {
 *              console.log(this.holdedObject)
 *          }  
 * }
 * ```
 * 
 * @param {Object} object - The object to make a shallow copy from.
 * 
 * @returns {Object} - The NEW shallowed copy of the object. Functions cannot have a copy. So we preserve the reference
 * for them.
 */
module.exports = function deepCopy(object) {
    let target = Array.isArray(object) ? [] : {}
    for (let key in object) {
        let element = object[key]
        if (element) {
            if (typeof element === "object") {
                target[key] = deepCopy(element)
            } else {
                target[key] = element
            }
        } else {
            target[key] = element
        }
    }
  
    return target
}
