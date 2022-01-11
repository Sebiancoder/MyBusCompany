/**
 * JS for MBS
 * @version 1.1
 * @author Sebastian Jaskowski
 */

// access token for MapBox, used to get map tiles
var accessToken = 'pk.eyJ1Ijoic2ViaWFuY29kZXIiLCJhIjoiY2pyYXY0ZW1zMG96cTQzcnAydm8ybW5mdCJ9.zp_NFlwAb-UEyfscd2lj0A';

var routeBeingEdited = false;    // whether of not a route is currently being edited on the map
var pendingStopCoords = [];    // the coordinates of stops that have been created and are about to be put into a route
var busRoutes = {};    // array of all bus routes
var busStops = {};    // array of all bus stops
var routingLines = {}; // ??????


// ???????
function cancelLoad() {

    $("#warningModal").modal("hide");
    $("#confirmWarning").off();

}

// instantiate the map
var map = L.map('map').setView([39.9526, -75.1652], 13);

// configuration for street map
var streetMap = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a             >',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    accessToken: accessToken,
}).addTo(map);

// configuration for satellite map
var satelliteMap = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a             >',
    maxZoom: 18,
    id: 'mapbox/satellite-streets-v11',
    accessToken: accessToken,
});

// combines street and satellite map
var baseMaps = {
    "Street": streetMap,
    "Satellite": satelliteMap
};

// add map configurations to main map
L.control.layers(baseMaps).addTo(map);

// Leaflet Feature Group containing all "stop circles" on the map, all stop circles are added to this group
var stopCircleFeatureGroup = L.featureGroup().addTo(map);

// runs when map is clicked
map.on("click", function(e) {

    // runs if a route is being edited on a map, and therefore a map click means the creation of a new stop
    if (routeBeingEdited) {

        // create a bus stop object
        busStop = {
            stopCoords: e.latlng,
            stopName: e.latlng.toString(),
            routes: [],
            circle: L.circle(e.latlng, {
                color: '#000000',
                fillColor: '#ffffff',
                fillOpacity: 1,
                radius: 10,
            }).addTo(stopCircleFeatureGroup)
        };

        // The id of a bus stop is its coordinates(e.latlng) in string form
        // add the bus stop to the busStops array
        busStops[busStop.stopName] = busStop;

        // adds id/coordinates of the bus stop to pendingStopCoords to hold them for the creation of the route
        pendingStopCoords.push(busStop.stopName);

    }

});

