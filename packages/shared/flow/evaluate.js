const Context = require('./context')
const Lexer = require('./lexer')
const Parser = require('./parser')
const Interpreter = require('./interpreter')
const { Settings } = require('./settings')
const FlowObject = require('./builtins/objects/object')


/**
 * IMPORTANT: FLOW IS KINDA COMPLETLY UNTIED FROM REFLOW, AND KINDA LIVES IN IT'S OWN SEPARATED WORLD. YOU SHOULD USE
 * `services.js` IN ORDER TO INTERACT WITH THE FLOW LANGUAGE, MOST OF THE TIMES YOU CANNOT INTERACT OR EVALUATE STUFF DIRECTLY.
 * 
 * This is the entrypoint to run Flow Programs. Everything you need to know you will be able to find here.
 * 
 * Flow is entirely asynchronous so it doesn't conflict with the main thread and just runs and evaluates when it can.
 * 
 * This makes it extremely efficient and easy to use. Also this makes it feels like syncrhonous code even if it is 
 * actually async. To add async functionality to flow we will need to create our own async logic and not depend on 
 * the interpreter language async logic (you can do this if you want to. Just add the event loop class that will
 * hold and run all of the events, it needs some special thinking and care though)
 * # Here's a tutorial if you want to implement it yourself: https://python.plainenglish.io/build-your-own-event-loop-from-scratch-in-python-da77ef1e3c39
 * 
 * # How to read this code to fully understand how it works
 * 
 * - Start from the context.js file.
 * - Then go to settings.js file and read everything there.
 * 
 * (You can skip the below and start right on the interpreter, but it can be hard to understand on how
 * we get from the code to the interpreter without reading the parser and the lexer, but it will be easier
 * to understand more about Flow`s syntax and behaviour)
 * - Now go to the lexer/index.js file and read how we transform everything into tokens
 * - Try to understand the parser the best you can.
 * 
 * - Now start reading the `interpreter.js` file and understand it better how Flow works
 * - You will see that interpreter is "easy" to understand and most of the logic is handled inside of each bultin objects
 * so now you can go to each builtin object and try to understand how everything works.
 * 
 * 
 * ## Flow's simple explanation:
 * Yeah, you guessed it right, we've built our own programming language and you might ask yourself how.
 * And although we see creators of programming languages similar to gods, it's not difficult at all.
 * 
 * It's actually a pretty common knowledge that you probably use everyday when using stuff like esbuild, sass, scss, webpack, babel, typscript, etc.
 * 
 * First let me introduce to you to some GREAT stuff on the internet that can serve as an inspiration:
 * 1.: https://ruslanspivak.com/lsbasi-part1/ (read the hole tutorial, this is the first source of information for a reason
 * it is quick to read and more approachable than a book)
 * 2.: https://pt.wikipedia.org/wiki/Formalismo_de_Backus-Naur_Estendido#:~:text=EBNF%20%C3%A9%20um%20c%C3%B3digo%20que,combinados%20em%20uma%20sequ%C3%AAncia%20v%C3%A1lida.
 * 3.: https://monkeylang.org/ (it's in Go, i also don't know Go, but it's not that difficult to follow along)
 * 4.: https://github.com/python/cpython/blob/main/Grammar/python.gram (It can be quite intimidating, but it's not difficult to understand actually)
 * 5.: https://github.com/elixir-lang/elixir/blob/master/lib/elixir/src/elixir_parser.yrl (I don't know Erlang either, but it's easy to follow along
 * this was one of my main sources of inspiration)
 * 6.: https://github.com/haifenghuang/magpie (This guy took Monkey Lang Book an added steroids to it, nice source of inspiration too)
 * 
 * Okay, so how does actually a programming language work? 
 * Some might respond "with magic", others might respond with zeroes and ones. Both are right, and both are wrong. Actually the second one
 * is more right than wrong but anyway the idea is simple.
 * 
 * We have 2 types of programming languages (not exactly, the lines are blurry but this is more understandable): Compiled and Interpreted 
 * (i think that there can be others). Python and Javascript are both interpreted. If you use CPython it generally is interpreted, if you use 
 * Javascript, with V8 it's actually compiled with a JIT compiler (Just-in-Time compilation is the process of compiling the code as the code runs). 
 * Compiling code is actually more down the rabbit hole, and this place is dark, we will not go there, we will just talk about
 * the first part which is interpreting the code. The steps are basically the same on both types but usually in compiled languages we have more steps.
 * 
 * Before we continue, the idea of a compiler is from an input, generate an output, with this output we don't need to traverse the AST every time, making
 * the code a lot faster. For example, ESBUILD or SWC for javascript will transform the javascript code into some other javascript code, minified, with tree shaking
 * and all that. So we compile javascript back to javascript. On typescript the compiler will only translate the typescript and generate a javascript code.
 * That's all the compiler does. For A JIT compiler, what we would need is be able to not recreate and interpret every line of code, we would need to keep for example
 * a the Integer 2 in memory, and when we need to use it we would just need to fetch it from memory. For example, when running a recursive function we do not need
 * to interpret the AST of this function over and over, we interpret it once, and then we just check the exit function. By compiling the code we will make it run a lot
 * faster because we won't need to interpret the AST every time. Every time we see the FUNCTION_DEFINITION node we create a new function, but we have it in memory,
 * and don't need to recreate it every time. Then the code will run a lot faster. This means that the idea of a compiler are 2: 
 * - First is to generate an output from an AST. 
 * - Second is to make the code run faster. 
 * 
 * A compiler goes down to the fact of making optimizations while running the code or before running the code.
 * 
 * In Java we run:
 * javac MyProgram.java -> This will compile the code and create a binary file
 * java MyProgram -> This effectively run the compiled code
 * 
 * In Python, which is interpreted we do:
 * python my_program.py -> This interprets the code. Underlying everything you do with python there is C. This interprets in runtime, 
 * that's why generally you find bugs in production, it can't know ahead of time if there is a bug in your code if the code hasn't reached
 * or passed there. You will just get errors in runtime when the code effectively passes the part with errors.
 * 
 * Compiled languages are out of the scope here, we do not compile the code because first it's more difficult to do and second it is unecessary
 * for our use case. (if you are curious, i recommend: https://compilerbook.com/, if you read and come up with ideas on how to implement
 * it here you are totally free to do it.)
 * 
 * So we have an interpreted language, okay, how does this work?
 * Usually the process is the same on every language:
 * 
 * Lexer -> Parser -> Abstract Syntax Tree (AST) -> Interpret
 * 
 * AST is actually the most important part, you can write an interpreter relatively easily if you have an AST. For example, 
 * in some part here we use esprima(https://esprima.org/) (check helpers/library.js) to get the code tokens from javascript and we create our own mini
 * js interpreter to get the arguments from the function. Do you know that facebook built their own engine for React-Native? It's called
 * Hermes. Guess what? They also uses esprima to get the AST from a javascript code, they just built the interpreter for it. So
 * they don't create their own parser, their own lexer and so on, which are stuff that we do here. (Reference: https://github.com/facebook/hermes/search?q=esprima)
 * 
 * As the name suggests Abstract Syntax Trees is actually a Tree (and you though you would never use this knowledge in
 * your work after college, at least, that's what i thought. I've never passed the class Algoritimos E Estrutura de Dados while
 * i was still coursing Information Systems in which we learn about trees. But it's funny because, i'm working with trees now)
 * Anyway, although trees are a really complex topic in programming this one is relatively easy, we don't have to deal about 
 * balancing the tree, binary search and any of this stuff.
 * 
 * If you've never knew about trees let me introduce them to you quickly:
 *       10
 *      /  \
 *     4    5
 *    / \
 *   2   3 
 * 
 * This is a tree, and is like the tree is on the opposite direction. We call 10 as the root, root is the first node.
 * 2, 3 and 5 are leafs because they are in the edge. And that's it. But how do we represent it in code?
 * 
 * ```
 * class Node {
 *      constructor(value) {
 *          this.value = value
 *          this.right = null
 *          this.left = null
 *      }
 * }
 * 
 * const root = new Node(10)
 * root.left = new Node(4)
 * root.left.left = new Node(2)
 * root.left.right = new Node(3)
 * root.right = new Node(5)
 * ```
 * 
 * This is how we represent trees in JS. Kinda easy right? I know it's abstract but if you feel stuck try to read some
 * articles on the web about it, also you might find it easier if you try to draw the code, i recommend using mental models
 * that Dan Abramov wrote in his book: https://justjavascript.com/ draw an the Node class as a ball, and then connect each
 * variable (left, right and value) to the ball with their respective values.
 * 
 * So what are abstract syntax trees. Suppose the following code:
 * ```
 * variable = 1
 * variable + 2
 * ```
 * 
 * This two lines code can be represented as:
 * {
 *      nodeType: BLOCK,
 *      instructions: [
 *          {
 *              nodeType: ASSIGN,
 *              left: "variable",
 *              right: 1
 *          },
 *          {
 *              nodeType: BINARY_OPERATION,
 *              left: {
 *                  node_type: VARIABLE,
 *                  value: "variable"
 *              },
 *              right: 2,
 *              operation: "+"
 *          },
 *      ]
 * }
 * 
 * So let's dig in: every object with the key "nodeType" IS A NODE. But each node can be of each type, so let's understand each nodeType.
 * The first node is BLOCK. and what it means is a block of code, a block of code is a block of instructions to run. 
 * So what are the instructions?
 * 
 * On the first instruction we have ASSIGN node and assign is exactly that, assign a value to a variable named "variable". This is what the block tells us.
 * On the second line we have a BINARY_OPERATION that is exactly that. A binary operation between two numbers. But left of the BinaryOperation 
 * is a Variable which is something that the abstract tree tells us. 
 * The right is 2 and the operation we are making is a adition.
 * 
 * That's it, that's a AST. Now let's look at some things: Not every node is equal, ones have "operation" key, other has "instruction" key and so
 * on. We need to be aware of those differences. Second, usually the values as not represented as-is, but they are tokens, tokens is an another type
 * of class that we use in the lexer, put things in tokens helps our parser knows if a thing is a String or if a thing is a Integer.
 * 
 * So okay, how do we create this AST? We create this with parsers, but first we need the lexer (the thing that puts things into tokens)
 * 
 * The idea of the lexer is to divide the text by each character
 * |v|a|r|i|a|b|l|e| |=| |1|\n|v|a|r|i|a|b|l|e| |+| |2|
 * Then the job of the lexer is transform this into tokens:
 * v -> is it divided by a space or any other character? No
 * a -> "   "       "
 * r -> "   "       "
 * .
 * .
 * .
 * e -> is it divided by a space or any other character? Yes
 * 
 * Token(value="variable", tokenType="IDENTITY")
 * Token(value="=", tokenType="ASSIGN")
 * Token(value="1", tokenType="INTEGER")
 * .
 * .
 * .
 * Token(value="2", tokenType="INTEGER")
 * 
 * The job of the parser is to get those Tokens and transform into the abstract syntax tree, and for that you might need to understand recursion
 * and probably it's a lot easier if you understood EBNF.
 * 
 * So on the Parser is when the magic happens and transforms everything into a NODE.
 * 
 * The Tree is then interpreted in the programming language we are using (on this case javascript) and then that's it, we've got 
 * yourself a programming language interpreter.
 * 
 * I recommend you to read at least the first article (all of those 19 parts). This will help you have a better understanding about this.
 * Especially about parsers that i know that i didn't explained very well. Parsers seems difficult, but it's easier once you understand that
 * with a good grammar, writing your parser will be really easy.
 * 
 * If you want to go further:
 * https://www.youtube.com/watch?v=7MuQQQWVzU4
 * https://en.wikipedia.org/wiki/Compiler-compiler
 * https://en.wikipedia.org/wiki/LL_parser
 * 
 * and so on.
 * 
 * ## MOTIVATION 
 * ### What is the core idea and values of the language? Why this exists in first place?
 * This exists while Nicolas was researching on a way to optimize the old formulas in Reflow (i'm writing in third person here), so we wanted to spice it up.
 * The main inspiration came from https://coda.io/formulas, it's a software, kind of a Reflow competitor. They added this spice to their formulas where you can
 * not only retrieve data but make actions.
 * 
 * The next step after that would be a full feature language. And that's basically the hole idea. Since it was concieved first to return a value in the `formula` field
 * type, i went in the tought process of making a functional language, so it will always returns a value. Since i'm from Brazil and i created this language while
 * people was started hyping Elixir i took a lot of inspiration from them.
 * 
 * So what are the core values of this language?
 * - BE EASY TO LEARN AND TO USE. It should welcome new users, and it should not scream complexity at you. Python and Ruby are known for that so i took a lot of inspiration
 * from them. It should have an extremely fast learning curve for either programmers, but better yet, non programmers. (That's why we bake the documentation into the language, static typing
 * is important for programmers but NOT for non programmers, documentation is generally the most important part of it).
 * - BE TRANSLATABLE. Kinda relates to the previous point, but it should be easy to translate to other languages. This means, spanish, italian, portuguese, french and so on.
 * That's because although it's nice to have a default syntax, learning english is still kind of a hassle for many people around the world. Many people in brazil still don't know
 * english. That's why when you think, Excel's formulas (that are translated) are more welcoming to people than VBA (which is not translatable), that's why also, Excel is still
 * popular and many companies still use it. (Not all companies are startups, you know)
 * - LOW-CODE FIRST. This means it should offer out of the box, tasks that would need more code and work in other languages. For example, in Flow, integrating with a legacy SaaS
 * products should be easy and welcoming. In python you would first need to download the package, then import this package and make a configuration before using it. In Flow
 * we want to offer it out of the box. This also means it should be integrated with Reflow itself in a way that it's easy to use but also that can be deatached if we want to use in
 * other environments (if we want to make it able to run in someones computer for example we might need to make changes). The idea is that with Flow we will be able to extend
 * Reflow's own functionality beyond what it already has with an ease and a delight and beautiful code syntax.
 * 
 * By doing all that we will guarantee that people will be able to create complex formulas while also being able of creating simple formulas. We also can use for everything inside
 * of Reflow itself.
 * 
 * This is also my Goal and vision: https://docs.microsoft.com/pt-br/power-platform/power-fx/overview
 * 
 * >>> IMPORTANT:
 * `settings.js` is one of the most important files, this file holds the Settings class, the instance from this class is passed around in the language. 
 * So this is where we will keep all of the data needed that we want to append to the runtime.
 * 
 * @param {string} expression - The code to be evaluated.
 * @param {import('./context')} context - The context to be used in the language. Read more in the context object. but anyway, this
 * is the only language i know that can be translated fully to other languages like english, portuguese, spanish and others
 * in runtime.
 * @param {boolean} ignoreAllErrors - If true, all errors will be ignored.
 * 
 * @returns {Promise<import('./builtins/objects/object')>} - The result of the expression will ALWAYS be a FlowObject.
 */
async function evaluate(expression, context=undefined, ignoreAllErrors=false) {
    if (!context instanceof Context) {
        context = new Context()
    }

    expression = String.raw`${expression}`

    const settings = new Settings(context)
    const lexer = new Lexer(expression, settings)
    const parser = new Parser(lexer, settings)
    const interpreter = new Interpreter(settings)
    try {
        const ast = await parser.parse()
        const result = await interpreter.evaluate(ast)
        return result
    } catch (e) {
        if (e instanceof FlowObject) {
            // It's probably a FlowError object
            return e
        } else {
            if (ignoreAllErrors === false) throw(e)
        }
    }
}

module.exports = evaluate