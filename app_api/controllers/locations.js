var mongoose = require("mongoose");
var Loc = mongoose.model("Location");

var sendJsonResponse = function (res, status, content){
  res.status(status);
  res.json(content);
}

function locationsCreate (req, res) {
  Loc.create({
    name: req.body.name, //use body to  get form attributes of the form that was sent using x-www-form-urlencoded
    address: req.body.address,
    facilities: req.body.facilities,
    coords: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
    openingTimes: [{
      days: req.body.days1,
      opening: req.body.opening1,
      closing: req.body.closing1,
      closed: req.body.closed1,
    }, {
      days: req.body.days2,
      opening: req.body.opening2,
      closing: req.body.closing2,
      closed: req.body.closed2,
    }]
  },
  function (err, location) { //returns the created object if successful
    if(err) {
      sendJsonResponse (res, 400, err);
    }
    else {
      sendJsonResponse(res, 201, location); //201 means request was successful and something was created as a result
    }
  })
};

function locationsListByDistance (req, res) {
  //http://localhost:3001/api/locations/?lat=51.5034070&lng=-0.1275920
  //get values from url string
  //localhost:3001/?lat=214324532&lng=543265643
  var lng = parseFloat(req.query.lng);
  var lat = parseFloat(req.query.lat);
  var point = {
    type: "Point",
    coordinates: [lng, lat]
  };
  //javascript closure
  var theEarth = (function (){
    var earthRadius = 6371; ///km, miles is 3959
    //to get distance => radians * radians
    //to get radians => distance / radius
    var getDistanceFromRads = function (rads) {
      return parseFloat (rads * earthRadius);
    };

    var getRadsFromDistance = function (distance){
      return parseFloat(distance/earthRadius);
    };
    //return the two functions in an object
    return {
      getDistanceFromRads : getDistanceFromRads,
      getRadsFromDistance : getRadsFromDistance
    };
  })(); //iife => immediately invoked function expression
  //options for mongo geolocation
  //spherical because most people think of the world as round
  var geoOptions = {
    spherical : true,
    maxDistance: theEarth.getRadsFromDistance(100000000000000),
    num: 10
  };
  if (!lng || !lat) {
    sendJsonResponse(res, 404, {
      "message": "lng and lat query parameters"
    });
    return;
  }
  //Loc.geoNear(point, geoOptions, callback);
  //results object get {dis:2, obj:{name:fgfdsg, ....}}
  Loc.geoNear(point, geoOptions, function (err, results, stats) {
    var locations = [];
    results.forEach(function (doc) {
      locations.push({
        distance: theEarth.getDistanceFromRads(doc.dis),
        name: doc.obj.name,
        address: doc.obj.address,
        rating: doc.obj.rating,
        facilities: doc.obj.facilities,
        _id: doc.obj._id
      })
    })
    sendJsonResponse(res, 200, locations)
  })
}

function locationsReadOne (req, res) {
if (req.params && req.params.locationid){  //if param is not given in url
  Loc
    .findById(req.params.locationid) //object id
    .exec(function(err, location) { //second param is the content
      if(!location){ //if object not found in database
        sendJsonResponse(res, 404, {
          "message": "locationid not found"
        });
        return;
      }
      else if (err) { //if the database errors out
        sendJsonResponse(res, 404, err);
        return;
      }
      //all is good!
      sendJsonResponse(res, 200, location);
    });
}
else {
  sendJsonResponse(res, 404, {
    "message": "No locationid in request"
  });
}

};
function locationsUpdateOne (req, res) {
  if(!req.params.locationid){
    sendJsonResponse(res, 404, {
      "message": "Not found, locationid is required"
    });
    return;
  }
  Loc
    .findById(req.params.locationid)
    .select("-reviews -rating")
    .exec(function(err, location) {
      if( !location ) {
        sendJsonResponse(res, 400, {
          "message": "locationid not found"
        });
        return;
      }
      else if (err){
        sendJsonResponse(res, 400, err);
        return;
      }
      location.name = req.body.name;
      location.address = req.body.address;
      location.facilities = req.body.facilities;
      location.coords = [parseFloat(req.body.lng),
      parseFloat(req.body.lat)];
      location.openingTimes = [{
        days: req.body.days1,
        opening: req.body.opening1,
        closing: req.body.closing1,
        closed: req.body.closed1,
      }, {
        days: req.body.day2,
        opening: req.body.opening2,
        closing: req.body.closing2,
        closed: req.body.closed2,
      }];
      location.save(function(err, location) {
        if(err) {
          sendJsonResponse(res, 404, err);
        }
        else {
          sendJsonResponse(res, 200, location);
        }
      })
    })
}
function locationsDeleteOne (req, res) {
  var locationid = req.params.locationid;
  if (locationid) {
    Loc
      .findByIdAndRemove(locationid)
      .exec(function (err, location) {
        if(err){
          sendJsonResponse(res, 404, err);
          return;
        }
        sendJsonResponse(res, 204, null);
      });
  }
  else {
    sendJsonResponse(res, 404, {
      "message": "No locationid"
    });
  }
};
module.exports = {
  locationsCreate: locationsCreate,
  locationsListByDistance: locationsListByDistance,
  locationsReadOne: locationsReadOne,
  locationsUpdateOne: locationsUpdateOne,
  locationsDeleteOne: locationsDeleteOne,
}
