var pdf;

var drop = d3.select('#pdf-dropzone');
drop.style('height', '100%');

Dropzone.options.pdfDropzone = {
  paramName: "file", // The name that will be used to transfer the file
  clickable: false,
  maxFilesize: 100, // MB
  dictDefaultMessage: "Upload any PDF to make it into a scroll",
  previewTemplate: '<div></div>',
  init: function() {
    this.on("dragenter", function(e) {drop.select('div').style('color', '#008ae6')});
    this.on("dragleave", function(e) {drop.select('div').style('color', null)});
    this.on("addedfile", function(e) {drop.select('div').style('color', null)});
  },
  accept: function(file, done) {
    var reader = new FileReader();
    reader.onloadstart = function(event) {
      console.log("loading");
    }

    reader.onload = function(event) {
      var contents = event.target.result,
          error    = event.target.error;

      if(error != null) {
        console.error("File could not be read, code: " + error.code);
      }
      // } else {
      //   console.log("Contents: " + contents);
      // }

      readPDF(new Uint8Array(contents));
      drop.style('height', 'auto');
    }
    reader.readAsArrayBuffer(file);
  }
};

// var data = new Uint8Array(fs.readFileSync('BillinghurstBookMarch2016.pdf'))
// PDFJS.getDocument(data).then(function (pdfDoc) {
//   console.log('Loaded pdf, number of pages: ' + pdfDoc.numPages);
// })


var pages = [];
var npages = 0;
var currPage = 0;

// Global variables for page dimensions
// I know this is probably not the JS way to do it, sue me
var PAGE_WIDTH = 25;
var PAGE_HEIGHT = 37;
var PAGE_SHIFT_X = 40;
var PAGE_SHIFT_Y = 37;
var PAGES_PER_COL = 20;
var FULL_PAGE_WIDTH = 820;
var FULL_PAGE_HEIGHT = 1060;


// Handle reading in dropped PDF
function readPDF(data) {
  PDFJS.getDocument(data).then( function (doc) {
    console.log('Loaded pdf, number of pages: ' + doc.numPages);
    pdf = doc;
    setNpages(doc.numPages);
    update();
    currPage = 0;
  })

  // Create PDF canvas for placement
  var canvas = d3.select("#viz")
    .append('div')
    .attr("id", "pdf-container")
    .style("position", "absolute")
    .style("left", "0")
    .style("top", "0")
    .style("display", "inline-block")
    .style("z-index", "1")
    .append("canvas")
    .attr("id", "pdf-canvas")
    .style("padding", "2px");

  }

  var svg = d3.select("#viz")
    .append("svg")
    .attr("id", "viz-svg")
    .attr("width", "100%")
    .attr("height", FULL_PAGE_HEIGHT)
    .style("padding", "10px");

//   #pdf-container {
//     position: absolute;
//     left: 0;
//     top: 0;
//     display: inline-block;
//     z-index: 1;
// }
  // .attr("width", FULL_PAGE_WIDTH)
  // .attr("height", FULL_PAGE_HEIGHT);

function setNpages(n)
{
  // Depending on new value of npages, push/pop new pages to end
  if(n > npages)
  {
    for(var i = 0; i < (n-npages); i++)
    {
      pages.push({
        index: i
      });
    }
  }
  else if(n < npages)
  {
    for(var i = 0; i < (npages-n); i++)
    {
      pages.pop();
    }
  }
  // $('#npages-slider').slider( "option", "value", n);
  // $('#currpage-handle').slider( "option", "max", n);
  npages = n;

  // Initalize current page slider
  $(function() {
    var handle = $("#currpage-handle");
    $("#currpage-slider").slider({
      min: 1,
      max: n,
      create: function() {
        handle.text($(this).slider("value"));
        currPage = $(this).slider("value")-1;
        update();
      },
      slide: function(event, ui) {
        handle.text(ui.value);
        currPage = ui.value-1;
        update();
      }
    });
  });

}

