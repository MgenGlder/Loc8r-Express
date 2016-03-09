var mongoose = require("mongoose");
var Loc = mongoose.model("Location");

var sendJsonResponse = function (res, status, content){
  res.status(status);
  res.json(content);
}
var updateAverageRating = function(locationid){
  Loc
    .findById(locationid)
    .select("rating reviews")
    .exec(function (err, location) {
      if(!err) {
        doSetAverageRating(location);
      }
    });
}

var doSetAverageRating = function(location) {
  var i, reviewCount, ratingAverage, ratingTotal;
  if (location.reviews && location.reviews.length > 0) {
    reviewCount = location.reviews.length;
    ratingTotal = 0;
    for (i = 0; i < reviewCount; i++) {
      ratingTotal = ratingTotal + location.reviews[i].rating;
    }
    ratingAverage = parseInt(ratingTotal / reviewCount, 10);
    location.rating = ratingAverage;
    location.save(function(err) {
      if (err) {
        console.log(err);
      }
      else {
        console.log("Average rating updated to", ratingAverage);
      }
    });
  }
  else{
    console.log("nothing was added...");
  }
};

var doAddReview = function (req, res, location) {
  if (!location) {
    sendJsonResponse (res, 404, {
      "message": "location not found"
    });
  }
  else {
    //should be an object with just an _id of the locations object and the reviews attribute with a list of reviews subdocuments
    location.reviews.push({
      author: req.body.author,
      rating: req.body.rating,
      reviewText: req.body.reviewText
    });
    //add review obtained from the post from a form to the model
    location.save(function(err, location) {
      //save the model to the database
      var thisReview;
      if (err){
        console.log(err);
        sendJsonResponse(res, 400, err);
      }
      else {
        //if successfully saved in the model, and thus into the database, sen
        updateAverageRating(location._id);
        thisReview = location.reviews[location.reviews.length - 1]; //send back the last one (the one you just added)
        sendJsonResponse(res, 201, thisReview);
      }
    });
  }
}

function reviewsCreate (req, res) {
  var locationid = req.params.locationid;
  if (locationid) {
    Loc
      .findById(locationid) //find the location to add a record to
      .select("reviews")    //select only the reviews from the object
      .exec(
        function (err, location) {
          if (err) {
            sendJsonResponse (res, 400, err);
          }
          else {
            doAddReview(req, res, location); //on success, refer to other method to do accual database injection
          }
        }
      );
  }
  else {
    sendJsonResponse(res, 404, {
      "messagE": "Not found, locationid required"
    });
  }
 };
function reviewsReadOne (req, res) {
  if(req.params && req.params.locationid && req.params.reviewid){
    Loc
      .findById(req.params.locationid)
      .select("name reviews")
      .exec(
          function(err, location){ //first get location object from the database
            var response, review;
            if (!location) {
              sendJsonResponse(res, 404, {
                "message": "locationid not found"
              });
              return;
            }
            else if (err) {
              sendJsonResponse (res, 400, err);
              return;
            }
            if (location.reviews && location.reviews.length > 0) { //after u got location, use id method to get the reviews and see if theres anything in it.
              review = location.reviews.id(req.params.reviewid);
              if (!review) {
                sendJsonResponse(res, 404, {
                  "message": "reviewid not found"
                });
              }
              else {  //if there are reviews, create response object to send
                response = {
                  location: {
                    name: location.name,
                    id: req.params.locationid
                  },
                  review: review
                };
                sendJsonResponse(res, 200, response);
              }
            }
            else {
              sendJsonResponse(res, 404, {
                "message": "Not found, locationid and reviewid are both required"
              });
            }
          }
      )
  }
  else {
    sendJsonResponse(res, 404, {
      "message": "Not found, locationid and reviewid are both required"
    });
  }
};
function reviewsDeleteOne (req, res) {
  sendJsonResponse(res, 200, {"status": "success"});
};
//update review -> post form
function reviewsUpdateOne (req, res) {
  //if doesnt have either of required params, error out
  if(!req.params.locationid || !req.params.reviewid) {
    sendJsonResponse(res, 404, {
      "message": "Not found, locationid and reviewid are both required"
    });
    return;
  }
  Loc
    .findById(req.params.locationid)
    .select("reviews")
    .exec(function (err, location) {
      var thisReview
      if (!location) {
        sendJsonResponse(res, 404, {
          "message": "locationid not found"
        });
        return;
      }
      else if (err){
        sendJsonResponse(res, 400, err);
        return;
      }
      if (location.reviews && location.reviews.length >0) {
        //if location object has reviews
        //pass by value => value is a reference
        thisReview = location.reviews.id(req.params.reviewid);
        //find specific review specified in post request
        if(!thisReview) {
          //if review not found, error out
          sendJsonResponse(res, 404, {
            "message": "reviewid not found"
          });
        }
        else {
          //pass by "reference" so, this changes the model object.
          thisReview.author = req.body.author;
          thisReview.rating = req.body.rating;
          thisReview.reviewText = req.body.reviewText;
          location.save(function(err, location) {
            if(err) {
              sendJsonResponse(res, 404, err);
            }
            else {
              updateAverageRating(location._id);
              sendJsonResponse(res, 200, thisReview);
            }
          });
        }

        }
        else {
          sendJsonResponse(res, 404, {
            "message": "No review to update"
          });
      }
    });
};


module.exports = {
  reviewsCreate: reviewsCreate,
  reviewsReadOne: reviewsReadOne,
  reviewsDeleteOne: reviewsDeleteOne,
  reviewsUpdateOne: reviewsUpdateOne,
}