// runs when any bus stop circle is clicked
stopCircleFeatureGroup.on("click", function(stopClicked) {

    // runs if the route is currently being edited, meaning the stop clicked is added to the line being edited
    if (routeBeingEdited) {

        //prevents click from triggering listener on map, click only triggers circle listener coded here
        L.DomEvent.stop(stopClicked);

        // adds id/coordinates of the bus stop to pendingStopCoords to hold them for the creation of the route
        pendingStopCoords.push(stopClicked.layer.getLatLng().toString());

        // sets the color of the stop to black to signal the stop has been clicked and included in new line
        busStops[stopClicked.layer.getLatLng().toString()].circle.setStyle({
            fillColor: "#000000"
        });

    // runs if the route is not being edited, leads to an info box about the stop popping up
    } else {

        // variable that is true if the stop is deleted
         var stopDeleted = false;

        // gets reference to the bus stop clicked using its coordinateID
        var busStopClicked = busStops[stopClicked.layer.getLatLng().toString()];

        // creates div for popup window
        var popupContent = document.createElement("div");
        popupContent.setAttribute("style", "text-align: center");

        // creates popup heading with stop name, which is stop coordinates unless changed.
        var popupContentHeading = document.createElement('h5');
        popupContentHeading.id = busStopClicked.stopName + 'H';
        popupContentHeading.setAttribute("contentEditable", "true");
        popupContentHeading.innerHTML = busStopClicked.stopName;

        popupContent.appendChild(popupContentHeading);

        // for every route at this stop, stored in busStop.routes, create a graphic displaying route name
        for (var i = 0; i < busStopClicked.routes.length; i++) {

            var route = busRoutes[busStopClicked.routes[i]];

            var routeBlock = document.createElement('div');
            routeBlock.setAttribute("style", "height: 20px; background-color: " + route.color + ";");
            var routeBlockText = document.createElement('p');
            routeBlockText.setAttribute("style", "text-align: center; margin: 0");
            routeBlockText.innerHTML = route.name;
            routeBlock.appendChild(routeBlockText);

            popupContent.appendChild(routeBlock);

        }

        // create the delete stop button
        var deleteStopButton = document.createElement("button");
        deleteStopButton.id = "deleteStopButton";
        deleteStopButton.setAttribute("class", "btn btn-danger");
        deleteStopButton.setAttribute("style", "text-align: center; margin-top: 10px");
        deleteStopButton.innerHTML = "Delete Stop";

        popupContent.appendChild(deleteStopButton);

        // instantiate and open the popup
        var stopPopup = L.popup().setLatLng(stopClicked.layer.getLatLng()).setContent(popupContent).openOn(map);

        // runs when the delete stop button is pressed
        $("#deleteStopButton").click(function() {

            stopDeleted = true;

            // removes the circle graphic for the stop
            busStopClicked.circle.remove();

            // iterate through all routes that stop at this stop
            for (var i = 0; i < busStopClicked.routes.length; i++) {

                // remove the to-be-deleted stop from all routes that stop at the stop
                busRoutes[busStopClicked.routes[i]].stops.splice(busRoutes[busStopClicked.routes[i]].stops.indexOf(stopClicked.layer.getLatLng().toString()), 1);

            }

            // remove the deleted busStop from the busStops object
            delete busStops[busStopClicked.stopCoords.toString()];

            // close popup
            map.closePopup();

            // rerender all routes
            updateRoutingObjects();

        });

        // runs when the popup closes
        map.on('popupclose', function(event) {

            // this code only runs if the stop is not deleted
            if (!stopDeleted) {

                // set name of bus stop to the header of the popup, user can change name here
                busStops[event.popup.getLatLng().toString()].stopName = event.popup.getContent().children[0].textContent;
            
                // update GUI on left panel (this is needed here because changing the name of a bus stop could have changed origin or destination of bus line)
                for (var j = 0; j < busStops[event.popup.getLatLng().toString()].routes.length; j++) {

                updateListObject(busStops[event.popup.getLatLng().toString()].routes[j]);

            }

            }

        });

    }

});

stopCircleFeatureGroup.on("contextmenu", function(stopClicked) {

    if (pendingStopCoords.includes(stopClicked.layer.getLatLng().toString())) {

        pendingStopCoords.splice(pendingStopCoords.indexOf(stopClicked.layer.getLatLng().toString()), 1);

        if (busStops[stopClicked.layer.getLatLng().toString()].routes.length == 0) {

            busStops[stopClicked.layer.getLatLng().toString()].circle.remove();
            delete busStops[stopClicked.layer.getLatLng().toString()];

        } else {

            busStops[stopClicked.layer.getLatLng().toString()].circle.setStyle({
                fillColor: "#ffffff"
            });

        }

    }

});

$("#newLineButton").click(function() {

    $("#newLineCollapse").collapse("toggle");

    if ($("#newLineButton").text() == "Create a New Line") {

        $("#newLineButton").removeClass("btn-success");
        $("#newLineButton").addClass("btn-danger");
        $("#newLineButton").text("Cancel");
        routeBeingEdited = true;

    } else {

        for (var i = 0; i < pendingStopCoords.length; i++) {

            if (busStops[pendingStopCoords[i]].routes.length == 0) {

                busStops[pendingStopCoords[i]].circle.remove();
                delete busStops[pendingStopCoords[i]];

            } else {

                busStops[pendingStopCoords[i]].circle.setStyle({
                    fillColor: "#ffffff"
                });

            }

        }

        pendingStopCoords = [];

        $("#newLineButton").removeClass("btn-danger");
        $("#newLineButton").addClass("btn-success");
        $("#newLineButton").text("Create a New Line");
        routeBeingEdited = false;

    }

});