// Get position and dimensions of pages.
// depends on which page is currently open
function getPageX(d,i)
{
  x = parseInt(i / PAGES_PER_COL) * PAGE_SHIFT_X;
  if(i < currPage)
    return x;
  else if (i == currPage)
    return x + 2 * PAGE_SHIFT_X;
  else
    return x + 3 * PAGE_SHIFT_X + FULL_PAGE_WIDTH;
}

function getPageY(d,i)
{
  if(i == currPage)
    return 0;
  else
    return parseInt(i % PAGES_PER_COL) * PAGE_SHIFT_Y;
}

function getPageW(d,i)
{
  if(i == currPage)
    return FULL_PAGE_WIDTH;
  else
    return PAGE_WIDTH;
}

function getPageH(d,i)
{
  if(i == currPage)
    return FULL_PAGE_HEIGHT;
  else
    return PAGE_HEIGHT;
}

function update() {

  var selection = svg.selectAll('rect')
    .data(pages);

  selection.enter()
    .append('rect')
    .on('mouseover', function(d, i) {
      d3.select(this)
        .style('fill', '#008ae6');
      svg.append('text')
        .attr('id', 'hover-num')
        .attr('x', getPageX(d,i) + getPageW(d,i) / 2)
        .attr('y', getPageY(d,i) + getPageH(d,i) / 2)
        .style('font-size', 12)
        .style('cursor', 'default')
        .attr('text-anchor', 'middle')
        .style('fill', '#e2e3e3')
        .text(i+1);
      console.log('mouseover: ' + d3.select(this).select('text'));
    })
    .on('mouseout', function(d, i) {
      d3.select(this)
        .style('fill', '#e2e3e3');

      svg.select('#hover-num').remove();
    })
    .on('click', function(d,i) {
      currPage = i;
      update();
    });

  selection
    .attr('x', getPageX)
    .attr('y', getPageY)
    .attr('width', getPageW)
    .attr('height', getPageH)
    .attr('rx', 1)
    .attr('ry', 1)
    .style('stroke', '#000')
    .style('fill', '#e2e3e3');

  selection.exit().remove();

  // Update PDF canvas with new page
  if(pdf)
  {
    d3.select('#pdf-canvas')
      .datum(currPage)
      .each(function(d) {
        var p = parseInt(d) + 1;
        console.log("Getting page: " + p);

        // Fetch and render currPage
        pdf.getPage(p)
        .then(function (page) {

          //Resize PDF viewport to fit canvas
          //TODO: Make the border not a magic number
          var viewport = page.getViewport(1);
          sx = (FULL_PAGE_WIDTH - 4) / viewport.width;
          sy = (FULL_PAGE_HEIGHT - 4) / viewport.height;
          viewport = page.getViewport(Math.min(sx,sy))

          var c = document.getElementById('pdf-canvas');
          c.height = viewport.height
          c.width = viewport.width;
          var context = c.getContext('2d');
          var pageTimestamp = new Date().getTime();
          var timestamp = pageTimestamp;
          var renderContext = {
            canvasContext: context,
            viewport: viewport
            // continueCallback: function(cont) {
            //   if(timestamp != pageTimestamp) {
            //     return;
            //   }
            //   cont();
            // }
          };
          page.render(renderContext);
        })
        .catch(function (reason) {
          console.error('Page could not be rendered: ' + reason);
        });
      });

    // Position pdf to match current page rect
    s = $("#viz-svg");
    p = selection.filter(function(d,i) {return i == currPage;});
    console.log("p: " + p);
    c = d3.select("#pdf-container");

    cleft = (s.offset().left + (s.outerWidth(true) - s.width()) / 2
      + parseInt(p.attr('x'))) + "px";
    ctop = (s.offset().top + (s.outerHeight(true) - s.height()) / 2
      + parseInt(p.attr('y'))) + "px";

    console.log("moving pdf container to (" + cleft + ", " + ctop + ")");

    c.style('left', cleft);
    c.style('top', ctop);

    console.log("pdf container now at (" + c.style("left") + ", " + c.style("top") + ")");
  }
}
