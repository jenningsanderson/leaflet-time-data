// Leaflet & JQuery have already been loaded
//
//
//
//

$(document).ready(function(){

  //Get the query variable...
  function getQueryVariable(variable){
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
      var pair = vars[i].split("=");
      if(pair[0] == variable){return pair[1];}
    }
    return(false);
  }

  // add an OpenStreetMap tile layer
  var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  });

  var user = getQueryVariable("user");

  //Prepare hash 
  var codes = {
    "Sentiment"   : [],
    "Preparation" : [],
    "Movement"    : [],
    "Environment" : [],
    "Social"      : [],
  }

  var others = []
  var movement = []

  data_for_timeline = []

  //Load the GeoJSON and make different layers
  $.getJSON("/Twitter-Evacuation-Patterns/datasets/qualmaps/"+user+".json", function(data) {

    for (index in data.features){
      text = data.features[index].properties['text']
      date = data.features[index].properties['time']
      if (text != undefined){
        data_for_timeline.push({start: date, content: text, type: "point"})
      }
    }

    var all_points = L.geoJson(data, {
      
      onEachFeature: function (feature, layer) {

        if (feature.geometry['type'] == "LineString"){
          layer.bindPopup("Movement Path for "+ feature.properties["handle"])
          movement.push(layer)
        }
        else if (feature.properties.location != undefined){
          layer.bindPopup("Location: " + feature.properties.location)
          movement.push(layer)
        }
        else if (feature.properties['text'] != undefined ){
          layer.bindPopup(feature.properties['time'] + " : " + feature.properties.text);

          //Check if coding is available for this layer
          if (feature.coding != undefined){
            
            for (var code in codes){
              if (feature.coding[code] != undefined){
                layer.setIcon(L.icon({
                  iconUrl: '/Twitter-Evacuation-Patterns/assets/icons/'+feature.coding[code][0]+'.png',
                  iconSize: [25,25]}));
                codes[code].push(layer);
              }
            }
          }
          else{
            others.push(layer)
          }
        }
      }
    });

    // Create a DataSet with data
    var timelineData = new vis.DataSet(data_for_timeline);

    // Set timeline options
    var timelineOptions = {
      "width":  "100%",
      "maxHeight":"600px",
      "minHeight":"300px",
      "autoResize": false,
      "style": "box",
      "axisOnTop": true,
      "showCustomTime":true,
      "max" : new Date(2012,10,10),
      "min" : new Date(2012,9,20)
    };

    // Setup timeline
    var timeline = new vis.Timeline(document.getElementById('timeline'), timelineData, timelineOptions);
        
    // Set custom time marker (blue)
    timeline.setCustomTime(new Date(2012,9,29));

    hidden_layers = []

    function updateTimeRange (time_range) {
    //I'll have to loop through ALL the layers, not just those that are visible on the map.

      for (index in map._layers){
        layer = map._layers[index]
        
        if (layer.feature != undefined){
          if (layer.feature.hasOwnProperty('properties')){
            if (layer.feature.properties.hasOwnProperty('time')){
              time = new Date(layer.feature.properties.time)
              if ((time > time_range.start) & (time < time_range.end)){
                map.addLayer(layer);
              }else{
                hidden_layers.push(layer)
                map.removeLayer(layer)
              }
            }
          }
        }
        for (index in hidden_layers){
          time = new Date(hidden_layers[index].feature.properties.time)
          if ((time > time_range.start) & (time < time_range.end)){
            map.addLayer(hidden_layers.splice(index, 1)[0])
          }
        }
      }
    }

    // add event listener
    timeline.on('rangechanged', updateTimeRange);

    //Call the map
    var map = L.map("map").fitBounds(all_points.getBounds());

    //Add baselayer
    tiles.addTo(map);

    var baseMaps = {"Basemap": tiles};
    var overlayMaps = {
      "Sentiment"  : L.layerGroup(codes['Sentiment']),
      "Preparation": L.layerGroup(codes['Preparation']),
      "Movement"   : L.layerGroup(codes['Movement']),
      "Environment": L.layerGroup(codes['Environment']),
      "Social"     : L.layerGroup(codes['Social']),
      "Other Tweets"  : L.layerGroup(others),
      "Points Of Interest"  : L.layerGroup(movement)
    };

    for (layerGroup in overlayMaps){
      overlayMaps[layerGroup].addTo(map)
    }

    //Add layers control
    L.control.layers(null, overlayMaps).addTo(map);

    // //https://github.com/dwilhelm89/LeafletSlider
    // var sliderControl = L.control.sliderControl({
    //   position: "topright",
    //   layer: overlayMaps['Sentiment'],
    //   range: true
    // });

    // //Make sure to add the slider to the map ;-)
    // map.addControl(sliderControl);
    
    // //And initialize the slider
    // sliderControl.startSlider();
  });
});