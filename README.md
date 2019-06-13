# State Management

Congratulations, after this you will all be full stack developers!

What kind of state management did you implement in Tiny app? (stored in memory)

What happens when we restart our server?
  - State would refresh everytime server restarted
  - Because of the above the server is not editable (server can't be changed without whiping data)

Remember that data is usually the most valuable part of any application or business. Think of Instagram photos, Gmail, Uber's driver network, Airbnb's homes or experiences, or Tinder profiles.

- Users (personal info, payment)
- User related data (pictures/statuses, browsing history, interests, payment info, etc.)
- Datasets (satellite data, labelled datasets for AI, etc.)

## Naive State Management

Saving state to file.
CRUD operations on file.

- How do we handle concurrency?

### Using DiskDB

We can improve on TinyApp by saving our data to the filesystem instead of in memory.

When calling `db.connect(path, collections)` the library will load the collections using the following code:

```javascript
// loadCollections
for (var i = 0; i < collections.length; i++) {
  // append .json to collection name
  var p = path.join(this._db.path, (collections[i].indexOf('.json') >= 0 ? collections[i] : collections[i] + '.json'));

  // ensure valid path
  if (!util.isValidPath(p)) {
    // create empty file with name <collection>.json
    util.writeToFile(p);
  }
  // Restore collection name by removing '.json' suffix
  var _c = collections[i].replace('.json', '');

  // Add collection methods to db. ex: db[collection]
  this[_c] = new require('./collection')(this, _c);
}
```

We can write queries manually, similary to how we did it with TinyApp. Here is the code that DiskDB uses to implement their `find` functionality:

```javascript
// find query
// Source: https://github.com/arvindr21/diskDB/blob/e71ffc01bbea43da1e70ab2c5c2b92dfed9fc8ed/lib/collection.js#L43
coltn.find = function(query) {
  // Read file as text and parse into json
  var collection = JSON.parse(util.readFromFile(this._f));

  if (!query || Object.keys(query).length === 0) {
    return collection;
  } else {
    // Use util function to filter objects in collection
    // Source: https://github.com/arvindr21/diskDB/blob/e71ffc01bbea43da1e70ab2c5c2b92dfed9fc8ed/lib/util.js#L87
    var searcher = new util.ObjectSearcher();
    return searcher.findAllInObject(collection, query, true);
  }
};
```

There are limitations to this implementation.
- Not efficient when storing or accessing data (stored as plain text vs BSON)
- Lacks complex queries, indexes, caching, transactions, etc.
- Lacks concurrency (no locking mechanism)
  - What happens if a two users edit data simultaneously?
  - What happens if I change the raw json file?
- No support for permissions, user roles, etc.
- Database (filesystem) must be on the same machine as web server
- No logging or diagnostics support

Okay, okay, I got it. This isn't a good solution. Let's look at other options.

## Database Management Systems

There are a few main types of database systems. The three you will likely encounter are SQL, noSQL and Blockchain systems.

SQL
  - PostgreSLQ
  - MySQL
  - Oracle Database
  - Microsoft SQL Server
  - many more...

noSQL
  - MongoDB
  - CouchDB
  - Redis

Blockchain
  - Bitcoin
  - Hyperledger
  - Ethereum

For this lecture we will focus on MongoDB and noSQL databases. Next week you will look at PostreSQL and relational databases.

They have different use cases.

noSQL is great for dealing with massive amounts of unstructured data or flattened and denormalized data.
- Real-Time Big Data
- Content Management
- Digital communication

SQL is better for structured data where there are complex or many relationships.

## MongoDB

You will use MongoDB for Tweeter, so we will explore it today.

MongoDB is a database server, it is a program that runs on your machine and handles state management operations for us.

MongoDB Server
  - Databases
    - Collections
      - Documents

TentBnb // database
  Users // collection / table
    - { name: Dinesh } // document / row
    - { name: Gilfoyle }
  Tents
    - { userID: ObjectID('skjhkjh'), condition: 'perfect' }

### tentbnb

For the demo we'll be creating an airbnb competitor. Since house prices have gone through the roof in Ontario and the weather is beautiful, it is the perfect opportunity to disrupt airbnb by with our ingenious app:

tentbnb, your convenient escape from the cold.

#### Mongo Shell

Once you have mongo installed on your machine you can start the shell by typing `mongo` into your terminal.

To view commands you can and run `help`. To see commands specific to databases use `db.help()`.

#### Collections

Let's create a database and collection of users.

```
> show dbs
admin   0.000GB
config  0.000GB
local   0.000GB

> use tentbnb
switched to db tentbnb

> db.createCollection('users')
{ "ok" : 1 }

> show dbs
admin    0.000GB
config   0.000GB
local    0.000GB
tentbnb  0.000GB
```

Now we want to add documents to our collection. We can check the commands using our trusty `help` function.

```
> db.users.help()
...
db.users.insert(obj)
db.users.insertOne( obj, <optional params> )
db.users.insertMany( [objects], <optional params> )
...
```

Let's add dinesh and gilfoyle.

```
> db.users.insertMany([{ name: 'Dinesh', rating: 3.7}, { name: 'Gilfoyle', rating: 5 }])
{
  "acknowledged" : true,
  "insertedIds" : [
          ObjectId("5d01aaffc077bc17b3587a64"),
          ObjectId("5d01aaffc077bc17b3587a65")
  ]
}
```

Now lets add tents:

```
> db.createCollection('tents')
{ "ok" : 1 }
```

Similary to how we did it with DiskDb, we'll get references to our users by making a querying and setting variables with the result:
```
> [dinesh, gilfoyle] = db.users.find().toArray()
[
  {
    "_id" : ObjectId("5d01aaffc077bc17b3587a64"),
    "name" : "Dinesh",
    "rating" : 3.7
  },
  {
    "_id" : ObjectId("5d01aaffc077bc17b3587a65"),
    "name" : "Gilfoyle",
    "rating" : 5
  }
]
```

Now we can add data with almost the same code as we had before:

```
> db.tents.insertMany([
...   {
...     userId: dinesh._id,
...     area: 15,
...     condition: 'poor',
...     comments: 'Cozy with lots of character.',
...     available: true,
...     distance: 12
...   },
...   {
...     userId: gilfoyle._id,
...     area: 20,
...     condition: 'acceptable',
...     comments: "It's a tent.",
...     available: true,
...     distance: 4
...   }
... ]);
{
  "acknowledged" : true,
  "insertedIds" : [
          ObjectId("5d01abe8c077bc17b3587a66"),
          ObjectId("5d01abe8c077bc17b3587a67")
  ]
}
```

Voila! It's almost the same as before!

Let's query:

```
> db.tents.find({ area: { $gt: 15 } })
{
  "_id" : ObjectId("5d01abe8c077bc17b3587a66"),
  "userId" : ObjectId("5d01aaffc077bc17b3587a65"),
  "area" : 20,
  "condition" :
  "acceptable",
  "comments" : "It's a tent.",
  "available" : true,
  "distance" : 4
}
```

Now let's find Gilfoyle's tents:

```
> db.tents.find({ userId: gilfoyle._id })
{
  "_id" : ObjectId("5d01abe8c077bc17b3587a67"),
  "userId" : ObjectId("5d01aaffc077bc17b3587a65"),
  "area" : 15,
  "condition" : "poor",
  "comments" : "Cozy with lots of character.",
  "available" : true,
  "distance" : 12
}
```

Amaze!

## MongoDB with NodeJS

With that, we can recreate TinyApp using MongoDB to persist our data. The code for the app included [here](./tiny) but first we need to create the tiny database and `users` and `urls` collections in the mongo shell.

```
C:\Users\...\tiny-mongo λ mongo
MongoDB shell version v4.0.10
connecting to: mongodb://127.0.0.1:27017/?gssapiServiceName=mongodb
A bunch of other stuff...

> use tiny
switched to db tiny
> db.createCollection('users')
{ "ok" : 1 }
> db.createCollection('urls')
{ "ok" : 1 }

> show dbs
admin    0.000GB
config   0.000GB
local    0.000GB
tentbnb  0.000GB
tiny     0.000GB
```

To use mongodb in your npm projects you need to use an npm library like [mongodb](https://github.com/mongodb/node-mongodb-native) or [mongoose](https://github.com/Automattic/mongoose).

Now you can connect to the database by passing the `MongoClient`'s connect method a url pointing to your MongoDB instance.

```javascript
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const url = 'mongodb://localhost/tiny';
let db;

MongoClient.connect(url, function(err, database) {
  if (err) {
    console.error(err);
    database.close();
    return;
  }

  db = database.db('tiny');
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
  });
});
```

Since we save the `database.db('tiny')` connection to a local variable `db` we can use it in our route handlers like this:

```javascript

// urls list page
app.get("/urls", (req, res) => {
  db.collection('urls').find({ userID: res.locals.user._id })
  .toArray((err, urls) => {
    if (err) {
      return res.status(500).send("Server error! Please try again.");
    }

    res.render("urls_index", { urls, user: res.locals.user });
  });
});
```

## Go Forth and Develop

Now you're all set!

You can go into the tiny app folder and run the server to create and edit tiny urls which will be stored in your local MongoDB instance.

Cool.
