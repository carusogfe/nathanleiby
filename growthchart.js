/*
Ideas:
-Take a simply formatted JSON of expected growths, to plot x against y
-Work for weight vs age, height vs age, height vs weight, etc etc
-Work against various standards (CDC, WHO, national goverments)

Todos:
-Default is to select the last datum; highlight it and show tooltip
-Improved tickmarks
-Labels on the lines, or a legend (%tile, malnourished/severely/normal); color for different lines
-Support for ages 5 years to 20 years
-Improve tooltip style
// http://rveciana.github.com/geoexamples/d3js/d3js_electoral_map/tooltipCode.html#
// http://rveciana.github.com/geoexamples/?page=d3js/d3js_electoral_map/simpleTooltipCode.html
// http://bl.ocks.org/biovisualize/2973775

Other Growth charts:
https://wiki.openmrs.org/display/docs/Growth+Chart+Module
http://www.cdc.gov/growthcharts/
http://www.cdc.gov/growthcharts/2000growthchart-us.pdf
  -> page 138, table 9 (weight vs age, birth to 36 months)
  -> page 143, table 14 (weight vs age, 2 to 20 years)

Online Calc
http://www.medcalc.com/growth/

UK
http://www.rcpch.ac.uk/child-health/research-projects/uk-who-growth-charts/uk-who-growth-charts 
*/



