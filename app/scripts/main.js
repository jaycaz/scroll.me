var pdf;

Dropzone.options.pdfDropzone = {
  paramName: "file", // The name that will be used to transfer the file
  maxFilesize: 100, // MB
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
    }
    reader.readAsArrayBuffer(file);

    done("ay boiiii");
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
var PAGES_PER_COL = 30;
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
}

var svg = d3.select("#viz")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .style("padding", "10px");

var canvas = svg.append('div')
  .attr("id", "pdf-container")
  .append("canvas")
  .attr("id", "pdf-canvas");
  // .attr("width", FULL_PAGE_WIDTH)
  // .attr("height", FULL_PAGE_HEIGHT);

function setNpages(n)
{
  // Depending on new value of npages, push/pop new pages to end
  if(n > npages)
  {
    for(var i = 0; i < (n-npages); i++)
    {
      pages.push({});
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
  if(i+1 < currPage)
    return x;
  else if (i+1 == currPage)
    return x + 2 * PAGE_SHIFT_X;
  else
    return x + 3 * PAGE_SHIFT_X + FULL_PAGE_WIDTH;
}

function getPageY(d,i)
{
  if(i+1 == currPage)
    return 0;
  else
    return parseInt(i % PAGES_PER_COL) * PAGE_SHIFT_Y;
}

function getPageW(d,i)
{
  if(i+1 == currPage)
    return FULL_PAGE_WIDTH;
  else
    return PAGE_WIDTH;
}

function getPageH(d,i)
{
  if(i+1 == currPage)
    return FULL_PAGE_HEIGHT;
  else
    return PAGE_HEIGHT;
}

function update() {

  var selection = svg.selectAll('rect')
    .data(pages);

  selection.enter()
    .append('rect');

  selection
    .attr('x', getPageX)
    .attr('y', getPageY)
    .attr('width', getPageW)
    .attr('height', getPageH)
    .attr('rx', 1)
    .attr('ry', 1)
    .style('stroke', '#000')
    .style('fill', '#e2e3e3');

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
          var viewport = page.getViewport(1);
          var c = document.getElementById('pdf-canvas');
          c.height = viewport.height;
          c.width = viewport.width;
          var context = c.getContext('2d');
          var pageTimestamp = new Date().getTime();
          var timestamp = pageTimestamp;
          var renderContext = {
            canvasContext: context,
            viewport: viewport,
            continueCallback: function(cont) {
              if(timestamp != pageTimestamp) {
                return;
              }
              cont();
            }
          };
          page.render(renderContext);
        })
        .catch(function (reason) {
          console.error('Page could not be rendered: ' + reason);
        });
      });

    // Position pdf to match current page rect
    p = selection.filter(function(d,i) {return i == currPage;});

    // d3.select("#pdf-container")
    //   .style('left', p.attr('x'))
    //   .style('top', p.attr('y'));
  }

  selection.exit().remove();
}