$("#saveButton").click(function() {

    var routesCopy = jQuery.extend(true, {}, busRoutes);
    var stopsCopy = jQuery.extend(true, {}, busStops);

    var routeIDs = Object.keys(routesCopy);

    for (var i = 0; i < routeIDs.length; i++) {

        routesCopy[routeIDs[i]].route = "";

    }

    var stopCoords = Object.keys(stopsCopy);

    for (var i = 0; i < stopCoords.length; i++) {

        stopsCopy[stopCoords[i]].circle = "";

    }

    var saveData = {
        routes: routesCopy,
        stops: stopsCopy
    }

    var saveDataAsJSON = JSON.stringify(saveData);
    var fileToSave = new Blob([saveDataAsJSON], {
        type: "application/json",
        name: "myBusCompany.json"
    });

    saveAs(fileToSave, "myBusCompany.json");

});

$("#loadButton").click(function() {

    $("#warningModalText").text("Loading a new route system will cause you to lose any current work. Are you sure you want to continue?")

    $("#warningModal").modal();

    $("#confirmWarning").on("click", function() {

        $("#warningModal").modal("hide");

        $("#confirmWarning").off();

        var busRouteKeys = Object.keys(busRoutes);

        for (var i = 0; i < busRouteKeys.length; i++) {

            deleteLine(busRouteKeys[i]);

        }

        $("#loadFileInput").click();
        $("#loadFileInput").on("change", function() {

            var uploadedFile = $("#loadFileInput").prop("files").item(0);

            if (uploadedFile != null) {

                var fileReader = new FileReader();

                fileReader.onload = function(e) {

                    var uploadedFileAsObject = JSON.parse(e.target.result);

                    var stops = uploadedFileAsObject.stops;
                    var routes = uploadedFileAsObject.routes;

                    var stopCoords = Object.keys(stops);
                    var routeIDs = Object.keys(routes);

                    for (var i = 0; i < stopCoords.length; i++) {

                        stops[stopCoords[i]].circle = L.circle(stops[stopCoords[i]].stopCoords, {
                            color: '#000000',
                            fillColor: '#ffffff',
                            fillOpacity: 1,
                            radius: 10,
                        }).addTo(stopCircleFeatureGroup);

                        busStops[stopCoords[i]] = stops[stopCoords[i]];

                    }

                    for (var i = 0; i < routeIDs.length; i++) {

                        var routingObject = createRoutingObject(
                          (routes[routeIDs[i]].stops).map(a => busStops[a].stopCoords),
                          routes[routeIDs[i]].name,
                          routes[routeIDs[i]].color
                        );

                        routes[routeIDs[i]].route = routingObject;

                        busRoutes[routeIDs[i]] = routes[routeIDs[i]];

                        buildListObject(busRoutes[routeIDs[i]]);

                    }

                    $("#loadFileInput").off();
                    $("#loadFileInput").val(null);

                }

                fileReader.readAsText(uploadedFile);

            }

        });

    });

});

$("#createLineButton").click(function() {

    if (lineExists($("#name").val())) {

        createAlert("A line with this name already exists");

    } else if (/\s/.test($("#name").val())) {

        createAlert("The line name cannot contain any spaces");

    } else if ($("#name").val().length < 1) {

        createAlert("Please give this line a name");

    } else if (pendingStopCoords.length < 2) {

        createAlert("Please ensure that the line has at least two stops");

    } else {

        createNewLine();

        $("#newLineCollapse").collapse("toggle");
        $("#newLineButton").removeClass("btn-danger");
        $("#newLineButton").addClass("btn-success");
        $("#newLineButton").text("Create a New Line");

        routeBeingEdited = false;

    }

})

$("#deleteLineButton").on("click", function() {

    $("#moreOpsModal").modal("hide");
    $("#warningModalText").text("Are you sure you want to delete this line? This action cannot be undone.");
    $("#warningModal").modal();

    $("#confirmWarning").on("click", function() {

        routeID = $("#moreOpsModalTitle").text() + "ID";

        deleteLine(routeID);

        $("#warningModal").modal("hide");

        $("#confirmWarning").off();

    });

});

function deleteLine(routeID) {

    for (var i = 0; i < busRoutes[routeID].stops.length; i++) {

        if (busStops[busRoutes[routeID].stops[i]].routes.length > 1) {

            busStops[busRoutes[routeID].stops[i]].routes.splice(busStops[busRoutes[routeID].stops[i]].routes.indexOf(routeID), 1);

        } else {

            busStops[busRoutes[routeID].stops[i]].circle.remove();
            delete busStops[busRoutes[routeID].stops[i]];

        }

    }

    $("#" + routeID).remove();

    delete busRoutes[routeID];

    updateRoutingObjects();

}

