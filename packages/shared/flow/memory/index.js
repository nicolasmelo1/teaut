const CallStack = require('./callStack')
const recordTypes = require('./recordTypes')

/**
 * This is the memory. It is a virtual memory, of course not the actual hardware memory in the computer.
 * 
 * The idea is super super simple: The memory controls the CallStack.
 * OH, You've never learned about CallStack? Okay i will try to explain.
 * 
 * Let's program in javascript for the sake of this example, so suppose the following code:
 * ```
 * function subtraction(a, b) {
 *      return a - b
 * }
 * 
 * function sum(a, b) {
 *      return a + b
 * }
 * 
 * console.log(subtraction(2,1))
 * console.log(sum(1,2))
 * ```
 * 
 * What happens when we do this? Yup, it prints 1 and 3, you've got it.
 * But how this works under the hood?
 * 
 * 1º:
 * -------------------------------------------------------------------------------------------- 
 * | Nesting Lv   || Record Name  || Variables                 || Values                      |   
 * -------------------------------------------------------------------------------------------- 
 * |  0           || PROGRAM      || sum ; subtraction         || function ; function         |
 * -------------------------------------------------------------------------------------------- 
 * 
 * 2º:
 * -------------------------------------------------------------------------------------------- 
 * | Nesting Lv   || Record Name  || Variables                 || Values                      |   
 * -------------------------------------------------------------------------------------------- 
 * |  0           || PROGRAM      || sum ; subtraction         || function ; function         |
 * |  1           || subtraction  || sum ; subtraction ; a ; b || function ; function ; 2 ; 1 |
 * -------------------------------------------------------------------------------------------- 
 * 
 * 3º:
 * -------------------------------------------------------------------------------------------- 
 * | Nesting Lv   || Record Name  || Variables                 || Values                      |   
 * -------------------------------------------------------------------------------------------- 
 * |  0           || PROGRAM      || sum ; subtraction         || function ; function         |
 * |  1           || sum          || sum ; subtraction ; a ; b || function ; function ; 1 ; 2 |
 * -------------------------------------------------------------------------------------------- 
 * 
 * 4º:
 * -------------------------------------------------------------------------------------------- 
 * | Nesting Lv   || Record Name  || Variables                 || Values                      |   
 * -------------------------------------------------------------------------------------------- 
 * |  0           || PROGRAM      || sum ; subtraction         || function ; function         |
 * -------------------------------------------------------------------------------------------- 
 * 
 * "WHAT THE HELL?"
 * 
 * So what does it do? First we start the program, when we start the program we add this hole script to the call stack.
 * Understand the program as the "GLOBAL". You know global variables and all that stuff? This is what the Program holds, all
 * variables available fo the hole program to use.
 * 
 * Okay, so what comes next? This program will hold the variables sum and subtraction, understand 'sum' as a string
 * and 'subtraction' as a string. Both strings are keys of dictionary, and both 'sum' and 'subtraction' are functions.
 * 
 * it's something like:
 * ```
 * {
 *      'sum': (a, b) => { return a + b },
 *      'subtraction': (a, b) => { return a - b }
 * }
 * ```
 * 
 * Okay so what happens next is that first we call 'subtraction' function, this function is added to the call stack, the value 
 * is returned and then it is poped from the call stack (we've already used the function)
 * 
 * The same happens when we call 'sum', the function is added to the call stack, all the variables from the previous record become
 * available for us to use inside of the function and we enable 'a' and 'b' for usage.
 * 
 * This might sound too complex, but it's not
 * ```
 * const x = 2
 * 
 * function sum(a) {
 *      return a + x
 * }
 * 
 * console.log(a)
 * ```
 * 
 * What happens when we run this?
 * It gives an error, right, can you point where?
 * 
 * Exactly, on `console.log(a)`. But Why?? Because the variable 'a' is available ONLY inside of the function when the function is running.
 * But why "a + x" works? Exacly, because everything from the outer scope is available inside of the function.
 * 
 * Okay, so let's continue: notice how a and b only exists while the sum and 'subtraction' are running, but when they are removed, both
 * variables doesn't exist anymore.
 * 
 * That's the hole idea of the call stack, the call stack is a stack (FILO (first in, last out)) as the name suggests, so whatever
 * is at the BOTTOM of the stack is the record we are in. In the 3º phase look that 'sum' is in the last position of the stack
 * so this is what is being runned at the moment.
 * 
 * When we finish running this we remove this from the stack and go back to the latest record from the stack.
 * 
 * With all of this information, can you understand how a recursion works?
 */
class Memory {
    /**
     * @param {import('../settings').Settings} settings - The settings object that will hold everything needed in the runtime context
     * when the program is running.
     */
    constructor(settings) {
        /** @type {CallStack} */
        this.callStack = new CallStack(settings)
    }
}

module.exports = {
    Memory,
    recordTypes
}