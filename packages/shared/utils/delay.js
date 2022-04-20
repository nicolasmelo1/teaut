/**
 * This function adds the functionality of delaying a 
 * function execution based on the time.
 * 
 * @param {BigInteger} ms - Number of Miliseconds to delay
 */
module.exports = function delay(ms) {
    let timer = 0;
    return function(callback){
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
    }
}