function lineExists(lineName) {

    var x;
    for (x in busRoutes) {

        if (x == lineName + "ID") {
            return true;
        }

    }

    return false;

}

function createAlert(message) {

    var Alert = document.createElement("div");
    Alert.id = "alert";
    Alert.setAttribute("class", "hidden alert alert-danger alert-dismissable fade show");

    alertCloseButton = document.createElement("a");
    alertCloseButton.setAttribute("href", "#");
    alertCloseButton.setAttribute("class", "close");
    alertCloseButton.setAttribute("data-dismiss", "alert");
    alertCloseButton.setAttribute("aria-label", "close");
    alertCloseButton.innerHTML = "&times";

    Alert.innerHTML = message;
    Alert.appendChild(alertCloseButton);


    $("#alertsDiv").append(Alert);

    setTimeout(function() {
        $("#alert").alert("close");
    }, 5000);

}

function createRoutingObject(waypoints, lineName, lineColor){

    var router = L.Routing.osrmv1({router: L.Routing.mapbox(accessToken)});

    waystops = waypoints.map(a => ({latLng: a}));

    router.route(waystops, function(error, routes){

        if(error != null){console.log(error)}

        routingCoords = routes[0].coordinates;
        console.log(routingCoords);

        routingObject = {};

        for(var i = 0; i < (routingCoords.length - 1); i++){

          var segmentID = routingCoords[i].toString() + routingCoords[i + 1].toString();
          var segmentIDReversed = routingCoords[i + 1].toString() + routingCoords[i].toString();

          if(!routingLines.hasOwnProperty(segmentID)){

            routingLines[segmentID] = 0;
            routingLines[segmentIDReversed] = 0;

          } else {

            routingLines[segmentID]++;
            routingLines[segmentIDReversed]++;

          }

          routingObject[segmentID] = L.polyline(
            [routingCoords[i], routingCoords[i + 1]],
            {
              color: lineColor,
              smoothFactor: 0.5,
              weight: 5,
              opacity: 1,
              offset: routingLines[segmentID] * 5
            }
          ).addTo(map);

        }

        busRoutes[lineName + "ID"].route = routingObject;

    });

    stopCircleFeatureGroup.bringToFront();

}


function createNewLine() {

    var lineName = $("#name").val();
    var lineColor = $("#color").val();

    var route = {
        name: lineName,
        color: lineColor,
        stops: pendingStopCoords
    }

    createRoutingObject(
        pendingStopCoords.map(a => busStops[a.toString()].stopCoords),
        lineName,
        lineColor
     );

    busRoutes[lineName + "ID"] = route;

    for (var i = 0; i < pendingStopCoords.length; i++) {

        if (!busStops[pendingStopCoords[i]].routes.includes(route.name + "ID")) {

            busStops[pendingStopCoords[i]].routes.push(route.name + "ID");

        }

        busStops[pendingStopCoords[i]].circle.setStyle({
            fillColor: "#ffffff"
        });

    }

    buildListObject(route);

    pendingStopCoords = [];

}

