/**
 * This is controller similar to Django Class Based views, the idea is the same, we check if the controller
 * has implemented a function with the method name, otherwise we automatically return a error to the user saying that the
 * method is not allowed. Super simple and really powerfull.
 * 
 * How to implement it:
 *  
 * >>> yourController.asController()
 * 
 * This will return a function, the function will have binded your controller class to the real controller, so it will work as normal
 * with no further stuff needed to do.
 */
class Controller {
    static asController() {
        async function handler(request, response, next, ...rest) {
            const controller = new this()
            const methodsOfController = Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
            const lowerMethodName = request.method.toLowerCase()
            if (methodsOfController.includes(lowerMethodName)) {
                const isAsync = controller[lowerMethodName].constructor.name === 'AsyncFunction'
                if (isAsync) {
                    await controller[lowerMethodName](request, response, next, ...rest)
                } else {
                    controller[lowerMethodName](request, response, next, ...rest)
                }
            } else {
                response.status(405).send({
                    detail: `Method ${request.method} not allowed`
                })
            }
        }

        return handler.bind(this)
    }
}

module.exports = {
    Controller
}