function display_growth_chart(patient, el, chartType) {

  // Create the background lines
  //
  // json includes "meta" (to tag+name the lines, specify measurement type)
  //  and "data" (containing age in months vs measurement)
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
      // Generate the list of data (month, measurement)
      for (var j=0; j < data.length; j++) {
        // Assumes data has a "Month" tag in each element
        newLines[i].push([data[j]["Month"], data[j][lineTag]]);
      }
      console.log(newLines);
    }
    return newLines;
  }

  // Get data to build chart's 'background lines' depending on chartType
  var data;
  var metaData;
  var chartTypes = ['haiti', '0_to_5', '2_to_20' ];
  switch(chartType) {
    case 'haiti':
      var dataHaiti = createLines(haiti);
      data = dataHaiti;
      metaData = haiti.meta;
      break;
    case '0_to_5':
      var data_0_to_5 = createLines(wfa_0_to_5);
      data = data_0_to_5;
      metaData = wfa_0_to_5.meta;
      break;
    case '2_to_20':
      var data_2_to_20 = createLines(wfa_boys_2_20);
      data = data_2_to_20;
      metaData = wfa_boys_2_20.meta;
      break;
    default:
      console.log('error choosing chart type');
      console.log('valid options are: ', chartTypes);
      return;
  }

  console.log('meta', metaData);

  // Save the last tuple so that I can label it
  lastTuples = [];

  // Boundaries for graph, based on growth chart bounds
  var yMax = 0; // weight, in kg
  var xMax = 0; // age, in months
  for (var i = 0; i < data.length; i++) {
    var lineData = data[i];
    var lastTuple = lineData[lineData.length-1];
    lastTuples.push(lastTuple);
    xMax = Math.max(lastTuple[0], xMax);
    yMax = Math.max(lastTuple[1], yMax);
  }

  // Graph formatting, in pixels
  var width = 800;
  var height = 450;

  var padding = 50;

  // Graph scale; domain and range
  var xScale = d3.scale.linear()
    .domain([0, xMax])
    .range([padding, width - padding]);

  var yScale = d3.scale.linear()
    .domain([0, yMax])
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

  // clear exiting growth chart svg .. allows to reset graph with new background
  d3.select(el).select(".growth_chart_main_svg").remove();

  var svg = d3.select(el).append("svg")
    .attr("width", width*2)
    .attr("height", height)
    .attr("class", "growth_chart_main_svg");

  // Baseline growth curves
  var lines = svg.selectAll(".lines")
    .data(data)
    .enter();

  lines.append("path")
    .attr("class", "area")
    .attr("d", area);

  lines.append("path")
    .attr("class", "line")
    .attr("d", line);

  var linesToAxis = svg.append("g");

  // Patient's data

  // Add line for the patient's growth
  var linesP = svg.selectAll("pG")
    .data([patient])
    .attr("class", "pG")
    .enter();
  linesP.append("path")
    .attr("class", "pLine")
    .attr("d", line.interpolate("")); // interpolate("") removes the smoothing

  // Dots at each data point
  var dots = svg.selectAll(".dot")
    .data(patient)
    .enter()
    .append("circle")
    .attr("class", "dot")
  .call(dotHandler(function(d, i) {
    return tooltipText(d);
  }))
  // .on("mouseout", mouseoutDot)
  .attr("cx", function(d, i) {
    return xScale(d[0]);
  })
    .attr("cy", function(d, i) {
    return yScale(d[1]);
  })
    .attr("r", 3);

  // Add axes
  // TODO: Improve axes to have years and months, like http://www.who.int/childgrowth/standards/cht_wfa_boys_p_0_5.pdf

  // x-axis
  var xAxis = d3.svg.axis();
  xAxis.scale(xScale);
  xAxis.orient("bottom")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + 0 + "," + (height - padding) + ")")
    .call(xAxis);

  // y-axis
  var yAxis = d3.svg.axis();
  yAxis.scale(yScale);
  yAxis.orient("left")
    .ticks(10);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  // svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
  //         .attr("transform", function(d) {
  //            return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
  //        });

  // Axes text
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate("+ (padding/3) +","+(height-padding)/2+")rotate(-90)")
    .text("Weight (kg)");

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate("+ (width/2) +","+(height-(padding/3))+")")
    .text("Age (months)");

  // Line labels (Normal, Malnourished, and Severely Malnourished)
  for (var i=0; i<metaData.lines.length; i++) {
    xOffset = xScale(lastTuples[i][0]);
    xOffset += 2; // a little space better graph and text
    yOffset = yScale(lastTuples[i][1]);
    yOffset += 4; // center text on line

    svg.append("text")
      .attr("class","line-label")
      .attr("transform", "translate("+ xOffset +","+ yOffset +")")
      .text(metaData.lines[i].name);
  }

  var tooltipEl = svg.append("text")
    // .attr("class","tooltip")
    .attr("transform", "translate("+ (padding*2) +","+(padding)+")")
    .style("font-size","14px")
    // .style("background-color","gray")
    .text("(Move mouse over a data point to see details)");

  // Button to toggle chart type
  //
  var rectButton = svg.append("rect")
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("x", padding*10-3)
    .attr("y", padding-14-3)
    .attr("width", 101)  // 106
    .attr("height", 25)
    .style("stroke","gray")
    .style("fill", d3.scale.category20c())
    .on("click", function() {
      changeGraphType();
    });

  var rectButtonText = svg.append("text")
    .attr("transform", "translate("+ (padding*10) +","+(padding)+")")
    .style("font-size","14px")
    .style("fill","white")
    .text("Change Graph")
    .on("click", function() {
      changeGraphType();
    });

  function changeGraphType() {
    var whichChart = chartTypes.indexOf(chartType);
    whichChart += 1;
    whichChart %= chartTypes.length;

    var growthChart = display_growth_chart(patient, el , chartTypes[whichChart]);
  }

  function dotHandler(accessor) {
    return function(selection) {
      selection.on("mouseover", function(d, i) {
        // Select current dot, unselect others
        d3.selectAll("circle.dotSelected").attr("class", "dot");
        d3.select(this).attr("class", "dotSelected");

        // Add text using the accessor function
        var tooltipText = accessor(d, i) || '';
        tooltipEl.text(tooltipText);

        // create a rectangle that stretches to the axes, so it's easy to see if the axis is right..
        // Remove old
        linesToAxis.selectAll(".rect-to-axis")
          .data([])
        .exit().remove();

        // Add new
        var linesToAxisWidth = xScale(d[0]) - padding;
        var linesToAxisHeight = height - yScale(d[1]) - padding;
        var halfRectLength = linesToAxisWidth + linesToAxisHeight;
        halfRect = halfRectLength.toString();

        // Draw top and right sides of rectangle as dotted. Hide bottom and left sides
        var dottedSegmentLength = 3;
        var dottedSegments = Math.floor(halfRectLength / dottedSegmentLength);
        var nonDottedLength = halfRectLength*2; // + (dottedSegments % dottedSegmentLength);

        var dashArrayStroke = [];
        for (var i=0; i < dottedSegments; i++) {
          dashArrayStroke.push(dottedSegmentLength);
        }
        // if even number, add extra filler segment to make sure 2nd half of rectangle is hidden
        if ( (dottedSegments % 2) === 0) {
          extraSegmentLength = halfRectLength - (dottedSegments*dottedSegmentLength);
          dashArrayStroke.push(extraSegmentLength);
          dashArrayStroke.push(nonDottedLength);
        } else {
          // extraSegmentLength = halfRectLength - (dottedSegments*dottedSegmentLength);
          dashArrayStroke.push(nonDottedLength);
        }



        linesToAxis.selectAll(".rect-to-axis")
          .data([d])
         .enter().append("rect")
          .attr("class", "rect-to-axis")
          .style("stroke-dasharray",
            dashArrayStroke.toString()
          )
          .attr("x", padding)
          .attr("y", yScale(d[1]))
          .attr("width", linesToAxisWidth)
          .attr("height", linesToAxisHeight);

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

  // callable methods
  return this;
}

//////// DATA //////////

var wfa_boys_2_20_meta = {
    "lines": [{
      "tag":"SD0",
      "name":"50th",
      // "class":"SD0"  // TODO: Add color based on line class, e.g.
      // http://www.who.int/childgrowth/standards/cht_wfa_boys_p_0_5.pdf
    }, {
      "tag":"SD1neg",
      "name":"15th"
    }, {
      "tag":"SD2neg",
      "name":"2nd"
    }, {
      "tag":"SD2",
      "name":"98th"
    }, {
      "tag":"SD1",
      "name":"85th"
    }]
};

// Copy the array, since it's an object reference
var wfa_0_to_5_meta = {};
wfa_0_to_5_meta.lines = wfa_boys_2_20_meta.lines.slice(0);

wfa_0_to_5_meta.lines.push(
  {
    "tag":"SD3neg",
    "name":"0.1th"
  }
);
wfa_0_to_5_meta.lines.push(
  {
    "tag":"SD3",
    "name":"99.9th"
  }
);

var wfa_0_to_5_data = [{
    "Month":"0",
    "L":"0.3487",
    "M":"3.3464",
    "S":"0.14602",
    "SD3neg":"2.1",
    "SD2neg":"2.5",
    "SD1neg":"2.9",
    "SD0":"3.3",
    "SD1":"3.9",
    "SD2":"4.4",
    "SD3":"5"
  },
  {
    "Month":"1",
    "L":"0.2297",
    "M":"4.4709",
    "S":"0.13395",
    "SD3neg":"2.9",
    "SD2neg":"3.4",
    "SD1neg":"3.9",
    "SD0":"4.5",
    "SD1":"5.1",
    "SD2":"5.8",
    "SD3":"6.6"
  },
  {
    "Month":"2",
    "L":"0.197",
    "M":"5.5675",
    "S":"0.12385",
    "SD3neg":"3.8",
    "SD2neg":"4.3",
    "SD1neg":"4.9",
    "SD0":"5.6",
    "SD1":"6.3",
    "SD2":"7.1",
    "SD3":"8"
  },
  {
    "Month":"3",
    "L":"0.1738",
    "M":"6.3762",
    "S":"0.11727",
    "SD3neg":"4.4",
    "SD2neg":"5",
    "SD1neg":"5.7",
    "SD0":"6.4",
    "SD1":"7.2",
    "SD2":"8",
    "SD3":"9"
  },
  {
    "Month":"4",
    "L":"0.1553",
    "M":"7.0023",
    "S":"0.11316",
    "SD3neg":"4.9",
    "SD2neg":"5.6",
    "SD1neg":"6.2",
    "SD0":"7",
    "SD1":"7.8",
    "SD2":"8.7",
    "SD3":"9.7"
  },
  {
    "Month":"5",
    "L":"0.1395",
    "M":"7.5105",
    "S":"0.1108",
    "SD3neg":"5.3",
    "SD2neg":"6",
    "SD1neg":"6.7",
    "SD0":"7.5",
    "SD1":"8.4",
    "SD2":"9.3",
    "SD3":"10.4"
  },
  {
    "Month":"6",
    "L":"0.1257",
    "M":"7.934",
    "S":"0.10958",
    "SD3neg":"5.7",
    "SD2neg":"6.4",
    "SD1neg":"7.1",
    "SD0":"7.9",
    "SD1":"8.8",
    "SD2":"9.8",
    "SD3":"10.9"
  },
  {
    "Month":"7",
    "L":"0.1134",
    "M":"8.297",
    "S":"0.10902",
    "SD3neg":"5.9",
    "SD2neg":"6.7",
    "SD1neg":"7.4",
    "SD0":"8.3",
    "SD1":"9.2",
    "SD2":"10.3",
    "SD3":"11.4"
  },
  {
    "Month":"8",
    "L":"0.1021",
    "M":"8.6151",
    "S":"0.10882",
    "SD3neg":"6.2",
    "SD2neg":"6.9",
    "SD1neg":"7.7",
    "SD0":"8.6",
    "SD1":"9.6",
    "SD2":"10.7",
    "SD3":"11.9"
  },
  {
    "Month":"9",
    "L":"0.0917",
    "M":"8.9014",
    "S":"0.10881",
    "SD3neg":"6.4",
    "SD2neg":"7.1",
    "SD1neg":"8",
    "SD0":"8.9",
    "SD1":"9.9",
    "SD2":"11",
    "SD3":"12.3"
  },
  {
    "Month":"10",
    "L":"0.082",
    "M":"9.1649",
    "S":"0.10891",
    "SD3neg":"6.6",
    "SD2neg":"7.4",
    "SD1neg":"8.2",
    "SD0":"9.2",
    "SD1":"10.2",
    "SD2":"11.4",
    "SD3":"12.7"
  },
  {
    "Month":"11",
    "L":"0.073",
    "M":"9.4122",
    "S":"0.10906",
    "SD3neg":"6.8",
    "SD2neg":"7.6",
    "SD1neg":"8.4",
    "SD0":"9.4",
    "SD1":"10.5",
    "SD2":"11.7",
    "SD3":"13"
  },
  {
    "Month":"12",
    "L":"0.0644",
    "M":"9.6479",
    "S":"0.10925",
    "SD3neg":"6.9",
    "SD2neg":"7.7",
    "SD1neg":"8.6",
    "SD0":"9.6",
    "SD1":"10.8",
    "SD2":"12",
    "SD3":"13.3"
  },
  {
    "Month":"13",
    "L":"0.0563",
    "M":"9.8749",
    "S":"0.10949",
    "SD3neg":"7.1",
    "SD2neg":"7.9",
    "SD1neg":"8.8",
    "SD0":"9.9",
    "SD1":"11",
    "SD2":"12.3",
    "SD3":"13.7"
  },
  {
    "Month":"14",
    "L":"0.0487",
    "M":"10.0953",
    "S":"0.10976",
    "SD3neg":"7.2",
    "SD2neg":"8.1",
    "SD1neg":"9",
    "SD0":"10.1",
    "SD1":"11.3",
    "SD2":"12.6",
    "SD3":"14"
  },
  {
    "Month":"15",
    "L":"0.0413",
    "M":"10.3108",
    "S":"0.11007",
    "SD3neg":"7.4",
    "SD2neg":"8.3",
    "SD1neg":"9.2",
    "SD0":"10.3",
    "SD1":"11.5",
    "SD2":"12.8",
    "SD3":"14.3"
  },
  {
    "Month":"16",
    "L":"0.0343",
    "M":"10.5228",
    "S":"0.11041",
    "SD3neg":"7.5",
    "SD2neg":"8.4",
    "SD1neg":"9.4",
    "SD0":"10.5",
    "SD1":"11.7",
    "SD2":"13.1",
    "SD3":"14.6"
  },
  {
    "Month":"17",
    "L":"0.0275",
    "M":"10.7319",
    "S":"0.11079",
    "SD3neg":"7.7",
    "SD2neg":"8.6",
    "SD1neg":"9.6",
    "SD0":"10.7",
    "SD1":"12",
    "SD2":"13.4",
    "SD3":"14.9"
  },
  {
    "Month":"18",
    "L":"0.0211",
    "M":"10.9385",
    "S":"0.11119",
    "SD3neg":"7.8",
    "SD2neg":"8.8",
    "SD1neg":"9.8",
    "SD0":"10.9",
    "SD1":"12.2",
    "SD2":"13.7",
    "SD3":"15.3"
  },
  {
    "Month":"19",
    "L":"0.0148",
    "M":"11.143",
    "S":"0.11164",
    "SD3neg":"8",
    "SD2neg":"8.9",
    "SD1neg":"10",
    "SD0":"11.1",
    "SD1":"12.5",
    "SD2":"13.9",
    "SD3":"15.6"
  },
  {
    "Month":"20",
    "L":"0.0087",
    "M":"11.3462",
    "S":"0.11211",
    "SD3neg":"8.1",
    "SD2neg":"9.1",
    "SD1neg":"10.1",
    "SD0":"11.3",
    "SD1":"12.7",
    "SD2":"14.2",
    "SD3":"15.9"
  },
  {
    "Month":"21",
    "L":"0.0029",
    "M":"11.5486",
    "S":"0.11261",
    "SD3neg":"8.2",
    "SD2neg":"9.2",
    "SD1neg":"10.3",
    "SD0":"11.5",
    "SD1":"12.9",
    "SD2":"14.5",
    "SD3":"16.2"
  },
  {
    "Month":"22",
    "L":"-0.0028",
    "M":"11.7504",
    "S":"0.11314",
    "SD3neg":"8.4",
    "SD2neg":"9.4",
    "SD1neg":"10.5",
    "SD0":"11.8",
    "SD1":"13.2",
    "SD2":"14.7",
    "SD3":"16.5"
  },
  {
    "Month":"23",
    "L":"-0.0083",
    "M":"11.9514",
    "S":"0.11369",
    "SD3neg":"8.5",
    "SD2neg":"9.5",
    "SD1neg":"10.7",
    "SD0":"12",
    "SD1":"13.4",
    "SD2":"15",
    "SD3":"16.8"
  },
  {
    "Month":"24",
    "L":"-0.0137",
    "M":"12.1515",
    "S":"0.11426",
    "SD3neg":"8.6",
    "SD2neg":"9.7",
    "SD1neg":"10.8",
    "SD0":"12.2",
    "SD1":"13.6",
    "SD2":"15.3",
    "SD3":"17.1"
  },
  {
    "Month":"25",
    "L":"-0.0189",
    "M":"12.3502",
    "S":"0.11485",
    "SD3neg":"8.8",
    "SD2neg":"9.8",
    "SD1neg":"11",
    "SD0":"12.4",
    "SD1":"13.9",
    "SD2":"15.5",
    "SD3":"17.5"
  },
  {
    "Month":"26",
    "L":"-0.024",
    "M":"12.5466",
    "S":"0.11544",
    "SD3neg":"8.9",
    "SD2neg":"10",
    "SD1neg":"11.2",
    "SD0":"12.5",
    "SD1":"14.1",
    "SD2":"15.8",
    "SD3":"17.8"
  },
  {
    "Month":"27",
    "L":"-0.0289",
    "M":"12.7401",
    "S":"0.11604",
    "SD3neg":"9",
    "SD2neg":"10.1",
    "SD1neg":"11.3",
    "SD0":"12.7",
    "SD1":"14.3",
    "SD2":"16.1",
    "SD3":"18.1"
  },
  {
    "Month":"28",
    "L":"-0.0337",
    "M":"12.9303",
    "S":"0.11664",
    "SD3neg":"9.1",
    "SD2neg":"10.2",
    "SD1neg":"11.5",
    "SD0":"12.9",
    "SD1":"14.5",
    "SD2":"16.3",
    "SD3":"18.4"
  },
  {
    "Month":"29",
    "L":"-0.0385",
    "M":"13.1169",
    "S":"0.11723",
    "SD3neg":"9.2",
    "SD2neg":"10.4",
    "SD1neg":"11.7",
    "SD0":"13.1",
    "SD1":"14.8",
    "SD2":"16.6",
    "SD3":"18.7"
  },
  {
    "Month":"30",
    "L":"-0.0431",
    "M":"13.3",
    "S":"0.11781",
    "SD3neg":"9.4",
    "SD2neg":"10.5",
    "SD1neg":"11.8",
    "SD0":"13.3",
    "SD1":"15",
    "SD2":"16.9",
    "SD3":"19"
  },
  {
    "Month":"31",
    "L":"-0.0476",
    "M":"13.4798",
    "S":"0.11839",
    "SD3neg":"9.5",
    "SD2neg":"10.7",
    "SD1neg":"12",
    "SD0":"13.5",
    "SD1":"15.2",
    "SD2":"17.1",
    "SD3":"19.3"
  },
  {
    "Month":"32",
    "L":"-0.052",
    "M":"13.6567",
    "S":"0.11896",
    "SD3neg":"9.6",
    "SD2neg":"10.8",
    "SD1neg":"12.1",
    "SD0":"13.7",
    "SD1":"15.4",
    "SD2":"17.4",
    "SD3":"19.6"
  },
  {
    "Month":"33",
    "L":"-0.0564",
    "M":"13.8309",
    "S":"0.11953",
    "SD3neg":"9.7",
    "SD2neg":"10.9",
    "SD1neg":"12.3",
    "SD0":"13.8",
    "SD1":"15.6",
    "SD2":"17.6",
    "SD3":"19.9"
  },
  {
    "Month":"34",
    "L":"-0.0606",
    "M":"14.0031",
    "S":"0.12008",
    "SD3neg":"9.8",
    "SD2neg":"11",
    "SD1neg":"12.4",
    "SD0":"14",
    "SD1":"15.8",
    "SD2":"17.8",
    "SD3":"20.2"
  },
  {
    "Month":"35",
    "L":"-0.0648",
    "M":"14.1736",
    "S":"0.12062",
    "SD3neg":"9.9",
    "SD2neg":"11.2",
    "SD1neg":"12.6",
    "SD0":"14.2",
    "SD1":"16",
    "SD2":"18.1",
    "SD3":"20.4"
  },
  {
    "Month":"36",
    "L":"-0.0689",
    "M":"14.3429",
    "S":"0.12116",
    "SD3neg":"10",
    "SD2neg":"11.3",
    "SD1neg":"12.7",
    "SD0":"14.3",
    "SD1":"16.2",
    "SD2":"18.3",
    "SD3":"20.7"
  },
  {
    "Month":"37",
    "L":"-0.0729",
    "M":"14.5113",
    "S":"0.12168",
    "SD3neg":"10.1",
    "SD2neg":"11.4",
    "SD1neg":"12.9",
    "SD0":"14.5",
    "SD1":"16.4",
    "SD2":"18.6",
    "SD3":"21"
  },
  {
    "Month":"38",
    "L":"-0.0769",
    "M":"14.6791",
    "S":"0.1222",
    "SD3neg":"10.2",
    "SD2neg":"11.5",
    "SD1neg":"13",
    "SD0":"14.7",
    "SD1":"16.6",
    "SD2":"18.8",
    "SD3":"21.3"
  },
  {
    "Month":"39",
    "L":"-0.0808",
    "M":"14.8466",
    "S":"0.12271",
    "SD3neg":"10.3",
    "SD2neg":"11.6",
    "SD1neg":"13.1",
    "SD0":"14.8",
    "SD1":"16.8",
    "SD2":"19",
    "SD3":"21.6"
  },
  {
    "Month":"40",
    "L":"-0.0846",
    "M":"15.014",
    "S":"0.12322",
    "SD3neg":"10.4",
    "SD2neg":"11.8",
    "SD1neg":"13.3",
    "SD0":"15",
    "SD1":"17",
    "SD2":"19.3",
    "SD3":"21.9"
  },
  {
    "Month":"41",
    "L":"-0.0883",
    "M":"15.1813",
    "S":"0.12373",
    "SD3neg":"10.5",
    "SD2neg":"11.9",
    "SD1neg":"13.4",
    "SD0":"15.2",
    "SD1":"17.2",
    "SD2":"19.5",
    "SD3":"22.1"
  },
  {
    "Month":"42",
    "L":"-0.092",
    "M":"15.3486",
    "S":"0.12425",
    "SD3neg":"10.6",
    "SD2neg":"12",
    "SD1neg":"13.6",
    "SD0":"15.3",
    "SD1":"17.4",
    "SD2":"19.7",
    "SD3":"22.4"
  },
  {
    "Month":"43",
    "L":"-0.0957",
    "M":"15.5158",
    "S":"0.12478",
    "SD3neg":"10.7",
    "SD2neg":"12.1",
    "SD1neg":"13.7",
    "SD0":"15.5",
    "SD1":"17.6",
    "SD2":"20",
    "SD3":"22.7"
  },
  {
    "Month":"44",
    "L":"-0.0993",
    "M":"15.6828",
    "S":"0.12531",
    "SD3neg":"10.8",
    "SD2neg":"12.2",
    "SD1neg":"13.8",
    "SD0":"15.7",
    "SD1":"17.8",
    "SD2":"20.2",
    "SD3":"23"
  },
  {
    "Month":"45",
    "L":"-0.1028",
    "M":"15.8497",
    "S":"0.12586",
    "SD3neg":"10.9",
    "SD2neg":"12.4",
    "SD1neg":"14",
    "SD0":"15.8",
    "SD1":"18",
    "SD2":"20.5",
    "SD3":"23.3"
  },
  {
    "Month":"46",
    "L":"-0.1063",
    "M":"16.0163",
    "S":"0.12643",
    "SD3neg":"11",
    "SD2neg":"12.5",
    "SD1neg":"14.1",
    "SD0":"16",
    "SD1":"18.2",
    "SD2":"20.7",
    "SD3":"23.6"
  },
  {
    "Month":"47",
    "L":"-0.1097",
    "M":"16.1827",
    "S":"0.127",
    "SD3neg":"11.1",
    "SD2neg":"12.6",
    "SD1neg":"14.3",
    "SD0":"16.2",
    "SD1":"18.4",
    "SD2":"20.9",
    "SD3":"23.9"
  },
  {
    "Month":"48",
    "L":"-0.1131",
    "M":"16.3489",
    "S":"0.12759",
    "SD3neg":"11.2",
    "SD2neg":"12.7",
    "SD1neg":"14.4",
    "SD0":"16.3",
    "SD1":"18.6",
    "SD2":"21.2",
    "SD3":"24.2"
  },
  {
    "Month":"49",
    "L":"-0.1165",
    "M":"16.515",
    "S":"0.12819",
    "SD3neg":"11.3",
    "SD2neg":"12.8",
    "SD1neg":"14.5",
    "SD0":"16.5",
    "SD1":"18.8",
    "SD2":"21.4",
    "SD3":"24.5"
  },
  {
    "Month":"50",
    "L":"-0.1198",
    "M":"16.6811",
    "S":"0.1288",
    "SD3neg":"11.4",
    "SD2neg":"12.9",
    "SD1neg":"14.7",
    "SD0":"16.7",
    "SD1":"19",
    "SD2":"21.7",
    "SD3":"24.8"
  },
  {
    "Month":"51",
    "L":"-0.123",
    "M":"16.8471",
    "S":"0.12943",
    "SD3neg":"11.5",
    "SD2neg":"13.1",
    "SD1neg":"14.8",
    "SD0":"16.8",
    "SD1":"19.2",
    "SD2":"21.9",
    "SD3":"25.1"
  },
  {
    "Month":"52",
    "L":"-0.1262",
    "M":"17.0132",
    "S":"0.13005",
    "SD3neg":"11.6",
    "SD2neg":"13.2",
    "SD1neg":"15",
    "SD0":"17",
    "SD1":"19.4",
    "SD2":"22.2",
    "SD3":"25.4"
  },
  {
    "Month":"53",
    "L":"-0.1294",
    "M":"17.1792",
    "S":"0.13069",
    "SD3neg":"11.7",
    "SD2neg":"13.3",
    "SD1neg":"15.1",
    "SD0":"17.2",
    "SD1":"19.6",
    "SD2":"22.4",
    "SD3":"25.7"
  },
  {
    "Month":"54",
    "L":"-0.1325",
    "M":"17.3452",
    "S":"0.13133",
    "SD3neg":"11.8",
    "SD2neg":"13.4",
    "SD1neg":"15.2",
    "SD0":"17.3",
    "SD1":"19.8",
    "SD2":"22.7",
    "SD3":"26"
  },
  {
    "Month":"55",
    "L":"-0.1356",
    "M":"17.5111",
    "S":"0.13197",
    "SD3neg":"11.9",
    "SD2neg":"13.5",
    "SD1neg":"15.4",
    "SD0":"17.5",
    "SD1":"20",
    "SD2":"22.9",
    "SD3":"26.3"
  },
  {
    "Month":"56",
    "L":"-0.1387",
    "M":"17.6768",
    "S":"0.13261",
    "SD3neg":"12",
    "SD2neg":"13.6",
    "SD1neg":"15.5",
    "SD0":"17.7",
    "SD1":"20.2",
    "SD2":"23.2",
    "SD3":"26.6"
  },
  {
    "Month":"57",
    "L":"-0.1417",
    "M":"17.8422",
    "S":"0.13325",
    "SD3neg":"12.1",
    "SD2neg":"13.7",
    "SD1neg":"15.6",
    "SD0":"17.8",
    "SD1":"20.4",
    "SD2":"23.4",
    "SD3":"26.9"
  },
  {
    "Month":"58",
    "L":"-0.1447",
    "M":"18.0073",
    "S":"0.13389",
    "SD3neg":"12.2",
    "SD2neg":"13.8",
    "SD1neg":"15.8",
    "SD0":"18",
    "SD1":"20.6",
    "SD2":"23.7",
    "SD3":"27.2"
  },
  {
    "Month":"59",
    "L":"-0.1477",
    "M":"18.1722",
    "S":"0.13453",
    "SD3neg":"12.3",
    "SD2neg":"14",
    "SD1neg":"15.9",
    "SD0":"18.2",
    "SD1":"20.8",
    "SD2":"23.9",
    "SD3":"27.6"
  },
  {
    "Month":"60",
    "L":"-0.1506",
    "M":"18.3366",
    "S":"0.13517",
    "SD3neg":"12.4",
    "SD2neg":"14.1",
    "SD1neg":"16",
    "SD0":"18.3",
    "SD1":"21",
    "SD2":"24.2",
    "SD3":"27.9"
  }
];

var wfa_0_to_5 = {
  "meta" : wfa_0_to_5_meta,
  "data" : wfa_0_to_5_data
};

var wfa_boys_2_20_zscores_data = [
    {
        "L": "-0.216501213",
        "M": "12.74154396",
        "Month": "24",
        "S": "0.108166006",
        "SD0": "12.74154396",
        "SD1": "14.21532326",
        "SD1neg": "11.44953268",
        "SD2": "15.90176135",
        "SD2neg": "10.3134521",
        "SD3": "16.00176135",
        "SD3neg": "10.2134521"
    },
    {
        "L": "-0.239790488",
        "M": "12.88102276",
        "Month": "25",
        "S": "0.108274706",
        "SD0": "12.88102276",
        "SD1": "14.37456354",
        "SD1neg": "11.57516824",
        "SD2": "16.08889691",
        "SD2neg": "10.42952456",
        "SD3": "16.18889691",
        "SD3neg": "10.32952456"
    },
    {
        "L": "-0.266315853",
        "M": "13.01842382",
        "Month": "26",
        "S": "0.108421025",
        "SD0": "13.01842382",
        "SD1": "14.53242968",
        "SD1neg": "11.6987306",
        "SD2": "16.27647418",
        "SD2neg": "10.54396441",
        "SD3": "16.37647418",
        "SD3neg": "10.44396441"
    },
    {
        "L": "-0.295754969",
        "M": "13.1544966",
        "Month": "27",
        "S": "0.10860477",
        "SD0": "13.1544966",
        "SD1": "14.6897637",
        "SD1neg": "11.82087007",
        "SD2": "16.46544629",
        "SD2neg": "10.65730807",
        "SD3": "16.56544629",
        "SD3neg": "10.55730807"
    },
    {
        "L": "-0.327729368",
        "M": "13.28989667",
        "Month": "28",
        "S": "0.108825681",
        "SD0": "13.28989667",
        "SD1": "14.84729727",
        "SD1neg": "11.94214963",
        "SD2": "16.65662718",
        "SD2neg": "10.77000434",
        "SD3": "16.75662718",
        "SD3neg": "10.67000434"
    },
    {
        "L": "-0.361817468",
        "M": "13.42519408",
        "Month": "29",
        "S": "0.109083424",
        "SD0": "13.42519408",
        "SD1": "15.00566147",
        "SD1neg": "12.06305318",
        "SD2": "16.85070318",
        "SD2neg": "10.88242417",
        "SD3": "16.95070318",
        "SD3neg": "10.78242417"
    },
    {
        "L": "-0.397568087",
        "M": "13.56088113",
        "Month": "30",
        "S": "0.109377581",
        "SD0": "13.56088113",
        "SD1": "15.16539607",
        "SD1neg": "12.18399316",
        "SD2": "17.0482441",
        "SD2neg": "10.99486974",
        "SD3": "17.1482441",
        "SD3neg": "10.89486974"
    },
    {
        "L": "-0.434520252",
        "M": "13.69737858",
        "Month": "31",
        "S": "0.109707646",
        "SD0": "13.69737858",
        "SD1": "15.32695739",
        "SD1neg": "12.30531738",
        "SD2": "17.24971501",
        "SD2neg": "11.10758393",
        "SD3": "17.34971501",
        "SD3neg": "11.00758393"
    },
    {
        "L": "-0.472188756",
        "M": "13.83504622",
        "Month": "32",
        "S": "0.110073084",
        "SD0": "13.83504622",
        "SD1": "15.49072918",
        "SD1neg": "12.42731659",
        "SD2": "17.45548063",
        "SD2neg": "11.22075384",
        "SD3": "17.55548063",
        "SD3neg": "11.12075384"
    },
    {
        "L": "-0.510116627",
        "M": "13.97418299",
        "Month": "33",
        "S": "0.110473254",
        "SD0": "13.97418299",
        "SD1": "15.65702584",
        "SD1neg": "12.55022887",
        "SD2": "17.66582304",
        "SD2neg": "11.33452423",
        "SD3": "17.76582304",
        "SD3neg": "11.23452423"
    },
    {
        "L": "-0.547885579",
        "M": "14.1150324",
        "Month": "34",
        "S": "0.1109074",
        "SD0": "14.1150324",
        "SD1": "15.8260991",
        "SD1neg": "12.67424532",
        "SD2": "17.88095109",
        "SD2neg": "11.44900426",
        "SD3": "17.98095109",
        "SD3neg": "11.34900426"
    },
    {
        "L": "-0.58507011",
        "M": "14.25779618",
        "Month": "35",
        "S": "0.111374787",
        "SD0": "14.25779618",
        "SD1": "15.99815038",
        "SD1neg": "12.79951734",
        "SD2": "18.10099711",
        "SD2neg": "11.56426435",
        "SD3": "18.20099711",
        "SD3neg": "11.46426435"
    },
    {
        "L": "-0.621319726",
        "M": "14.40262749",
        "Month": "36",
        "S": "0.111874514",
        "SD0": "14.40262749",
        "SD1": "16.17332831",
        "SD1neg": "12.92615853",
        "SD2": "18.32604136",
        "SD2neg": "11.68035377",
        "SD3": "18.42604136",
        "SD3neg": "11.58035377"
    },
    {
        "L": "-0.656295986",
        "M": "14.54964614",
        "Month": "37",
        "S": "0.112405687",
        "SD0": "14.54964614",
        "SD1": "16.35174184",
        "SD1neg": "13.05425183",
        "SD2": "18.55610445",
        "SD2neg": "11.79729403",
        "SD3": "18.65610445",
        "SD3neg": "11.69729403"
    },
    {
        "L": "-0.689735029",
        "M": "14.69893326",
        "Month": "38",
        "S": "0.112967254",
        "SD0": "14.69893326",
        "SD1": "16.53345829",
        "SD1neg": "13.18385132",
        "SD2": "18.79116819",
        "SD2neg": "11.91509302",
        "SD3": "18.89116819",
        "SD3neg": "11.81509302"
    },
    {
        "L": "-0.721410388",
        "M": "14.85054151",
        "Month": "39",
        "S": "0.11355811",
        "SD0": "14.85054151",
        "SD1": "16.71851248",
        "SD1neg": "13.31498759",
        "SD2": "19.03117333",
        "SD2neg": "12.03374211",
        "SD3": "19.13117333",
        "SD3neg": "11.93374211"
    },
    {
        "L": "-0.751175223",
        "M": "15.00449143",
        "Month": "40",
        "S": "0.114176956",
        "SD0": "15.00449143",
        "SD1": "16.90690542",
        "SD1neg": "13.44766958",
        "SD2": "19.27603655",
        "SD2neg": "12.15322688",
        "SD3": "19.37603655",
        "SD3neg": "12.05322688"
    },
    {
        "L": "-0.778904279",
        "M": "15.16078454",
        "Month": "41",
        "S": "0.114822482",
        "SD0": "15.16078454",
        "SD1": "17.09861551",
        "SD1neg": "13.58188997",
        "SD2": "19.52564214",
        "SD2neg": "12.27351994",
        "SD3": "19.62564214",
        "SD3neg": "12.17351994"
    },
    {
        "L": "-0.804515498",
        "M": "15.31940246",
        "Month": "42",
        "S": "0.115493292",
        "SD0": "15.31940246",
        "SD1": "17.29359916",
        "SD1neg": "13.71762716",
        "SD2": "19.77985308",
        "SD2neg": "12.39458741",
        "SD3": "19.87985308",
        "SD3neg": "12.29458741"
    },
    {
        "L": "-0.828003255",
        "M": "15.48030313",
        "Month": "43",
        "S": "0.116187777",
        "SD0": "15.48030313",
        "SD1": "17.49178875",
        "SD1neg": "13.85484655",
        "SD2": "20.03852641",
        "SD2neg": "12.51639809",
        "SD3": "20.13852641",
        "SD3neg": "12.41639809"
    },
    {
        "L": "-0.849380372",
        "M": "15.64343309",
        "Month": "44",
        "S": "0.116904306",
        "SD0": "15.64343309",
        "SD1": "17.69310312",
        "SD1neg": "13.99350493",
        "SD2": "20.3015032",
        "SD2neg": "12.63891523",
        "SD3": "20.4015032",
        "SD3neg": "12.53891523"
    },
    {
        "L": "-0.86869965",
        "M": "15.80872535",
        "Month": "45",
        "S": "0.117641148",
        "SD0": "15.80872535",
        "SD1": "17.89744682",
        "SD1neg": "14.13355164",
        "SD2": "20.56861971",
        "SD2neg": "12.76210286",
        "SD3": "20.66861971",
        "SD3neg": "12.66210286"
    },
    {
        "L": "-0.886033992",
        "M": "15.97610456",
        "Month": "46",
        "S": "0.118396541",
        "SD0": "15.97610456",
        "SD1": "18.10471496",
        "SD1neg": "14.27493102",
        "SD2": "20.83970654",
        "SD2neg": "12.88592407",
        "SD3": "20.93970654",
        "SD3neg": "12.78592407"
    },
    {
        "L": "-0.901507878",
        "M": "16.14548194",
        "Month": "47",
        "S": "0.119168555",
        "SD0": "16.14548194",
        "SD1": "18.31478982",
        "SD1neg": "14.41758274",
        "SD2": "21.11460316",
        "SD2neg": "13.01034948",
        "SD3": "21.21460316",
        "SD3neg": "12.91034948"
    },
    {
        "L": "-0.915241589",
        "M": "16.31676727",
        "Month": "48",
        "S": "0.11995532",
        "SD0": "16.31676727",
        "SD1": "18.52755122",
        "SD1neg": "14.56144515",
        "SD2": "21.39314498",
        "SD2neg": "13.13534759",
        "SD3": "21.49314498",
        "SD3neg": "13.03534759"
    },
    {
        "L": "-0.927377772",
        "M": "16.4898646",
        "Month": "49",
        "S": "0.120754916",
        "SD0": "16.4898646",
        "SD1": "18.74287366",
        "SD1neg": "14.70645542",
        "SD2": "21.67517535",
        "SD2neg": "13.26089178",
        "SD3": "21.77517535",
        "SD3neg": "13.16089178"
    },
    {
        "L": "-0.938069819",
        "M": "16.66467529",
        "Month": "50",
        "S": "0.121565421",
        "SD0": "16.66467529",
        "SD1": "18.96062941",
        "SD1neg": "14.85255089",
        "SD2": "21.96054536",
        "SD2neg": "13.3869592",
        "SD3": "22.06054536",
        "SD3neg": "13.2869592"
    },
    {
        "L": "-0.94747794",
        "M": "16.84109948",
        "Month": "51",
        "S": "0.122384927",
        "SD0": "16.84109948",
        "SD1": "19.1806902",
        "SD1neg": "14.99967003",
        "SD2": "22.24911558",
        "SD2neg": "13.51353107",
        "SD3": "22.34911558",
        "SD3neg": "13.41353107"
    },
    {
        "L": "-0.955765694",
        "M": "17.01903746",
        "Month": "52",
        "S": "0.123211562",
        "SD0": "17.01903746",
        "SD1": "19.40292887",
        "SD1neg": "15.14775323",
        "SD2": "22.54075748",
        "SD2neg": "13.64059288",
        "SD3": "22.64075748",
        "SD3neg": "13.54059288"
    },
    {
        "L": "-0.963096972",
        "M": "17.1983908",
        "Month": "53",
        "S": "0.124043503",
        "SD0": "17.1983908",
        "SD1": "19.6272208",
        "SD1neg": "15.29674347",
        "SD2": "22.83535467",
        "SD2neg": "13.76813436",
        "SD3": "22.93535467",
        "SD3neg": "13.66813436"
    },
    {
        "L": "-0.969633434",
        "M": "17.37906341",
        "Month": "54",
        "S": "0.124878992",
        "SD0": "17.37906341",
        "SD1": "19.85344512",
        "SD1neg": "15.44658683",
        "SD2": "23.13280382",
        "SD2neg": "13.89614955",
        "SD3": "23.23280382",
        "SD3neg": "13.79614955"
    },
    {
        "L": "-0.975532355",
        "M": "17.56096245",
        "Month": "55",
        "S": "0.125716348",
        "SD0": "17.56096245",
        "SD1": "20.08148589",
        "SD1neg": "15.59723295",
        "SD2": "23.43301545",
        "SD2neg": "14.0246366",
        "SD3": "23.53301545",
        "SD3neg": "13.9246366"
    },
    {
        "L": "-0.980937915",
        "M": "17.74400082",
        "Month": "56",
        "S": "0.126554022",
        "SD0": "17.74400082",
        "SD1": "20.31123461",
        "SD1neg": "15.7486356",
        "SD2": "23.73591154",
        "SD2neg": "14.15359585",
        "SD3": "23.83591154",
        "SD3neg": "14.05359585"
    },
    {
        "L": "-0.986006518",
        "M": "17.92809121",
        "Month": "57",
        "S": "0.127390453",
        "SD0": "17.92809121",
        "SD1": "20.54258515",
        "SD1neg": "15.90075195",
        "SD2": "24.04143706",
        "SD2neg": "14.28303646",
        "SD3": "24.14143706",
        "SD3neg": "14.18303646"
    },
    {
        "L": "-0.99086694",
        "M": "18.11315625",
        "Month": "58",
        "S": "0.128224294",
        "SD0": "18.11315625",
        "SD1": "20.77544298",
        "SD1neg": "16.05354418",
        "SD2": "24.34954421",
        "SD2neg": "14.4129662",
        "SD3": "24.44954421",
        "SD3neg": "14.3129662"
    },
    {
        "L": "-0.995644402",
        "M": "18.29912286",
        "Month": "59",
        "S": "0.129054277",
        "SD0": "18.29912286",
        "SD1": "21.00972032",
        "SD1neg": "16.20697868",
        "SD2": "24.66020274",
        "SD2neg": "14.54339747",
        "SD3": "24.76020274",
        "SD3neg": "14.44339747"
    },
    {
        "L": "-1.000453886",
        "M": "18.48592413",
        "Month": "60",
        "S": "0.129879257",
        "SD0": "18.48592413",
        "SD1": "21.24533795",
        "SD1neg": "16.36102628",
        "SD2": "24.97339742",
        "SD2neg": "14.6743454",
        "SD3": "25.07339742",
        "SD3neg": "14.5743454"
    },
    {
        "L": "-1.005399668",
        "M": "18.67349965",
        "Month": "61",
        "S": "0.130698212",
        "SD0": "18.67349965",
        "SD1": "21.48222561",
        "SD1neg": "16.5156623",
        "SD2": "25.28912785",
        "SD2neg": "14.80582747",
        "SD3": "25.38912785",
        "SD3neg": "14.70582747"
    },
    {
        "L": "-1.010575003",
        "M": "18.86179576",
        "Month": "62",
        "S": "0.131510245",
        "SD0": "18.86179576",
        "SD1": "21.72032229",
        "SD1neg": "16.67086651",
        "SD2": "25.60740817",
        "SD2neg": "14.93786307",
        "SD3": "25.70740817",
        "SD3neg": "14.83786307"
    },
    {
        "L": "-1.016061941",
        "M": "19.05076579",
        "Month": "63",
        "S": "0.132314586",
        "SD0": "19.05076579",
        "SD1": "21.95957648",
        "SD1neg": "16.82662301",
        "SD2": "25.92826669",
        "SD2neg": "15.0704731",
        "SD3": "26.02826669",
        "SD3neg": "14.9704731"
    },
    {
        "L": "-1.021931241",
        "M": "19.24037019",
        "Month": "64",
        "S": "0.133110593",
        "SD0": "19.24037019",
        "SD1": "22.19994626",
        "SD1neg": "16.98292017",
        "SD2": "26.25174533",
        "SD2neg": "15.20367949",
        "SD3": "26.35174533",
        "SD3neg": "15.10367949"
    },
    {
        "L": "-1.028242376",
        "M": "19.43057662",
        "Month": "65",
        "S": "0.133897752",
        "SD0": "19.43057662",
        "SD1": "22.44139944",
        "SD1neg": "17.13975047",
        "SD2": "26.57789902",
        "SD2neg": "15.33750481",
        "SD3": "26.67789902",
        "SD3neg": "15.23750481"
    },
    {
        "L": "-1.035043608",
        "M": "19.62136007",
        "Month": "66",
        "S": "0.134675673",
        "SD0": "19.62136007",
        "SD1": "22.68391352",
        "SD1neg": "17.29711036",
        "SD2": "26.90679506",
        "SD2neg": "15.47197177",
        "SD3": "27.00679506",
        "SD3neg": "15.37197177"
    },
    {
        "L": "-1.042372125",
        "M": "19.8127028",
        "Month": "67",
        "S": "0.13544409",
        "SD0": "19.8127028",
        "SD1": "22.9274757",
        "SD1neg": "17.45500008",
        "SD2": "27.23851231",
        "SD2neg": "15.60710288",
        "SD3": "27.33851231",
        "SD3neg": "15.50710288"
    },
    {
        "L": "-1.050254232",
        "M": "20.0045944",
        "Month": "68",
        "S": "0.13620286",
        "SD0": "20.0045944",
        "SD1": "23.17208277",
        "SD1neg": "17.61342348",
        "SD2": "27.57314037",
        "SD2neg": "15.74291996",
        "SD3": "27.67314037",
        "SD3neg": "15.64291996"
    },
    {
        "L": "-1.058705595",
        "M": "20.19703171",
        "Month": "69",
        "S": "0.136951959",
        "SD0": "20.19703171",
        "SD1": "23.41774097",
        "SD1neg": "17.77238781",
        "SD2": "27.91077863",
        "SD2neg": "15.87944382",
        "SD3": "28.01077863",
        "SD3neg": "15.77944382"
    },
    {
        "L": "-1.067731529",
        "M": "20.39001872",
        "Month": "70",
        "S": "0.137691478",
        "SD0": "20.39001872",
        "SD1": "23.66446588",
        "SD1neg": "17.93190352",
        "SD2": "28.25153536",
        "SD2neg": "16.01669387",
        "SD3": "28.35153536",
        "SD3neg": "15.91669387"
    },
    {
        "L": "-1.077321193",
        "M": "20.58356862",
        "Month": "71",
        "S": "0.138421673",
        "SD0": "20.58356862",
        "SD1": "23.91228424",
        "SD1neg": "18.09198426",
        "SD2": "28.59552276",
        "SD2neg": "16.15468559",
        "SD3": "28.69552276",
        "SD3neg": "16.05468559"
    },
    {
        "L": "-1.087471249",
        "M": "20.77769565",
        "Month": "72",
        "S": "0.139142773",
        "SD0": "20.77769565",
        "SD1": "24.16122597",
        "SD1neg": "18.25264581",
        "SD2": "28.94287047",
        "SD2neg": "16.29343858",
        "SD3": "29.04287047",
        "SD3neg": "16.19343858"
    },
    {
        "L": "-1.098152984",
        "M": "20.97242631",
        "Month": "73",
        "S": "0.139855242",
        "SD0": "20.97242631",
        "SD1": "24.41133498",
        "SD1neg": "18.41390711",
        "SD2": "29.29370376",
        "SD2neg": "16.43296444",
        "SD3": "29.39370376",
        "SD3neg": "16.33296444"
    },
    {
        "L": "-1.10933408",
        "M": "21.16779192",
        "Month": "74",
        "S": "0.140559605",
        "SD0": "21.16779192",
        "SD1": "24.66266184",
        "SD1neg": "18.57578919",
        "SD2": "29.64815557",
        "SD2neg": "16.57327414",
        "SD3": "29.74815557",
        "SD3neg": "16.47327414"
    },
    {
        "L": "-1.120974043",
        "M": "21.36383013",
        "Month": "75",
        "S": "0.141256489",
        "SD0": "21.36383013",
        "SD1": "24.91526521",
        "SD1neg": "18.73831522",
        "SD2": "30.00636214",
        "SD2neg": "16.71437604",
        "SD3": "30.10636214",
        "SD3neg": "16.61437604"
    },
    {
        "L": "-1.133024799",
        "M": "21.56058467",
        "Month": "76",
        "S": "0.141946613",
        "SD0": "21.56058467",
        "SD1": "25.16921146",
        "SD1neg": "18.90151024",
        "SD2": "30.36846196",
        "SD2neg": "16.85627581",
        "SD3": "30.46846196",
        "SD3neg": "16.75627581"
    },
    {
        "L": "-1.145431351",
        "M": "21.75810506",
        "Month": "77",
        "S": "0.142630785",
        "SD0": "21.75810506",
        "SD1": "25.42457434",
        "SD1neg": "19.06540094",
        "SD2": "30.7345945",
        "SD2neg": "16.99897637",
        "SD3": "30.8345945",
        "SD3neg": "16.89897637"
    },
    {
        "L": "-1.158132499",
        "M": "21.95644627",
        "Month": "78",
        "S": "0.143309898",
        "SD0": "21.95644627",
        "SD1": "25.68143461",
        "SD1neg": "19.23001552",
        "SD2": "31.10489914",
        "SD2neg": "17.1424779",
        "SD3": "31.20489914",
        "SD3neg": "17.0424779"
    },
    {
        "L": "-1.171061612",
        "M": "22.15566842",
        "Month": "79",
        "S": "0.143984924",
        "SD0": "22.15566842",
        "SD1": "25.93987961",
        "SD1neg": "19.39538343",
        "SD2": "31.47951404",
        "SD2neg": "17.28677791",
        "SD3": "31.57951404",
        "SD3neg": "17.18677791"
    },
    {
        "L": "-1.184141975",
        "M": "22.35583862",
        "Month": "80",
        "S": "0.144656953",
        "SD0": "22.35583862",
        "SD1": "26.20000519",
        "SD1neg": "19.56153539",
        "SD2": "31.8585707",
        "SD2neg": "17.43186906",
        "SD3": "31.9585707",
        "SD3neg": "17.33186906"
    },
    {
        "L": "-1.197307185",
        "M": "22.55702268",
        "Month": "81",
        "S": "0.145327009",
        "SD0": "22.55702268",
        "SD1": "26.46190696",
        "SD1neg": "19.72850265",
        "SD2": "32.24220828",
        "SD2neg": "17.57774753",
        "SD3": "32.34220828",
        "SD3neg": "17.47774753"
    },
    {
        "L": "-1.210475099",
        "M": "22.75929558",
        "Month": "82",
        "S": "0.145996289",
        "SD0": "22.75929558",
        "SD1": "26.72569119",
        "SD1neg": "19.89631763",
        "SD2": "32.6305516",
        "SD2neg": "17.72440191",
        "SD3": "32.7305516",
        "SD3neg": "17.62440191"
    },
    {
        "L": "-1.223565263",
        "M": "22.9627344",
        "Month": "83",
        "S": "0.146666",
        "SD0": "22.9627344",
        "SD1": "26.99146735",
        "SD1neg": "20.0650133",
        "SD2": "33.02372291",
        "SD2neg": "17.87182042",
        "SD3": "33.12372291",
        "SD3neg": "17.77182042"
    },
    {
        "L": "-1.236497304",
        "M": "23.16741888",
        "Month": "84",
        "S": "0.147337375",
        "SD0": "23.16741888",
        "SD1": "27.25934859",
        "SD1neg": "20.23462314",
        "SD2": "33.42183931",
        "SD2neg": "18.01999012",
        "SD3": "33.52183931",
        "SD3neg": "17.91999012"
    },
    {
        "L": "-1.249186293",
        "M": "23.37343341",
        "Month": "85",
        "S": "0.148011715",
        "SD0": "23.37343341",
        "SD1": "27.52945383",
        "SD1neg": "20.40518122",
        "SD2": "33.82500695",
        "SD2neg": "18.16889479",
        "SD3": "33.92500695",
        "SD3neg": "18.06889479"
    },
    {
        "L": "-1.261555446",
        "M": "23.58086145",
        "Month": "86",
        "S": "0.148690256",
        "SD0": "23.58086145",
        "SD1": "27.80190158",
        "SD1neg": "20.57672183",
        "SD2": "34.2333309",
        "SD2neg": "18.31852059",
        "SD3": "34.3333309",
        "SD3neg": "18.21852059"
    },
    {
        "L": "-1.273523619",
        "M": "23.78979096",
        "Month": "87",
        "S": "0.149374297",
        "SD0": "23.78979096",
        "SD1": "28.07681569",
        "SD1neg": "20.74927976",
        "SD2": "34.64690247",
        "SD2neg": "18.46885038",
        "SD3": "34.74690247",
        "SD3neg": "18.36885038"
    },
    {
        "L": "-1.285013783",
        "M": "24.00031064",
        "Month": "88",
        "S": "0.150065107",
        "SD0": "24.00031064",
        "SD1": "28.35432119",
        "SD1neg": "20.92289008",
        "SD2": "35.06580552",
        "SD2neg": "18.61986758",
        "SD3": "35.16580552",
        "SD3neg": "18.51986758"
    },
    {
        "L": "-1.295952066",
        "M": "24.21251028",
        "Month": "89",
        "S": "0.150763933",
        "SD0": "24.21251028",
        "SD1": "28.63454444",
        "SD1neg": "21.09758823",
        "SD2": "35.49011442",
        "SD2neg": "18.77155575",
        "SD3": "35.59011442",
        "SD3neg": "18.67155575"
    },
    {
        "L": "-1.306268473",
        "M": "24.42648043",
        "Month": "90",
        "S": "0.151471982",
        "SD0": "24.42648043",
        "SD1": "28.91761256",
        "SD1neg": "21.27340999",
        "SD2": "35.91989363",
        "SD2neg": "18.92389907",
        "SD3": "36.01989363",
        "SD3neg": "18.82389907"
    },
    {
        "L": "-1.31589753",
        "M": "24.642312",
        "Month": "91",
        "S": "0.152190413",
        "SD0": "24.642312",
        "SD1": "29.20365285",
        "SD1neg": "21.45039158",
        "SD2": "36.35519742",
        "SD2neg": "19.07688266",
        "SD3": "36.45519742",
        "SD3neg": "18.97688266"
    },
    {
        "L": "-1.324778843",
        "M": "24.86009596",
        "Month": "92",
        "S": "0.152920322",
        "SD0": "24.86009596",
        "SD1": "29.49279211",
        "SD1neg": "21.62856966",
        "SD2": "36.79606961",
        "SD2neg": "19.23049301",
        "SD3": "36.89606961",
        "SD3neg": "19.13049301"
    },
    {
        "L": "-1.332857581",
        "M": "25.07992303",
        "Month": "93",
        "S": "0.153662731",
        "SD0": "25.07992303",
        "SD1": "29.78515614",
        "SD1neg": "21.80798147",
        "SD2": "37.24254342",
        "SD2neg": "19.3847184",
        "SD3": "37.34254342",
        "SD3neg": "19.2847184"
    },
    {
        "L": "-1.340080195",
        "M": "25.30188584",
        "Month": "94",
        "S": "0.154418635",
        "SD0": "25.30188584",
        "SD1": "30.08087196",
        "SD1neg": "21.98866492",
        "SD2": "37.69463594",
        "SD2neg": "19.53954667",
        "SD3": "37.79463594",
        "SD3neg": "19.43954667"
    },
    {
        "L": "-1.346412105",
        "M": "25.52606977",
        "Month": "95",
        "S": "0.155188768",
        "SD0": "25.52606977",
        "SD1": "30.38005672",
        "SD1neg": "22.17065861",
        "SD2": "38.1523683",
        "SD2neg": "19.69497502",
        "SD3": "38.2523683",
        "SD3neg": "19.59497502"
    },
    {
        "L": "-1.351813296",
        "M": "25.75256528",
        "Month": "96",
        "S": "0.155973912",
        "SD0": "25.75256528",
        "SD1": "30.682832",
        "SD1neg": "22.35400207",
        "SD2": "38.61573728",
        "SD2neg": "19.85099711",
        "SD3": "38.71573728",
        "SD3neg": "19.75099711"
    },
    {
        "L": "-1.356253969",
        "M": "25.9814599",
        "Month": "97",
        "S": "0.156774684",
        "SD0": "25.9814599",
        "SD1": "30.98931404",
        "SD1neg": "22.53873583",
        "SD2": "39.08473332",
        "SD2neg": "20.00761165",
        "SD3": "39.18473332",
        "SD3neg": "19.90761165"
    },
    {
        "L": "-1.359710858",
        "M": "26.2128399",
        "Month": "98",
        "S": "0.157591579",
        "SD0": "26.2128399",
        "SD1": "31.29961543",
        "SD1neg": "22.72490155",
        "SD2": "39.55933633",
        "SD2neg": "20.16482073",
        "SD3": "39.65933633",
        "SD3neg": "20.06482073"
    },
    {
        "L": "-1.362167159",
        "M": "26.44679027",
        "Month": "99",
        "S": "0.158424964",
        "SD0": "26.44679027",
        "SD1": "31.61384471",
        "SD1neg": "22.91254216",
        "SD2": "40.03951593",
        "SD2neg": "20.32263008",
        "SD3": "40.13951593",
        "SD3neg": "20.22263008"
    },
    {
        "L": "-1.363612378",
        "M": "26.68339457",
        "Month": "100",
        "S": "0.159275071",
        "SD0": "26.68339457",
        "SD1": "31.93210599",
        "SD1neg": "23.10170196",
        "SD2": "40.52523158",
        "SD2neg": "20.48104927",
        "SD3": "40.62523158",
        "SD3neg": "20.38104927"
    },
    {
        "L": "-1.364042106",
        "M": "26.92273494",
        "Month": "101",
        "S": "0.160141995",
        "SD0": "26.92273494",
        "SD1": "32.25449861",
        "SD1neg": "23.29242682",
        "SD2": "41.01643285",
        "SD2neg": "20.64009189",
        "SD3": "41.11643285",
        "SD3neg": "20.54009189"
    },
    {
        "L": "-1.363457829",
        "M": "27.16489199",
        "Month": "102",
        "S": "0.161025689",
        "SD0": "27.16489199",
        "SD1": "32.58111676",
        "SD1neg": "23.48476421",
        "SD2": "41.51305975",
        "SD2neg": "20.79977578",
        "SD3": "41.61305975",
        "SD3neg": "20.69977578"
    },
    {
        "L": "-1.361865669",
        "M": "27.40994539",
        "Month": "103",
        "S": "0.161925976",
        "SD0": "27.40994539",
        "SD1": "32.91204992",
        "SD1neg": "23.67876342",
        "SD2": "42.01504152",
        "SD2neg": "20.96012257",
        "SD3": "42.11504152",
        "SD3neg": "20.86012257"
    },
    {
        "L": "-1.35928261",
        "M": "27.65796978",
        "Month": "104",
        "S": "0.162842452",
        "SD0": "27.65796978",
        "SD1": "33.24737753",
        "SD1neg": "23.87447556",
        "SD2": "42.52230709",
        "SD2neg": "21.12116202",
        "SD3": "42.62230709",
        "SD3neg": "21.02116202"
    },
    {
        "L": "-1.355720571",
        "M": "27.90904433",
        "Month": "105",
        "S": "0.163774719",
        "SD0": "27.90904433",
        "SD1": "33.58718075",
        "SD1neg": "24.07195374",
        "SD2": "43.03476172",
        "SD2neg": "21.28292217",
        "SD3": "43.13476172",
        "SD3neg": "21.18292217"
    },
    {
        "L": "-1.351202536",
        "M": "28.16324264",
        "Month": "106",
        "S": "0.164722138",
        "SD0": "28.16324264",
        "SD1": "33.93152957",
        "SD1neg": "24.27125312",
        "SD2": "43.55231234",
        "SD2neg": "21.44543998",
        "SD3": "43.65231234",
        "SD3neg": "21.34543998"
    },
    {
        "L": "-1.345754408",
        "M": "28.42063744",
        "Month": "107",
        "S": "0.165683945",
        "SD0": "28.42063744",
        "SD1": "34.28048855",
        "SD1neg": "24.47243099",
        "SD2": "44.07485627",
        "SD2neg": "21.60875643",
        "SD3": "44.17485627",
        "SD3neg": "21.50875643"
    },
    {
        "L": "-1.339405453",
        "M": "28.68130005",
        "Month": "108",
        "S": "0.166659247",
        "SD0": "28.68130005",
        "SD1": "34.63411601",
        "SD1neg": "24.67554679",
        "SD2": "44.60228289",
        "SD2neg": "21.77291719",
        "SD3": "44.70228289",
        "SD3neg": "21.67291719"
    },
    {
        "L": "-1.332188093",
        "M": "28.94530029",
        "Month": "109",
        "S": "0.167647017",
        "SD0": "28.94530029",
        "SD1": "34.99246375",
        "SD1neg": "24.88066219",
        "SD2": "45.13447435",
        "SD2neg": "21.93797266",
        "SD3": "45.23447435",
        "SD3neg": "21.83797266"
    },
    {
        "L": "-1.324137479",
        "M": "29.21270645",
        "Month": "110",
        "S": "0.168646104",
        "SD0": "29.21270645",
        "SD1": "35.35557698",
        "SD1neg": "25.08784108",
        "SD2": "45.67130588",
        "SD2neg": "22.10397804",
        "SD3": "45.77130588",
        "SD3neg": "22.00397804"
    },
    {
        "L": "-1.315291073",
        "M": "29.48358527",
        "Month": "111",
        "S": "0.169655235",
        "SD0": "29.48358527",
        "SD1": "35.72349425",
        "SD1neg": "25.29714962",
        "SD2": "46.21264616",
        "SD2neg": "22.2709933",
        "SD3": "46.31264616",
        "SD3neg": "22.1709933"
    },
    {
        "L": "-1.30568824",
        "M": "29.75800198",
        "Month": "112",
        "S": "0.170673022",
        "SD0": "29.75800198",
        "SD1": "36.09624737",
        "SD1neg": "25.50865613",
        "SD2": "46.7583577",
        "SD2neg": "22.43908304",
        "SD3": "46.8583577",
        "SD3neg": "22.33908304"
    },
    {
        "L": "-1.295369867",
        "M": "30.03602021",
        "Month": "113",
        "S": "0.17169797",
        "SD0": "30.03602021",
        "SD1": "36.47386143",
        "SD1neg": "25.72243114",
        "SD2": "47.30829718",
        "SD2neg": "22.60831652",
        "SD3": "47.40829718",
        "SD3neg": "22.50831652"
    },
    {
        "L": "-1.284374967",
        "M": "30.31770417",
        "Month": "114",
        "S": "0.17272854",
        "SD0": "30.31770417",
        "SD1": "36.85635775",
        "SD1neg": "25.9385471",
        "SD2": "47.86231032",
        "SD2neg": "22.77876487",
        "SD3": "47.96231032",
        "SD3neg": "22.67876487"
    },
    {
        "L": "-1.272750864",
        "M": "30.60311107",
        "Month": "115",
        "S": "0.173762961",
        "SD0": "30.60311107",
        "SD1": "37.24374352",
        "SD1neg": "26.157079",
        "SD2": "48.42025102",
        "SD2neg": "22.9505101",
        "SD3": "48.52025102",
        "SD3neg": "22.8505101"
    },
    {
        "L": "-1.260539193",
        "M": "30.89230072",
        "Month": "116",
        "S": "0.174799493",
        "SD0": "30.89230072",
        "SD1": "37.63602522",
        "SD1neg": "26.37810332",
        "SD2": "48.98195762",
        "SD2neg": "23.12363312",
        "SD3": "49.08195762",
        "SD3neg": "23.02363312"
    },
    {
        "L": "-1.247783611",
        "M": "31.18532984",
        "Month": "117",
        "S": "0.175836284",
        "SD0": "31.18532984",
        "SD1": "38.03320079",
        "SD1neg": "26.60169849",
        "SD2": "49.54726721",
        "SD2neg": "23.29822059",
        "SD3": "49.64726721",
        "SD3neg": "23.19822059"
    },
    {
        "L": "-1.234527763",
        "M": "31.48225315",
        "Month": "118",
        "S": "0.176871417",
        "SD0": "31.48225315",
        "SD1": "38.43526139",
        "SD1neg": "26.8279446",
        "SD2": "50.11601302",
        "SD2neg": "23.47436312",
        "SD3": "50.21601302",
        "SD3neg": "23.37436312"
    },
    {
        "L": "-1.220815047",
        "M": "31.78312329",
        "Month": "119",
        "S": "0.177902912",
        "SD0": "31.78312329",
        "SD1": "38.84219146",
        "SD1neg": "27.05692324",
        "SD2": "50.68802475",
        "SD2neg": "23.65215514",
        "SD3": "50.78802475",
        "SD3neg": "23.55215514"
    },
    {
        "L": "-1.206688407",
        "M": "32.08799062",
        "Month": "120",
        "S": "0.17892874",
        "SD0": "32.08799062",
        "SD1": "39.25396867",
        "SD1neg": "27.28871732",
        "SD2": "51.26312894",
        "SD2neg": "23.83169468",
        "SD3": "51.36312894",
        "SD3neg": "23.73169468"
    },
    {
        "L": "-1.19219015",
        "M": "32.39690313",
        "Month": "121",
        "S": "0.17994683",
        "SD0": "32.39690313",
        "SD1": "39.67056401",
        "SD1neg": "27.52341084",
        "SD2": "51.84114939",
        "SD2neg": "24.01308316",
        "SD3": "51.94114939",
        "SD3neg": "23.91308316"
    },
    {
        "L": "-1.177361786",
        "M": "32.7099062",
        "Month": "122",
        "S": "0.180955078",
        "SD0": "32.7099062",
        "SD1": "40.09194186",
        "SD1neg": "27.76108866",
        "SD2": "52.42190761",
        "SD2neg": "24.19642512",
        "SD3": "52.52190761",
        "SD3neg": "24.09642512"
    },
    {
        "L": "-1.162243894",
        "M": "33.02704244",
        "Month": "123",
        "S": "0.181951361",
        "SD0": "33.02704244",
        "SD1": "40.51805997",
        "SD1neg": "28.00183625",
        "SD2": "53.00522307",
        "SD2neg": "24.38182799",
        "SD3": "53.10522307",
        "SD3neg": "24.28182799"
    },
    {
        "L": "-1.146876007",
        "M": "33.34835148",
        "Month": "124",
        "S": "0.182933537",
        "SD0": "33.34835148",
        "SD1": "40.94886956",
        "SD1neg": "28.24573942",
        "SD2": "53.59091372",
        "SD2neg": "24.56940175",
        "SD3": "53.69091372",
        "SD3neg": "24.46940175"
    },
    {
        "L": "-1.131296524",
        "M": "33.67386973",
        "Month": "125",
        "S": "0.183899465",
        "SD0": "33.67386973",
        "SD1": "41.38431537",
        "SD1neg": "28.49288399",
        "SD2": "54.17879636",
        "SD2neg": "24.75925869",
        "SD3": "54.27879636",
        "SD3neg": "24.65925869"
    },
    {
        "L": "-1.115542634",
        "M": "34.00363017",
        "Month": "126",
        "S": "0.184847006",
        "SD0": "34.00363017",
        "SD1": "41.8243357",
        "SD1neg": "28.74335551",
        "SD2": "54.768687",
        "SD2neg": "24.95151303",
        "SD3": "54.868687",
        "SD3neg": "24.85151303"
    },
    {
        "L": "-1.099650267",
        "M": "34.33766207",
        "Month": "127",
        "S": "0.185774041",
        "SD0": "34.33766207",
        "SD1": "42.26886252",
        "SD1neg": "28.99723887",
        "SD2": "55.36040134",
        "SD2neg": "25.14628062",
        "SD3": "55.46040134",
        "SD3neg": "25.04628062"
    },
    {
        "L": "-1.083654055",
        "M": "34.67599076",
        "Month": "128",
        "S": "0.18667847",
        "SD0": "34.67599076",
        "SD1": "42.7178215",
        "SD1neg": "29.254618",
        "SD2": "55.95375502",
        "SD2neg": "25.34367856",
        "SD3": "56.05375502",
        "SD3neg": "25.24367856"
    },
    {
        "L": "-1.067587314",
        "M": "35.01863732",
        "Month": "129",
        "S": "0.187558229",
        "SD0": "35.01863732",
        "SD1": "43.17113209",
        "SD1neg": "29.51557544",
        "SD2": "56.54856423",
        "SD2neg": "25.54382481",
        "SD3": "56.64856423",
        "SD3neg": "25.44382481"
    },
    {
        "L": "-1.051482972",
        "M": "35.36561737",
        "Month": "130",
        "S": "0.18841128",
        "SD0": "35.36561737",
        "SD1": "43.62870637",
        "SD1neg": "29.78019204",
        "SD2": "57.14464818",
        "SD2neg": "25.74683888",
        "SD3": "57.24464818",
        "SD3neg": "25.64683888"
    },
    {
        "L": "-1.035367321",
        "M": "35.71694723",
        "Month": "131",
        "S": "0.189235738",
        "SD0": "35.71694723",
        "SD1": "44.09045739",
        "SD1neg": "30.0485462",
        "SD2": "57.74181438",
        "SD2neg": "25.9528342",
        "SD3": "57.84181438",
        "SD3neg": "25.8528342"
    },
    {
        "L": "-1.019277299",
        "M": "36.07262569",
        "Month": "132",
        "S": "0.190029545",
        "SD0": "36.07262569",
        "SD1": "44.55627644",
        "SD1neg": "30.32071425",
        "SD2": "58.33990117",
        "SD2neg": "26.16193765",
        "SD3": "58.43990117",
        "SD3neg": "26.06193765"
    },
    {
        "L": "-1.003235326",
        "M": "36.43265996",
        "Month": "133",
        "S": "0.190790973",
        "SD0": "36.43265996",
        "SD1": "45.02606645",
        "SD1neg": "30.59676894",
        "SD2": "58.93871637",
        "SD2neg": "26.37425992",
        "SD3": "59.03871637",
        "SD3neg": "26.27425992"
    },
    {
        "L": "-0.987269866",
        "M": "36.79704392",
        "Month": "134",
        "S": "0.191518224",
        "SD0": "36.79704392",
        "SD1": "45.49971491",
        "SD1neg": "30.8767798",
        "SD2": "59.53808808",
        "SD2neg": "26.58991888",
        "SD3": "59.63808808",
        "SD3neg": "26.48991888"
    },
    {
        "L": "-0.971406609",
        "M": "37.1657671",
        "Month": "135",
        "S": "0.192209619",
        "SD0": "37.1657671",
        "SD1": "45.97710572",
        "SD1neg": "31.16081235",
        "SD2": "60.13784321",
        "SD2neg": "26.80902879",
        "SD3": "60.23784321",
        "SD3neg": "26.70902879"
    },
    {
        "L": "-0.955670107",
        "M": "37.53881268",
        "Month": "136",
        "S": "0.192863569",
        "SD0": "37.53881268",
        "SD1": "46.45811715",
        "SD1neg": "31.44892765",
        "SD2": "60.73781176",
        "SD2neg": "27.03170163",
        "SD3": "60.83781176",
        "SD3neg": "26.93170163"
    },
    {
        "L": "-0.940083834",
        "M": "37.91615721",
        "Month": "137",
        "S": "0.193478582",
        "SD0": "37.91615721",
        "SD1": "46.94262202",
        "SD1neg": "31.74118189",
        "SD2": "61.33782718",
        "SD2neg": "27.25804668",
        "SD3": "61.43782718",
        "SD3neg": "27.15804668"
    },
    {
        "L": "-0.924670244",
        "M": "38.2977703",
        "Month": "138",
        "S": "0.194053274",
        "SD0": "38.2977703",
        "SD1": "47.43048769",
        "SD1neg": "32.03762582",
        "SD2": "61.93772664",
        "SD2neg": "27.4881699",
        "SD3": "62.03772664",
        "SD3neg": "27.3881699"
    },
    {
        "L": "-0.909450843",
        "M": "38.6836143",
        "Month": "139",
        "S": "0.194586368",
        "SD0": "38.6836143",
        "SD1": "47.92157625",
        "SD1neg": "32.33830433",
        "SD2": "62.53735135",
        "SD2neg": "27.72217352",
        "SD3": "62.63735135",
        "SD3neg": "27.62217352"
    },
    {
        "L": "-0.894446258",
        "M": "39.07364401",
        "Month": "140",
        "S": "0.195076705",
        "SD0": "39.07364401",
        "SD1": "48.4157446",
        "SD1neg": "32.64325592",
        "SD2": "63.13654695",
        "SD2neg": "27.96015541",
        "SD3": "63.23654695",
        "SD3neg": "27.86015541"
    },
    {
        "L": "-0.879676305",
        "M": "39.46780643",
        "Month": "141",
        "S": "0.195523246",
        "SD0": "39.46780643",
        "SD1": "48.91284457",
        "SD1neg": "32.95251221",
        "SD2": "63.73516366",
        "SD2neg": "28.20220864",
        "SD3": "63.83516366",
        "SD3neg": "28.10220864"
    },
    {
        "L": "-0.865160071",
        "M": "39.86604044",
        "Month": "142",
        "S": "0.195925079",
        "SD0": "39.86604044",
        "SD1": "49.41272298",
        "SD1neg": "33.26609749",
        "SD2": "64.33305657",
        "SD2neg": "28.44842088",
        "SD3": "64.43305657",
        "SD3neg": "28.34842088"
    },
    {
        "L": "-0.850915987",
        "M": "40.26827652",
        "Month": "143",
        "S": "0.196281418",
        "SD0": "40.26827652",
        "SD1": "49.91522184",
        "SD1neg": "33.58402818",
        "SD2": "64.93008598",
        "SD2neg": "28.69887388",
        "SD3": "65.03008598",
        "SD3neg": "28.59887388"
    },
    {
        "L": "-0.836961905",
        "M": "40.67443658",
        "Month": "144",
        "S": "0.196591612",
        "SD0": "40.67443658",
        "SD1": "50.42017841",
        "SD1neg": "33.90631241",
        "SD2": "65.52611747",
        "SD2neg": "28.95364294",
        "SD3": "65.62611747",
        "SD3neg": "28.85364294"
    },
    {
        "L": "-0.823315176",
        "M": "41.08443363",
        "Month": "145",
        "S": "0.19685514",
        "SD0": "41.08443363",
        "SD1": "50.92742532",
        "SD1neg": "34.23294953",
        "SD2": "66.12102217",
        "SD2neg": "29.21279636",
        "SD3": "66.22102217",
        "SD3neg": "29.11279636"
    },
    {
        "L": "-0.809992726",
        "M": "41.49817164",
        "Month": "146",
        "S": "0.19707162",
        "SD0": "41.49817164",
        "SD1": "51.43679066",
        "SD1neg": "34.56392968",
        "SD2": "66.71467689",
        "SD2neg": "29.47639494",
        "SD3": "66.81467689",
        "SD3neg": "29.37639494"
    },
    {
        "L": "-0.797011132",
        "M": "41.91554528",
        "Month": "147",
        "S": "0.197240806",
        "SD0": "41.91554528",
        "SD1": "51.9480982",
        "SD1neg": "34.8992333",
        "SD2": "67.30696434",
        "SD2neg": "29.74449139",
        "SD3": "67.40696434",
        "SD3neg": "29.64449139"
    },
    {
        "L": "-0.784386693",
        "M": "42.33643978",
        "Month": "148",
        "S": "0.197362591",
        "SD0": "42.33643978",
        "SD1": "52.46116739",
        "SD1neg": "35.23883082",
        "SD2": "67.8977731",
        "SD2neg": "30.01712986",
        "SD3": "67.9977731",
        "SD3neg": "29.91712986"
    },
    {
        "L": "-0.772135506",
        "M": "42.76073078",
        "Month": "149",
        "S": "0.197437004",
        "SD0": "42.76073078",
        "SD1": "52.97581355",
        "SD1neg": "35.58268214",
        "SD2": "68.48699781",
        "SD2neg": "30.29434542",
        "SD3": "68.58699781",
        "SD3neg": "30.19434542"
    },
    {
        "L": "-0.760273528",
        "M": "43.18828419",
        "Month": "150",
        "S": "0.19746421",
        "SD0": "43.18828419",
        "SD1": "53.49184797",
        "SD1neg": "35.93073636",
        "SD2": "69.07453919",
        "SD2neg": "30.57616354",
        "SD3": "69.17453919",
        "SD3neg": "30.47616354"
    },
    {
        "L": "-0.748815968",
        "M": "43.61895703",
        "Month": "151",
        "S": "0.197444522",
        "SD0": "43.61895703",
        "SD1": "54.00907913",
        "SD1neg": "36.28293141",
        "SD2": "69.66030217",
        "SD2neg": "30.86259856",
        "SD3": "69.76030217",
        "SD3neg": "30.76259856"
    },
    {
        "L": "-0.737780398",
        "M": "44.0525931",
        "Month": "152",
        "S": "0.197378345",
        "SD0": "44.0525931",
        "SD1": "54.52730798",
        "SD1neg": "36.63919365",
        "SD2": "70.2442044",
        "SD2neg": "31.15365796",
        "SD3": "70.3442044",
        "SD3neg": "31.05365796"
    },
    {
        "L": "-0.727181568",
        "M": "44.48903027",
        "Month": "153",
        "S": "0.197266263",
        "SD0": "44.48903027",
        "SD1": "55.04633635",
        "SD1neg": "36.99943774",
        "SD2": "70.82616157",
        "SD2neg": "31.44933379",
        "SD3": "70.92616157",
        "SD3neg": "31.34933379"
    },
    {
        "L": "-0.717035494",
        "M": "44.92809483",
        "Month": "154",
        "S": "0.197108968",
        "SD0": "44.92809483",
        "SD1": "55.5659607",
        "SD1neg": "37.36356629",
        "SD2": "71.40609856",
        "SD2neg": "31.74960848",
        "SD3": "71.50609856",
        "SD3neg": "31.64960848"
    },
    {
        "L": "-0.707358338",
        "M": "45.36960315",
        "Month": "155",
        "S": "0.196907274",
        "SD0": "45.36960315",
        "SD1": "56.08597412",
        "SD1neg": "37.73146966",
        "SD2": "71.98394618",
        "SD2neg": "32.0544526",
        "SD3": "72.08394618",
        "SD3neg": "31.9544526"
    },
    {
        "L": "-0.698166437",
        "M": "45.81336172",
        "Month": "156",
        "S": "0.196662115",
        "SD0": "45.81336172",
        "SD1": "56.60616644",
        "SD1neg": "38.10302583",
        "SD2": "72.55964094",
        "SD2neg": "32.36382453",
        "SD3": "72.65964094",
        "SD3neg": "32.26382453"
    },
    {
        "L": "-0.689476327",
        "M": "46.25916729",
        "Month": "157",
        "S": "0.196374538",
        "SD0": "46.25916729",
        "SD1": "57.12632439",
        "SD1neg": "38.47810022",
        "SD2": "73.13312483",
        "SD2neg": "32.67767001",
        "SD3": "73.23312483",
        "SD3neg": "32.57767001"
    },
    {
        "L": "-0.68130475",
        "M": "46.70680701",
        "Month": "158",
        "S": "0.196045701",
        "SD0": "46.70680701",
        "SD1": "57.64623176",
        "SD1neg": "38.85654565",
        "SD2": "73.7043451",
        "SD2neg": "32.99592189",
        "SD3": "73.8043451",
        "SD3neg": "32.89592189"
    },
    {
        "L": "-0.673668658",
        "M": "47.15605863",
        "Month": "159",
        "S": "0.195676862",
        "SD0": "47.15605863",
        "SD1": "58.16566956",
        "SD1neg": "39.23820228",
        "SD2": "74.27325402",
        "SD2neg": "33.31849971",
        "SD3": "74.37325402",
        "SD3neg": "33.21849971"
    },
    {
        "L": "-0.666585194",
        "M": "47.60669074",
        "Month": "160",
        "S": "0.19526938",
        "SD0": "47.60669074",
        "SD1": "58.68441623",
        "SD1neg": "39.62289766",
        "SD2": "74.83980846",
        "SD2neg": "33.64530947",
        "SD3": "74.93980846",
        "SD3neg": "33.54530947"
    },
    {
        "L": "-0.660069969",
        "M": "48.05846572",
        "Month": "161",
        "S": "0.19482473",
        "SD0": "48.05846572",
        "SD1": "59.20225046",
        "SD1neg": "40.01044698",
        "SD2": "75.40396453",
        "SD2neg": "33.97624064",
        "SD3": "75.50396453",
        "SD3neg": "33.87624064"
    },
    {
        "L": "-0.654142602",
        "M": "48.51113138",
        "Month": "162",
        "S": "0.19434441",
        "SD0": "48.51113138",
        "SD1": "59.71894255",
        "SD1neg": "40.40065252",
        "SD2": "75.9656937",
        "SD2neg": "34.31117487",
        "SD3": "76.0656937",
        "SD3neg": "34.21117487"
    },
    {
        "L": "-0.648819666",
        "M": "48.96443224",
        "Month": "163",
        "S": "0.193830046",
        "SD0": "48.96443224",
        "SD1": "60.23426572",
        "SD1neg": "40.79330471",
        "SD2": "76.5249616",
        "SD2neg": "34.6499746",
        "SD3": "76.6249616",
        "SD3neg": "34.5499746"
    },
    {
        "L": "-0.644118611",
        "M": "49.41810374",
        "Month": "164",
        "S": "0.193283319",
        "SD0": "49.41810374",
        "SD1": "60.74798999",
        "SD1neg": "41.18818184",
        "SD2": "77.08173934",
        "SD2neg": "34.99248933",
        "SD3": "77.18173934",
        "SD3neg": "34.89248933"
    },
    {
        "L": "-0.640056805",
        "M": "49.87187409",
        "Month": "165",
        "S": "0.192705974",
        "SD0": "49.87187409",
        "SD1": "61.2598838",
        "SD1neg": "41.58505047",
        "SD2": "77.63600047",
        "SD2neg": "35.3385541",
        "SD3": "77.73600047",
        "SD3neg": "35.2385541"
    },
    {
        "L": "-0.636651424",
        "M": "50.32546478",
        "Month": "166",
        "S": "0.192099812",
        "SD0": "50.32546478",
        "SD1": "61.76971419",
        "SD1neg": "41.98366583",
        "SD2": "78.18772023",
        "SD2neg": "35.68798944",
        "SD3": "78.28772023",
        "SD3neg": "35.58798944"
    },
    {
        "L": "-0.633919328",
        "M": "50.77859121",
        "Month": "167",
        "S": "0.191466681",
        "SD0": "50.77859121",
        "SD1": "62.27724714",
        "SD1neg": "42.38377218",
        "SD2": "78.73687511",
        "SD2neg": "36.04060134",
        "SD3": "78.83687511",
        "SD3neg": "35.94060134"
    },
    {
        "L": "-0.631876912",
        "M": "51.23096332",
        "Month": "168",
        "S": "0.190808471",
        "SD0": "51.23096332",
        "SD1": "62.78224781",
        "SD1neg": "42.78510332",
        "SD2": "79.283442",
        "SD2neg": "36.3961813",
        "SD3": "79.383442",
        "SD3neg": "36.2961813"
    },
    {
        "L": "-0.63053994",
        "M": "51.68228625",
        "Month": "169",
        "S": "0.190127105",
        "SD0": "51.68228625",
        "SD1": "63.28448084",
        "SD1neg": "43.18738314",
        "SD2": "79.82739759",
        "SD2neg": "36.75450643",
        "SD3": "79.92739759",
        "SD3neg": "36.65450643"
    },
    {
        "L": "-0.629923353",
        "M": "52.13226113",
        "Month": "170",
        "S": "0.18942453",
        "SD0": "52.13226113",
        "SD1": "63.78371066",
        "SD1neg": "43.59032617",
        "SD2": "80.36871752",
        "SD2neg": "37.11533951",
        "SD3": "80.46871752",
        "SD3neg": "37.01533951"
    },
    {
        "L": "-0.630041066",
        "M": "52.58058583",
        "Month": "171",
        "S": "0.188702714",
        "SD0": "52.58058583",
        "SD1": "64.2797019",
        "SD1neg": "43.99363831",
        "SD2": "80.9073756",
        "SD2neg": "37.47842928",
        "SD3": "81.0073756",
        "SD3neg": "37.37842928"
    },
    {
        "L": "-0.630905733",
        "M": "53.02695588",
        "Month": "172",
        "S": "0.187963636",
        "SD0": "53.02695588",
        "SD1": "64.77221966",
        "SD1neg": "44.39701748",
        "SD2": "81.44334292",
        "SD2neg": "37.84351061",
        "SD3": "81.54334292",
        "SD3neg": "37.74351061"
    },
    {
        "L": "-0.632528509",
        "M": "53.47106525",
        "Month": "173",
        "S": "0.187209281",
        "SD0": "53.47106525",
        "SD1": "65.26103001",
        "SD1neg": "44.80015444",
        "SD2": "81.97658701",
        "SD2neg": "38.21030487",
        "SD3": "82.07658701",
        "SD3neg": "38.11030487"
    },
    {
        "L": "-0.634918779",
        "M": "53.91260737",
        "Month": "174",
        "S": "0.18644163",
        "SD0": "53.91260737",
        "SD1": "65.74590032",
        "SD1neg": "45.20273363",
        "SD2": "82.50707085",
        "SD2neg": "38.57852028",
        "SD3": "82.60707085",
        "SD3neg": "38.47852028"
    },
    {
        "L": "-0.638083884",
        "M": "54.35127608",
        "Month": "175",
        "S": "0.185662657",
        "SD0": "54.35127608",
        "SD1": "66.22659979",
        "SD1neg": "45.60443401",
        "SD2": "83.03475186",
        "SD2neg": "38.94785239",
        "SD3": "83.13475186",
        "SD3neg": "38.84785239"
    },
    {
        "L": "-0.642028835",
        "M": "54.78676659",
        "Month": "176",
        "S": "0.184874323",
        "SD0": "54.78676659",
        "SD1": "66.70289988",
        "SD1neg": "46.00493001",
        "SD2": "83.55958104",
        "SD2neg": "39.31798461",
        "SD3": "83.65958104",
        "SD3neg": "39.21798461"
    },
    {
        "L": "-0.646756013",
        "M": "55.21877657",
        "Month": "177",
        "S": "0.184078567",
        "SD0": "55.21877657",
        "SD1": "67.17457481",
        "SD1neg": "46.40389255",
        "SD2": "84.08150183",
        "SD2neg": "39.68858879",
        "SD3": "84.18150183",
        "SD3neg": "39.58858879"
    },
    {
        "L": "-0.652262297",
        "M": "55.64701131",
        "Month": "178",
        "S": "0.183277339",
        "SD0": "55.64701131",
        "SD1": "67.64140617",
        "SD1neg": "46.8009904",
        "SD2": "84.6004416",
        "SD2neg": "40.05932169",
        "SD3": "84.7004416",
        "SD3neg": "39.95932169"
    },
    {
        "L": "-0.658551638",
        "M": "56.07116407",
        "Month": "179",
        "S": "0.182472427",
        "SD0": "56.07116407",
        "SD1": "68.10316314",
        "SD1neg": "47.19588931",
        "SD2": "85.11634803",
        "SD2neg": "40.42984721",
        "SD3": "85.21634803",
        "SD3neg": "40.32984721"
    },
    {
        "L": "-0.665609025",
        "M": "56.49095862",
        "Month": "180",
        "S": "0.181665781",
        "SD0": "56.49095862",
        "SD1": "68.55964372",
        "SD1neg": "47.58825704",
        "SD2": "85.62911332",
        "SD2neg": "40.79979433",
        "SD3": "85.72911332",
        "SD3neg": "40.69979433"
    },
    {
        "L": "-0.673425951",
        "M": "56.90610886",
        "Month": "181",
        "S": "0.18085918",
        "SD0": "56.90610886",
        "SD1": "69.01063465",
        "SD1neg": "47.97776057",
        "SD2": "86.13864786",
        "SD2neg": "41.16880107",
        "SD3": "86.23864786",
        "SD3neg": "41.06880107"
    },
    {
        "L": "-0.681987284",
        "M": "57.31634059",
        "Month": "182",
        "S": "0.180054395",
        "SD0": "57.31634059",
        "SD1": "69.45593232",
        "SD1neg": "48.36406917",
        "SD2": "86.64484187",
        "SD2neg": "41.5364941",
        "SD3": "86.74484187",
        "SD3neg": "41.4364941"
    },
    {
        "L": "-0.691273614",
        "M": "57.72138846",
        "Month": "183",
        "S": "0.179253153",
        "SD0": "57.72138846",
        "SD1": "69.89533936",
        "SD1neg": "48.74685527",
        "SD2": "87.14757191",
        "SD2neg": "41.90249424",
        "SD3": "87.24757191",
        "SD3neg": "41.80249424"
    },
    {
        "L": "-0.701261055",
        "M": "58.12099696",
        "Month": "184",
        "S": "0.178457127",
        "SD0": "58.12099696",
        "SD1": "70.32866521",
        "SD1neg": "49.1257956",
        "SD2": "87.64669994",
        "SD2neg": "42.26641781",
        "SD3": "87.74669994",
        "SD3neg": "42.16641781"
    },
    {
        "L": "-0.711921092",
        "M": "58.51492143",
        "Month": "185",
        "S": "0.177667942",
        "SD0": "58.51492143",
        "SD1": "70.75572677",
        "SD1neg": "49.50057241",
        "SD2": "88.14207256",
        "SD2neg": "42.62787798",
        "SD3": "88.24207256",
        "SD3neg": "42.52787798"
    },
    {
        "L": "-0.723218488",
        "M": "58.90293208",
        "Month": "186",
        "S": "0.176887192",
        "SD0": "58.90293208",
        "SD1": "71.17635212",
        "SD1neg": "49.87087488",
        "SD2": "88.63351461",
        "SD2neg": "42.98648297",
        "SD3": "88.73351461",
        "SD3neg": "42.88648297"
    },
    {
        "L": "-0.735121189",
        "M": "59.28479948",
        "Month": "187",
        "S": "0.176116307",
        "SD0": "59.28479948",
        "SD1": "71.59036531",
        "SD1neg": "50.23639955",
        "SD2": "89.12085627",
        "SD2neg": "43.34185482",
        "SD3": "89.22085627",
        "SD3neg": "43.24185482"
    },
    {
        "L": "-0.747580416",
        "M": "59.66032626",
        "Month": "188",
        "S": "0.175356814",
        "SD0": "59.66032626",
        "SD1": "71.99761856",
        "SD1neg": "50.59685311",
        "SD2": "89.6038771",
        "SD2neg": "43.69359675",
        "SD3": "89.7038771",
        "SD3neg": "43.59359675"
    },
    {
        "L": "-0.760550666",
        "M": "60.02931704",
        "Month": "189",
        "S": "0.174610071",
        "SD0": "60.02931704",
        "SD1": "72.39796116",
        "SD1neg": "50.95195209",
        "SD2": "90.08236108",
        "SD2neg": "44.04132945",
        "SD3": "90.18236108",
        "SD3neg": "43.94132945"
    },
    {
        "L": "-0.773984558",
        "M": "60.39158721",
        "Month": "190",
        "S": "0.173877336",
        "SD0": "60.39158721",
        "SD1": "72.79124842",
        "SD1neg": "51.3014242",
        "SD2": "90.55608229",
        "SD2neg": "44.38468337",
        "SD3": "90.65608229",
        "SD3neg": "44.28468337"
    },
    {
        "L": "-0.787817728",
        "M": "60.74698785",
        "Month": "191",
        "S": "0.173159953",
        "SD0": "60.74698785",
        "SD1": "73.17736635",
        "SD1neg": "51.64501182",
        "SD2": "91.02475992",
        "SD2neg": "44.72327594",
        "SD3": "91.12475992",
        "SD3neg": "44.62327594"
    },
    {
        "L": "-0.801993069",
        "M": "61.09536847",
        "Month": "192",
        "S": "0.172459052",
        "SD0": "61.09536847",
        "SD1": "73.55619419",
        "SD1neg": "51.98246986",
        "SD2": "91.48812818",
        "SD2neg": "45.05675274",
        "SD3": "91.58812818",
        "SD3neg": "44.95675274"
    },
    {
        "L": "-0.816446409",
        "M": "61.43660077",
        "Month": "193",
        "S": "0.171775726",
        "SD0": "61.43660077",
        "SD1": "73.92762802",
        "SD1neg": "52.31356898",
        "SD2": "91.94589388",
        "SD2neg": "45.38476568",
        "SD3": "92.04589388",
        "SD3neg": "45.28476568"
    },
    {
        "L": "-0.831110299",
        "M": "61.77057372",
        "Month": "194",
        "S": "0.171110986",
        "SD0": "61.77057372",
        "SD1": "74.29157578",
        "SD1neg": "52.63809633",
        "SD2": "92.39774689",
        "SD2neg": "45.70698058",
        "SD3": "92.49774689",
        "SD3neg": "45.60698058"
    },
    {
        "L": "-0.845914498",
        "M": "62.09719399",
        "Month": "195",
        "S": "0.170465756",
        "SD0": "62.09719399",
        "SD1": "74.64795752",
        "SD1neg": "52.95585665",
        "SD2": "92.84336081",
        "SD2neg": "46.02307937",
        "SD3": "92.94336081",
        "SD3neg": "45.92307937"
    },
    {
        "L": "-0.860786514",
        "M": "62.41638628",
        "Month": "196",
        "S": "0.169840869",
        "SD0": "62.41638628",
        "SD1": "74.99670565",
        "SD1neg": "53.26667342",
        "SD2": "93.28239409",
        "SD2neg": "46.33276222",
        "SD3": "93.38239409",
        "SD3neg": "46.23276222"
    },
    {
        "L": "-0.875652181",
        "M": "62.72809362",
        "Month": "197",
        "S": "0.169237063",
        "SD0": "62.72809362",
        "SD1": "75.33776515",
        "SD1neg": "53.57038988",
        "SD2": "93.71449136",
        "SD2neg": "46.63574957",
        "SD3": "93.81449136",
        "SD3neg": "46.53574957"
    },
    {
        "L": "-0.890436283",
        "M": "63.03227756",
        "Month": "198",
        "S": "0.168654971",
        "SD0": "63.03227756",
        "SD1": "75.67109372",
        "SD1neg": "53.8668701",
        "SD2": "94.13928494",
        "SD2neg": "46.93178424",
        "SD3": "94.23928494",
        "SD3neg": "46.83178424"
    },
    {
        "L": "-0.905063185",
        "M": "63.32891841",
        "Month": "199",
        "S": "0.168095124",
        "SD0": "63.32891841",
        "SD1": "75.99666189",
        "SD1neg": "54.15599991",
        "SD2": "94.55639655",
        "SD2neg": "47.22063329",
        "SD3": "94.65639655",
        "SD3neg": "47.12063329"
    },
    {
        "L": "-0.91945749",
        "M": "63.61801537",
        "Month": "200",
        "S": "0.16755794",
        "SD0": "63.61801537",
        "SD1": "76.31445315",
        "SD1neg": "54.43768785",
        "SD2": "94.96543953",
        "SD2neg": "47.50208984",
        "SD3": "95.06543953",
        "SD3neg": "47.40208984"
    },
    {
        "L": "-0.933544683",
        "M": "63.89958662",
        "Month": "201",
        "S": "0.167043722",
        "SD0": "63.89958662",
        "SD1": "76.62446402",
        "SD1neg": "54.71186588",
        "SD2": "95.36602111",
        "SD2neg": "47.7759747",
        "SD3": "95.46602111",
        "SD3neg": "47.6759747"
    },
    {
        "L": "-0.947251765",
        "M": "64.17366943",
        "Month": "202",
        "S": "0.166552654",
        "SD0": "64.17366943",
        "SD1": "76.92670413",
        "SD1neg": "54.97849024",
        "SD2": "95.75774487",
        "SD2neg": "48.04213789",
        "SD3": "95.85774487",
        "SD3neg": "47.94213789"
    },
    {
        "L": "-0.960507855",
        "M": "64.44032016",
        "Month": "203",
        "S": "0.166084798",
        "SD0": "64.44032016",
        "SD1": "77.2211963",
        "SD1neg": "55.23754194",
        "SD2": "96.14021361",
        "SD2neg": "48.30045982",
        "SD3": "96.24021361",
        "SD3neg": "48.20045982"
    },
    {
        "L": "-0.973244762",
        "M": "64.69961427",
        "Month": "204",
        "S": "0.16564009",
        "SD0": "64.69961427",
        "SD1": "77.50797664",
        "SD1neg": "55.48902733",
        "SD2": "96.51303247",
        "SD2neg": "48.55085239",
        "SD3": "96.61303247",
        "SD3neg": "48.45085239"
    },
    {
        "L": "-0.985397502",
        "M": "64.95164625",
        "Month": "205",
        "S": "0.165218341",
        "SD0": "64.95164625",
        "SD1": "77.78709463",
        "SD1neg": "55.73297837",
        "SD2": "96.87581217",
        "SD2neg": "48.79325974",
        "SD3": "96.97581217",
        "SD3neg": "48.69325974"
    },
    {
        "L": "-0.996904762",
        "M": "65.1965295",
        "Month": "206",
        "S": "0.164819236",
        "SD0": "65.1965295",
        "SD1": "78.05861325",
        "SD1neg": "55.96945287",
        "SD2": "97.22817246",
        "SD2neg": "49.02765874",
        "SD3": "97.32817246",
        "SD3neg": "48.92765874"
    },
    {
        "L": "-1.007705555",
        "M": "65.43440186",
        "Month": "207",
        "S": "0.16444238",
        "SD0": "65.43440186",
        "SD1": "78.32261531",
        "SD1neg": "56.19853482",
        "SD2": "97.56973453",
        "SD2neg": "49.25405329",
        "SD3": "97.66973453",
        "SD3neg": "49.15405329"
    },
    {
        "L": "-1.017756047",
        "M": "65.66540015",
        "Month": "208",
        "S": "0.164087103",
        "SD0": "65.66540015",
        "SD1": "78.57917651",
        "SD1neg": "56.42033246",
        "SD2": "97.90017562",
        "SD2neg": "49.47250008",
        "SD3": "98.00017562",
        "SD3neg": "49.37250008"
    },
    {
        "L": "-1.027002713",
        "M": "65.88970117",
        "Month": "209",
        "S": "0.163752791",
        "SD0": "65.88970117",
        "SD1": "78.82841015",
        "SD1neg": "56.63498069",
        "SD2": "98.21914995",
        "SD2neg": "49.68306556",
        "SD3": "98.31914995",
        "SD3neg": "49.58306556"
    },
    {
        "L": "-1.035402243",
        "M": "66.10749114",
        "Month": "210",
        "S": "0.163438661",
        "SD0": "66.10749114",
        "SD1": "79.07043501",
        "SD1neg": "56.84263826",
        "SD2": "98.5263538",
        "SD2neg": "49.88585603",
        "SD3": "98.6263538",
        "SD3neg": "49.78585603"
    },
    {
        "L": "-1.042916356",
        "M": "66.31897311",
        "Month": "211",
        "S": "0.163143825",
        "SD0": "66.31897311",
        "SD1": "79.30538438",
        "SD1neg": "57.04348732",
        "SD2": "98.82151395",
        "SD2neg": "50.08100805",
        "SD3": "98.92151395",
        "SD3neg": "49.98100805"
    },
    {
        "L": "-1.049511871",
        "M": "66.52436618",
        "Month": "212",
        "S": "0.162867311",
        "SD0": "66.52436618",
        "SD1": "79.53340627",
        "SD1neg": "57.23773222",
        "SD2": "99.10439257",
        "SD2neg": "50.26868682",
        "SD3": "99.20439257",
        "SD3neg": "50.16868682"
    },
    {
        "L": "-1.055160732",
        "M": "66.72390443",
        "Month": "213",
        "S": "0.162608072",
        "SD0": "66.72390443",
        "SD1": "79.7546637",
        "SD1neg": "57.42559774",
        "SD2": "99.37479277",
        "SD2neg": "50.44908414",
        "SD3": "99.47479277",
        "SD3neg": "50.34908414"
    },
    {
        "L": "-1.059840019",
        "M": "66.91783563",
        "Month": "214",
        "S": "0.162365006",
        "SD0": "66.91783563",
        "SD1": "79.9693349",
        "SD1neg": "57.60732723",
        "SD2": "99.63256404",
        "SD2neg": "50.62241598",
        "SD3": "99.73256404",
        "SD3neg": "50.52241598"
    },
    {
        "L": "-1.063531973",
        "M": "67.10641956",
        "Month": "215",
        "S": "0.162136973",
        "SD0": "67.10641956",
        "SD1": "80.17761342",
        "SD1neg": "57.78318009",
        "SD2": "99.87760862",
        "SD2neg": "50.78891966",
        "SD3": "99.97760862",
        "SD3neg": "50.68891966"
    },
    {
        "L": "-1.066224038",
        "M": "67.28992603",
        "Month": "216",
        "S": "0.161922819",
        "SD0": "67.28992603",
        "SD1": "80.37970818",
        "SD1neg": "57.95342903",
        "SD2": "100.109888",
        "SD2neg": "50.94885064",
        "SD3": "100.209888",
        "SD3neg": "50.84885064"
    },
    {
        "L": "-1.067908908",
        "M": "67.46863255",
        "Month": "217",
        "S": "0.161721398",
        "SD0": "67.46863255",
        "SD1": "80.57584337",
        "SD1neg": "58.11835675",
        "SD2": "100.32943",
        "SD2neg": "51.10247883",
        "SD3": "100.42943",
        "SD3neg": "51.00247883"
    },
    {
        "L": "-1.068589885",
        "M": "67.64281378",
        "Month": "218",
        "S": "0.16153153",
        "SD0": "67.64281378",
        "SD1": "80.76624902",
        "SD1neg": "58.27825247",
        "SD2": "100.5363497",
        "SD2neg": "51.25009366",
        "SD3": "100.6363497",
        "SD3neg": "51.15009366"
    },
    {
        "L": "-1.068261146",
        "M": "67.8127675",
        "Month": "219",
        "S": "0.161352313",
        "SD0": "67.8127675",
        "SD1": "80.95119622",
        "SD1neg": "58.43340638",
        "SD2": "100.7308068",
        "SD2neg": "51.3919643",
        "SD3": "100.8308068",
        "SD3neg": "51.2919643"
    },
    {
        "L": "-1.066933756",
        "M": "67.97877331",
        "Month": "220",
        "S": "0.161182785",
        "SD0": "67.97877331",
        "SD1": "81.13095038",
        "SD1neg": "58.58410681",
        "SD2": "100.9130787",
        "SD2neg": "51.52838066",
        "SD3": "101.0130787",
        "SD3neg": "51.42838066"
    },
    {
        "L": "-1.064620976",
        "M": "68.14111022",
        "Month": "221",
        "S": "0.161022184",
        "SD0": "68.14111022",
        "SD1": "81.30579779",
        "SD1neg": "58.73063342",
        "SD2": "101.0835325",
        "SD2neg": "51.65962058",
        "SD3": "101.1835325",
        "SD3neg": "51.55962058"
    },
    {
        "L": "-1.061341755",
        "M": "68.30004741",
        "Month": "222",
        "S": "0.160869943",
        "SD0": "68.30004741",
        "SD1": "81.47603937",
        "SD1neg": "58.87325135",
        "SD2": "101.2426422",
        "SD2neg": "51.78594918",
        "SD3": "101.3426422",
        "SD3neg": "51.68594918"
    },
    {
        "L": "-1.057116957",
        "M": "68.4558454",
        "Month": "223",
        "S": "0.160725793",
        "SD0": "68.4558454",
        "SD1": "81.64199717",
        "SD1neg": "59.01220466",
        "SD2": "101.3909863",
        "SD2neg": "51.90760485",
        "SD3": "101.4909863",
        "SD3neg": "51.80760485"
    },
    {
        "L": "-1.051988979",
        "M": "68.60872174",
        "Month": "224",
        "S": "0.160589574",
        "SD0": "68.60872174",
        "SD1": "81.80398126",
        "SD1neg": "59.14770829",
        "SD2": "101.5293134",
        "SD2neg": "52.0248233",
        "SD3": "101.6293134",
        "SD3neg": "51.9248233"
    },
    {
        "L": "-1.04599033",
        "M": "68.75889263",
        "Month": "225",
        "S": "0.1604617",
        "SD0": "68.75889263",
        "SD1": "81.96234324",
        "SD1neg": "59.27994062",
        "SD2": "101.6584602",
        "SD2neg": "52.13777577",
        "SD3": "101.7584602",
        "SD3neg": "52.03777577"
    },
    {
        "L": "-1.039168248",
        "M": "68.90653028",
        "Month": "226",
        "S": "0.160342924",
        "SD0": "68.90653028",
        "SD1": "82.11743473",
        "SD1neg": "59.40903385",
        "SD2": "101.7794321",
        "SD2neg": "52.24659946",
        "SD3": "101.8794321",
        "SD3neg": "52.14659946"
    },
    {
        "L": "-1.031579574",
        "M": "69.05176427",
        "Month": "227",
        "S": "0.160234478",
        "SD0": "69.05176427",
        "SD1": "82.26961659",
        "SD1neg": "59.53506416",
        "SD2": "101.8933975",
        "SD2neg": "52.35137754",
        "SD3": "101.9933975",
        "SD3neg": "52.25137754"
    },
    {
        "L": "-1.023291946",
        "M": "69.19467288",
        "Month": "228",
        "S": "0.160138158",
        "SD0": "69.19467288",
        "SD1": "82.41925734",
        "SD1neg": "59.65804088",
        "SD2": "102.0017012",
        "SD2neg": "52.45212848",
        "SD3": "102.1017012",
        "SD3neg": "52.35212848"
    },
    {
        "L": "-1.014385118",
        "M": "69.33527376",
        "Month": "229",
        "S": "0.160056393",
        "SD0": "69.33527376",
        "SD1": "82.56673148",
        "SD1neg": "59.77789469",
        "SD2": "102.1058783",
        "SD2neg": "52.54879465",
        "SD3": "102.2058783",
        "SD3neg": "52.44879465"
    },
    {
        "L": "-1.004952366",
        "M": "69.47351373",
        "Month": "230",
        "S": "0.159992344",
        "SD0": "69.47351373",
        "SD1": "82.71241749",
        "SD1neg": "59.89446487",
        "SD2": "102.2076685",
        "SD2neg": "52.64122987",
        "SD3": "102.3076685",
        "SD3neg": "52.54122987"
    },
    {
        "L": "-0.995101924",
        "M": "69.60925782",
        "Month": "231",
        "S": "0.159949989",
        "SD0": "69.60925782",
        "SD1": "82.8566957",
        "SD1neg": "60.00748546",
        "SD2": "102.3090317",
        "SD2neg": "52.72918596",
        "SD3": "102.4090317",
        "SD3neg": "52.62918596"
    },
    {
        "L": "-0.984958307",
        "M": "69.74227758",
        "Month": "232",
        "S": "0.159934231",
        "SD0": "69.74227758",
        "SD1": "82.99994599",
        "SD1neg": "60.11657044",
        "SD2": "102.4121643",
        "SD2neg": "52.81229806",
        "SD3": "102.5121643",
        "SD3neg": "52.71229806"
    },
    {
        "L": "-0.974663325",
        "M": "69.87223885",
        "Month": "233",
        "S": "0.159951004",
        "SD0": "69.87223885",
        "SD1": "83.14254526",
        "SD1neg": "60.22119779",
        "SD2": "102.5195159",
        "SD2neg": "52.89006853",
        "SD3": "102.6195159",
        "SD3neg": "52.79006853"
    },
    {
        "L": "-0.964376555",
        "M": "69.99868896",
        "Month": "234",
        "S": "0.160007394",
        "SD0": "69.99868896",
        "SD1": "83.28486509",
        "SD1neg": "60.32069255",
        "SD2": "102.6338067",
        "SD2neg": "52.96184905",
        "SD3": "102.7338067",
        "SD3neg": "52.86184905"
    },
    {
        "L": "-0.954274945",
        "M": "70.12104381",
        "Month": "235",
        "S": "0.160111769",
        "SD0": "70.12104381",
        "SD1": "83.42726937",
        "SD1neg": "60.41420871",
        "SD2": "102.7580457",
        "SD2neg": "53.02682064",
        "SD3": "102.8580457",
        "SD3neg": "52.92682064"
    },
    {
        "L": "-0.944551187",
        "M": "70.23857482",
        "Month": "236",
        "S": "0.160273918",
        "SD0": "70.23857482",
        "SD1": "83.57011206",
        "SD1neg": "60.5007102",
        "SD2": "102.8955489",
        "SD2neg": "53.08397124",
        "SD3": "102.9955489",
        "SD3neg": "52.98397124"
    },
    {
        "L": "-0.935410427",
        "M": "70.35039626",
        "Month": "237",
        "S": "0.160505203",
        "SD0": "70.35039626",
        "SD1": "83.71373552",
        "SD1neg": "60.57895085",
        "SD2": "103.0499578",
        "SD2neg": "53.13207024",
        "SD3": "103.1499578",
        "SD3neg": "53.03207024"
    },
    {
        "L": "-0.927059784",
        "M": "70.45546105",
        "Month": "238",
        "S": "0.160818788",
        "SD0": "70.45546105",
        "SD1": "83.85847723",
        "SD1neg": "60.64745391",
        "SD2": "103.2252423",
        "SD2neg": "53.1696312",
        "SD3": "103.3252423",
        "SD3neg": "53.0696312"
    },
    {
        "L": "-0.919718461",
        "M": "70.55252127",
        "Month": "239",
        "S": "0.161229617",
        "SD0": "70.55252127",
        "SD1": "84.00464006",
        "SD1neg": "60.70448826",
        "SD2": "103.4257728",
        "SD2neg": "53.19490909",
        "SD3": "103.5257728",
        "SD3neg": "53.09490909"
    },
    {
        "L": "-0.91648762",
        "M": "70.59761453",
        "Month": "240",
        "S": "0.161476792",
        "SD0": "70.6401583",
        "SD1": "84.15253397",
        "SD1neg": "60.7480483",
        "SD2": "103.6562615",
        "SD2neg": "53.20582012",
        "SD3": "103.7562615",
        "SD3neg": "53.10582012"
    }
];

// var wfa_boys_2_20_zscores_meta =

var wfa_boys_2_20 = {
  "meta" : wfa_boys_2_20_meta,
  "data" : wfa_boys_2_20_zscores_data
};

// Growth chart baselines
// Based on Haiti child growth chart from age 0 to 5 years (60 months)  // Needs meta data to lay out which lines should exist and what their names are
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

var haitiData = [{"Month":0,"normal":3.4,"mal":2.4,"smal":2},{"Month":6,"normal":8,"mal":5.5,"smal":4.6},{"Month":12,"normal":10.3,"mal":7.8,"smal":6.5},{"Month":18,"normal":11.5,"mal":8.7,"smal":7.3},{"Month":24,"normal":12.5,"mal":9.6,"smal":8.1},{"Month":30,"normal":13.7,"mal":10.5,"smal":9},{"Month":36,"normal":14.8,"mal":11.4,"smal":9.8},{"Month":42,"normal":15.7,"mal":12,"smal":10.3},{"Month":48,"normal":16.7,"mal":12.8,"smal":10.9},{"Month":54,"normal":17.8,"mal":13.5,"smal":11.5},{"Month":60,"normal":18.7,"mal":14.2,"smal":12}];

var haiti = {
  "meta" : haitiMeta,
  "data" : haitiData
};