# Palmares Framework

A Framework on top of express that will be used to handle all of the most basic things instead of relying directly on express or other frameworks that doesn't fit well our use cases.

# TODO:
1 - Be less dependant on Express.js and be able to integrate Koa, Hapi, Fastify or any other framework that exists, with this we need to be less dependant on middlewares we will probably need to define our own req,res objects also.
2 - Better router configuration, we configure the routing for the websocket and for the paths and they are pratically equal, we need to make a better routing algorithm.
3 - Better controllers support, right now we create controllers by defining the `get`, `put`, `post` and etc methods. It would be nice to be possible to append many routes to a single controller. So the controller is possible to extendend the routers.
Example:
```js
class UserController extends controllers.Controller {
    async list(req, res) {
        // code here
    }
    
    async create(req, res) {
        // code here
    }

    async update(req, res) {
        // code here
    }
}

const routers = [
    path('/api', [
        path('/users', UserController.asController({
            get: 'list',
            post: 'create',
            put: {
                path: '/:id',
                handler: 'update'
            }
        }))
    ])
]
```
I don't know the API for it yet, but one thing is certain: we want this to be able to work on Vanilla JS first, so no decorators at the current time.
4 - Stateless events handler, similar to the websockets that have the Redis layer, we should use the Redis Layer on the events also so it can work on multiple servers/applications
5 - Typescript support, add typescript to the serializers, and models and make it dynamically inference the types. So it's a lot easier to work with serializers/models with modern code editors like VSCode. (DO not make TS obligatory, it should be able to work with vanilla JS out of the box.)
6 - Custom database query API, right now we have a custom engine. But the query we use to fetch data is the Sequelize one, it would be nice if we could abstract this and just translate the queries to the ORM being used. Also making it possible for extensions. (we don't want to create our own ORM, we want to offer the most basic functionality for queries but making it extensible means the user can override our own default query API and use directly the ORM one)
7 - Scheduler handler for workers (probably integrate bull.js inside of the application) and make it automatic to configure via the database. Similar to how django-celery works.