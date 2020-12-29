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
*/

// Tooltip code from:
// http://rveciana.github.com/geoexamples/d3js/d3js_electoral_map/tooltipCode.html#
// http://rveciana.github.com/geoexamples/?page=d3js/d3js_electoral_map/simpleTooltipCode.html
// http://bl.ocks.org/biovisualize/2973775
d3.helper = {};

d3.helper.tooltip = function(accessor) {
  return function(selection) {
    var tooltipDiv;
    var bodyNode = d3.select('body').node();
    selection.on("mouseover", function(d, i) {
      // Select current dot, unselect others
      d3.selectAll("circle.dotSelected").attr("class", "dot");
      d3.select(this).attr("class", "dotSelected");

      // Clean up lost tooltips
      d3.select('body').selectAll('div.tooltip').remove();
      // Append tooltip
      tooltipDiv = d3.select('body').append('div').attr('class', 'tooltip');

      tooltipDiv.style('left', (50) + 'px')
        .style('top', (50) + 'px')
        .style('position', 'absolute')
        .style('z-index', 1001);

      // Add text using the accessor function
      var tooltipText = accessor(d, i) || '';
      // Crop text arbitrarily
      tooltipDiv
        .style('width', function(d, i) {
          return (tooltipText.length > 80) ? '300px' : null;
        })
        .html(tooltipText);
    })
      .on('mousemove', function(d, i) {
      var tooltipText = accessor(d, i) || '';
      tooltipDiv.html(tooltipText);
    })
    //   .on("mouseout", function(d, i) {
    //   // Remove tooltip
    //   tooltipDiv.remove();
    // })
    ;
  };
};

var svg;

function display_growth_chart(patient, el) {

  // Growth chart baselines
  // Based on Haiti child growth chart from age 0 to 5 years (60 months)
  var normal = [
    [0, 3.4],
    [6, 8],
    [12, 10.3],
    [18, 11.5],
    [24, 12.5],
    [30, 13.7],
    [36, 14.8],
    [42, 15.7],
    [48, 16.7],
    [54, 17.8],
    [60, 18.7]
  ];
  var malnourished = [
    [0, 2.4],
    [6, 5.5],
    [12, 7.8],
    [18, 8.7],
    [24, 9.6],
    [30, 10.5],
    [36, 11.4],
    [42, 12],
    [48, 12.8],
    [54, 13.5],
    [60, 14.2]
  ];
  var severely_malnourished = [
    [0, 2],
    [6, 4.6],
    [12, 6.5],
    [18, 7.3],
    [24, 8.1],
    [30, 9],
    [36, 9.8],
    [42, 10.3],
    [48, 10.9],
    [54, 11.5],
    [60, 12]
  ];

  var data = [
  normal,
  malnourished,
  severely_malnourished];

  // Boundaries for graph, based on growth chart bounds
  var yMax = 20; // weight, in kg
  var xMax = 60; // time, in # of months

  // Graph formatting, in pixels
  var WIDTH = 625;
  var HEIGHT = 350;
  var PADDING = 1;

  // Graph scale; domain and range
  var xScale = d3.scale.linear()
    .domain([0, xMax])
    .range([0, WIDTH]);

  var yScale = d3.scale.linear()
    .domain([0, yMax])
    .range([HEIGHT, 0]);

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

  svg = d3.select(el).append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

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
  .call(d3.helper.tooltip(function(d, i) {
    return tooltipText(d);
  }))
  // .on("mouseout", mouseoutDot)
  .attr("cx", function(d, i) {
    return xScale(d[0]);
  })
    .attr("cy", function(d, i) {
    return yScale(d[1]);
  })
    .attr("r", function(d) {
    return 4;
  });

  // Add axes

  // x-axis
  var xAxis = d3.svg.axis();
  xAxis.scale(d3.scale.linear()
    .domain([0, xMax])
    .range([0, WIDTH]));
  xAxis.orient("top")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (HEIGHT - PADDING) + ")")
    .call(xAxis);

  // y-axis
  var yAxis = d3.svg.axis()
    .scale(d3.scale.linear()
    .domain([0, yMax])
    .range([HEIGHT, 0]));

  yAxis.orient("right")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .call(yAxis);

  // function mouseoverDot(d, i) {
  //   // Update text
  //   var age_in_months = d[0];
  //   var weight_in_kg = d[1].toFixed(1);
  //   var text = 'Age: ' + getAgeText(age_in_months) + '; ' + 'Weight: ' + weight_in_kg + 'kg';
  //   dotText.text(text);

  //   // Unselect other dots
  //   dots.attr("class", "dot");

  //   // Highlight the dot 
  //   d3.select(this).attr("class", "dotSelected");
  // }

  function tooltipText(d) {
    var age_in_months = d[0];
    var weight_in_kg = d[1].toFixed(1);
    var textAge = 'Age: ' + getAgeText(age_in_months);
    var textWeight = 'Weight: ' + weight_in_kg + 'kg';
    var text = textAge + '<br />' + textWeight;

    return "<b>" + text + "</b>";
  }

  // @param months - age in months (float)
  // @return - age (<years>y, <months>m) (string)

  function getAgeText(months) {
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