/* Get 'home' page */
var request = require("request");
var apiOptions = {
  server: "http://localhost:3001"
};
if (process.env.NODE_ENV === "production") {
  apiOptions.server = "https://boiling-basin-37117.herokuapp.com/";
}
var renderHomepage = function (req, res, responseBody) {
  var message;
  if (!(responseBody instanceof Array)) {
    message = "API lookup error";
    responseBody = [];
  }
  else {
    if (!responseBody.length) {
      message = "No places found nearby";
    }
  }
  res.render('locations-list', {
    title: 'Loc8r - find a place to work with wifi',
    pageHeader: {
      title: 'Loc8r',
      strapline: 'Find places to work with wifi near you!'
    },
    sidebar: "Looking for wifi and a seat? Loc8r helps you find places to work when out and about. Perhaps with coffee, cake or a pint? Let loc8r help you find the place you're looking for.",
    locations: responseBody,
    message: message,
  });
}
var _formatDistance = function (distance) {
  var numDistanc, unit;
  if (distance > 1) {
    numDistance = parseFloat(distance).toFixed(1); //rounds to one decimal
    unit = "km";
  }
  else {
    numDistance = parseInt(distance * 1000, 10); //second parameter just rounds to nearest tens
    unit = "m";
  }
  return numDistance + " " + unit;
}
module.exports.homelist = function (req, res) {
  var requestOptions, path;
  path = "/api/locations";
  requestOptions = {
    url: apiOptions.server + path,
    method: "GET",
    json: {},
    qs: {
      lng: 10,
      lat: 10,
      maxDistance: 0.00000001
    }
  };
  request(requestOptions, function(err, response, body) {
    var i, data;
    data = body;
    if (response.statusCode === 200 && data.length) { //if the response code is good and there is stuff in the response
      for (i =0; i < data.length; i++) {
        data[i].distance = _formatDistance(data[i].distance);
      }
    }
    renderHomepage(req, res, data);
    console.log(body);
  });
};

var getLocationInfo = function (req, res, callback) {
  var requestOptions, path;
  path = "/api/locations/" + req.params.locationid;
  requestOptions = {
    url: apiOptions.server + path,
    method: "GET",
    json: {},
  };
  request(requestOptions, function (err, response, body) {
    var data = body;
    if (response.statusCode === 200) {
      data.coords = {
        lng: body.coords[0],
        lat: body.coords[1]
      };
      callback(req, res, data);
    }
    else {
      console.log(data);
      _showError(req, res, response.statusCode);
    }
  });
}
//help function that will render the location information, sets title jade objects so that they correspond to the database info from the mongdb database
var renderDetailPage = function (req, res, locDetail) {
  res.render('location-info', {
      title: locDetail.name,
      pageHeader: {
          title: locDetail.name
      },
      sidebar: {
          context: 'is on Loc8r because it has accessible wifi and space to sit down with your laptop and get some work done.',
          callToAction: 'If you\'ve been and you like it - or if you don\'t - please leave a review to help other people just like you.'
      },
      location: locDetail
  });
}

//returns an object to the template that fills in title and content jade values with error messages
var _showError = function (req, res, status) {
  var title, content;
  if (status === 404) {
    title = "404, page not found";
    content = "Oh my dear lawd jesus, looks like we can't find this page. Sorry.";
  }
  else {
    title = status + ", something's gone wrong.";
  }
  res.status(status);
  res.render("generic-text", {
    title: title,
    content: content,
  });
};

/* GET 'Location info' page */
module.exports.locationInfo = function(req, res) {
  getLocationInfo(req, res, function (req, res, responseData) {
    renderDetailPage(req, res, responseData);
  })
};
var renderReviewForm = function (req, res, locDetail) {
  res.render("location-review-form", {
    title: "Review " + locDetail.name + " on Loc8r",
    pageHeader: {title: "Review " + locDetail.name},
    error: req.query.err
  });
};


/* GET 'Add review' page */
module.exports.addReview = function(req, res) {
  getLocationInfo(req, res, function (req, res, responseData) {
    renderReviewForm(req, res, responseData);
  });
};

module.exports.doAddReview = function (req, res) {
  var requestOptions, path, locationid, postdata;
  locationid = req.params.locationid;
  path = "/api/locations/" + locationid + "/reviews";
  //data given from the form in the post.
  postdata = {
    author: req.body.name,
    rating: parseInt(req.body.rating, 10),
    reviewText: req.body.review
  };
  //standard options given to the
  requestOptions = {
    url: apiOptions.server + path,
    method: "POST",
    json: postdata
  };
  if (!postdata.author || !postdata.rating || !postdata.reviewText) {
    res.redirect("/location/" + locationid + "/review/new?err=val");
  }//send request
  else {
    request(requestOptions, function(err, response, body) {
      //if its good, redirect to the newly created review
      if (response.statusCode === 201) {
        res.redirect("/location/" + locationid);
      }
      else if (response.statusCode === 400 && body.name && body.name === "ValidationError") {
        res.redirect("/location/" + locationid + "/review/new?err=val");
      }
      else {
        console.log(err);
        _showError(req, res, response.statusCode);
      }
    });
  }
}
