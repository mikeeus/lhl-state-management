var db = require('diskdb');
db = db.connect('./db', ['users', 'tents']);

const [dinesh, gilfoyle] = db.users.save([
  {
    name: 'Dinesh',
    rating: 3.7,
  },
  {
    name: 'Gilfoyle',
    rating: 5,
  }
]);

db.tents.save([
  {
    userId: dinesh.id,
    area: 15,
    condition: 'poor',
    comments: 'Cozy with lots of character.',
    available: true,
    distance: 12
  },
  {
    userId: gilfoyle.id,
    area: 20,
    condition: 'acceptable',
    comments: "It's a tent.",
    available: true,
    distance: 4
  }
]);

// Queries
const availableTents = db.tents.find({ available: true });

const closeTents = availableTents.filter(t => t.distance < 5);

// Find dinesh's tents

// Find Gilfoyle's tent's