function buildListObject(route) {

    var routeListItem = document.createElement("a");
    routeListItem.id = route.name + "ID";
    routeListItem.setAttribute("href", "#");
    routeListItem.setAttribute("class", "list-group-item list-group-item-action flex-column align-items-start active");
    routeListItem.setAttribute("style", "background-color:" + route.color + ";");

    $("#lines").append(routeListItem);

    var heading = document.createElement("h5");
    heading.id = route.name + "HeadingID";
    heading.setAttribute("class", "mb-1");
    heading.innerHTML = route.name;

    $("#" + route.name + "ID").append(heading);

    var originAndDestination = document.createElement("p");
    originAndDestination.id = route.name + "ODID";
    originAndDestination.setAttribute("class", "mb-1");
    originAndDestination.innerHTML = busStops[route.stops[0]].stopName + " - " + busStops[route.stops[route.stops.length - 1]].stopName;

    $("#" + route.name + "ID").append(originAndDestination);

    var buttonsRow = document.createElement("div");
    buttonsRow.id = route.name + "Buttons";
    buttonsRow.setAttribute("style", "text-align: center; width: 100%");
    buttonsRow.setAttribute("class", "row");

    $("#" + route.name + "ID").append(buttonsRow);

    var leftButtonCol = document.createElement("div");
    leftButtonCol.id = route.name + "LBCol";
    leftButtonCol.setAttribute("class", "col-lg-6");

    var rightButtonCol = document.createElement("div");
    rightButtonCol.id = route.name + "RBCol";
    rightButtonCol.setAttribute("class", "col-lg-6");

    $("#" + route.name + "Buttons").append(leftButtonCol);
    $("#" + route.name + "Buttons").append(rightButtonCol);

    var addStopsButton = document.createElement("button");
    addStopsButton.id = route.name + "ASButtonID";
    addStopsButton.setAttribute("type", "button");
    addStopsButton.setAttribute("class", "btn btn-primary");
    addStopsButton.setAttribute("style", "width: 100%;");
    addStopsButton.innerHTML = "Add Stops";

    var moreOpsButton = document.createElement("button");
    moreOpsButton.id = route.name + "MOButtonID";
    moreOpsButton.setAttribute("type", "button");
    moreOpsButton.setAttribute("class", "btn btn-primary");
    moreOpsButton.setAttribute("style", "width: 100%");
    moreOpsButton.innerHTML = "More Options";

    $("#" + route.name + "LBCol").append(addStopsButton);
    $("#" + route.name + "RBCol").append(moreOpsButton);

    $("#" + route.name + "ASButtonID").click(function(e) {

      route = busRoutes[e.target.id.replace("ASButtonID", "ID")];

      if(e.target.innerHTML != "Finish"){

        e.target.innerHTML = "Finish";

        var addStopsText = document.createElement("h6");
        addStopsText.id = route.name + "ASText";
        addStopsText.innerHTML = "Click on the map to add stops to the end of the selected line";

        $("#" + route.name + "ID").append(addStopsText);

        routeBeingEdited = true;

      } else {

        routeBeingEdited = false;

        route.stops = route.stops.concat(pendingStopCoords);

        busRoutes[route.name + "ID"].route.remove();
        busRoutes[route.name + "ID"].route = createRoutingObject(
            route.stops.map(a => busStops[a].stopCoords),
            route.name,
            route.color
        );

        for (var i = 0; i < pendingStopCoords.length; i++) {

          if (!busStops[pendingStopCoords[i]].routes.includes(route.name + "ID")) {

            busStops[pendingStopCoords[i]].routes.push(route.name + "ID");

          }

          busStops[pendingStopCoords[i]].circle.setStyle({fillColor: "#ffffff"});

        }

        pendingStopCoords = [];
        $("#" + route.name + "ASText").remove();

        e.target.innerHTML = "Add Stops";

        updateListObject(route.name + "ID");

      }

    });

    $("#" + route.name + "MOButtonID").click(function(e) {

        initModal(busRoutes[e.target.id.replace("MOButtonID", "ID")]);

    });

}

function initModal(route) {

    $("#moreOpsModalTitle").text(route.name);
    $("#stops").empty();

    for (var i = 0; i < route.stops.length; i++) {

        var stopsListItem = document.createElement("a");
        stopsListItem.setAttribute("class", "list-group-item");
        stopsListItem.innerHTML = busStops[route.stops[i]].stopName;

        $("#stops").append(stopsListItem);

    }

    $("#moreOpsModal").modal();

}

// update GUI of route list object (left panel)
function updateListObject(routeID) {

    //get the route to be updated based on routeID
    route = busRoutes[routeID];
    $("#" + route.name + "ODID").text(busStops[route.stops[0]].stopName + " - " + busStops[route.stops[route.stops.length - 1]].stopName);

}

function updateRoutingObjects(){

  routingLines = 0;

  for(var i = 0; i < Object.keys(busRoutes).length; i++){

    var routeID = busRoutes[Object.keys(busRoutes)[i]].name + "ID";
    console.log(routeID);
    console.log(busRoutes[routeID]);

    routingObjectKeys = Object.keys(busRoutes[routeID].route);

    for(var j = 0; j < routingObjectKeys.length; j++){

      busRoutes[routeID].route[routingObjectKeys[j]].remove();

    }

    busRoutes[routeID].route = createRoutingObject(
      busRoutes[routeID].stops.map(a => busStops[a].stopCoords),
      busRoutes[routeID].name,
      busRoutes[routeID].color
    )

  }

}