function display_growth_chart(patient, el) {

  // Growth chart baselines
  // Based on Haiti child growth chart from age 0 to 5 years (60 months)

  // Needs meta data to lay out which lines should exist and what their names are
  var haitiMeta = {
    "lines": [{
      "tag":"normal",
      "name":"Normal"
    }, {
      "tag":"mal",
      "name":"Malnourished"
    }, {
      "tag":"smal",
      "name":"Severely Malnourished"
    }]
  };
  var haitiData = [{"month":0,"normal":3.4,"mal":2.4,"smal":2},{"month":6,"normal":8,"mal":5.5,"smal":4.6},{"month":12,"normal":10.3,"mal":7.8,"smal":6.5},{"month":18,"normal":11.5,"mal":8.7,"smal":7.3},{"month":24,"normal":12.5,"mal":9.6,"smal":8.1},{"month":30,"normal":13.7,"mal":10.5,"smal":9},{"month":36,"normal":14.8,"mal":11.4,"smal":9.8},{"month":42,"normal":15.7,"mal":12,"smal":10.3},{"month":48,"normal":16.7,"mal":12.8,"smal":10.9},{"month":54,"normal":17.8,"mal":13.5,"smal":11.5},{"month":60,"normal":18.7,"mal":14.2,"smal":12}];

  var haiti = {
    "meta" : haitiMeta,
    "data" : haitiData
  };

  // Create the lines, using meta data (to tag+name the lines, specify measurement type) and data (containing age vs measurement)
  // combine into one json ...
  // json = {"meta" : { ... }, "data" : variable_name_for_data };
  function createLines(json) {
    var meta = json.meta;
    var data = json.data;

    console.log("createLines()");
    console.log(meta);
    var newLines = [];

    for (var i=0; i < meta.lines.length; i++) {
      // Get the tag
      var lineTag = meta.lines[i].tag;
      console.log(lineTag);

      newLines.push([]);
      // Generate the list of data (month, weight)
      for (var j=0; j < data.length; j++) {
        newLines[i].push([data[j]["month"], data[j][lineTag]]);
      }
      console.log(newLines);
    }
    return newLines;
  }

  var data = createLines(haiti);

  // Boundaries for graph, based on growth chart bounds
  var yMax = 20; // weight, in kg
  var xMax = 60; // time, in # of months

  // Graph formatting, in pixels
  var width = 625;
  var height = 350;
  var padding = 50;

  // Graph scale; domain and range
  var xScale = d3.scale.linear()
    .domain([0, xMax])
    // .range([0, width]);
    .range([padding, width - padding]);

  var yScale = d3.scale.linear()
    .domain([0, yMax])
    // .range([height, 0]);
    .range([height - padding, padding]);

  // Line generating function
  var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d, i) {
    return xScale(d[0]);
  })
    .y(function(d) {
    return yScale(d[1]);
  });

  // Area under the curve, for highlighting regions
  var area = d3.svg.area()
    .interpolate("basis")
    .x(line.x())
    .y1(line.y())
    .y0(yScale(0));

  var svg = d3.select(el).append("svg")
    .attr("width", width*2)
    .attr("height", height);

  // Baseline growth curves
  var lines = svg.selectAll("g")
    .data(data)
    .enter();

  lines.append("path")
    .attr("class", "area")
    .attr("d", area);

  lines.append("path")
    .attr("class", "line")
    .attr("d", line);

  // svg.append("text")
  //   .attr("text-anchor", "middle")
  //   .attr("transform", "translate("+ (width/2) +","+(height-(padding/3))+")")  
  //   .text("Age (months)");

  // Patient's data

  // Add line for the patient's growth
  var linesP = svg.selectAll("pG")
    .data([patient])
    .attr("class", "pG")
    .enter();
  linesP.append("path")
    .attr("class", "pLine")
    .attr("d", line);

  // Dots at each data point
  var dots = svg.selectAll("dot")
    .data(patient)
    .enter()
    .append("circle")
    .attr("class", "dot")
  // .on("mouseover", mouseoverDot)
  .call(dotHandler(function(d, i) {
    // console.log('helper', el);
    return tooltipText(d);
  }))
  // .on("mouseout", mouseoutDot)
  .attr("cx", function(d, i) {
    return xScale(d[0]);
  })
    .attr("cy", function(d, i) {
    return yScale(d[1]);
  })
  //   .attr("r", function(d) {
  //   return 1;
  // })
    .attr("r", 4);

  // Add axes

  // x-axis
  var xAxis = d3.svg.axis();
  xAxis.scale(d3.scale.linear()
    .domain([0, xMax])
    .range([0, width - padding*2]));
  xAxis.orient("bottom")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + "," + (height - padding) + ")")
    .call(xAxis);

  // y-axis
  var yAxis = d3.svg.axis()
    .scale(d3.scale.linear()
    .domain([0, yMax])
    .range([height-padding, 0]));

  yAxis.orient("left")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
          .attr("transform", function(d) {
             return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
         });

  // Axes text
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate("+ (padding/3) +","+(height-padding)/2+")rotate(-90)")
    .text("Weight (kg)");

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate("+ (width/2) +","+(height-(padding/3))+")")
    .text("Age (months)");

  // Extremity labels (Normal, Malnourished, and Severely Malnourished)
  svg.append("text")
    .attr("class","line-label")
    .attr("transform", "translate("+ (width-padding+5) +","+(100)+")")
    .text("Normal");

  svg.append("text")
    .attr("class","line-label")
    .attr("transform", "translate("+ (width-padding+5) +","+(140)+")")
    .text("Malnourished");

  svg.append("text")
    .attr("class","line-label")
    .attr("transform", "translate("+ (width-padding+5) +","+(175)+")")
    .text("Severely Malnourished");

  var tooltipEl = svg.append("text")
    // .attr("class","tooltip")
    .attr("transform", "translate("+ (padding*2) +","+(padding)+")")
    .style("font-size","14px")
    .text("");

  function dotHandler(accessor) {
    return function(selection) {
      selection.on("mouseover", function(d, i) {
        // Select current dot, unselect others
        d3.selectAll("circle.dotSelected").attr("class", "dot");
        d3.select(this).attr("class", "dotSelected");

        // Add text using the accessor function
        var tooltipText = accessor(d, i) || '';
        tooltipEl.text(tooltipText);
      });
    };
  }

  function tooltipText(d) {
    var age_in_months = parseFloat(d[0]);
    var weight_in_kg = parseFloat(d[1]).toFixed(1);
    var textAge = 'Age: ' + getAgeText(age_in_months);
    var textweight = 'Weight: ' + weight_in_kg + 'kg';
    var text = textAge + '; ' + textweight;

    return text;
  }

  // @param months - age in months (float)
  // @return - age (<years>y, <months>m) (string)

  function getAgeText(months){
    var y = Math.floor(months / 12);
    var m = months - (y * 12);
    m = m.toFixed(1);

    if (y > 0) {
      return y + 'y, ' + m + 'm';
    } else {
      return m + 'm';
    }
  }
}