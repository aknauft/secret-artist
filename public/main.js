var username, uniqueID;

var draw,
    eggs = []; // To hold each svg nest. Yeah, the metaphor is backwards...

var socket = io();


socket.on('welcome', function(d){
    uniqueID = d;
});

function highlightLines(id, opac){
    //console.log(id);
    eggs[id].yolk.opacity(opac);
    //eggs[id].yolk.stroke("#1914CC");
}
/* 
//Given points, return path
function smoothpath(points){
    // Remove ineffectual points (points which are bunched up)
        // http://karthaus.nl/rdp/ Ramer Doublas Peucker algorithm
            // Connect first and last; find point furthest from this line
                // If this point is within epsilon, remove it (and all other in-between points)
                // otherwise, split the points here and repeat.
        // https://bost.ocks.org/mike/simplify/ Visvalingam-Whyatt polyline simplification algorithm
            // Associate to each point an effective area [area of triangle with neighboring points]
            // Remove point with smallest effective area
            // Recompute neighboring effective areas, repeat*
    // interpolate between remaining points
    
    draw.polyline(points).attr({fill: 'none', stroke: '#1914CC', 'stroke-width': 1});
    jagged.stroke({width:0});
}
*/

var $nameInput = $('#name');
var $nounInput = $('#noun');
var $readyButton = $('#ready');
var $playerList = $('.player-list');
var playerReady = false;


function updateName(){
    username = cleanInput($nameInput.val());
    socket.emit('update:name', {
        name: username
    });
}

function setPlayerReady(b){
    playerReady = b;
    if(playerReady){
        $readyButton.hide();
        $nameInput.addClass('ready');
        $nounInput.addClass('ready');
        if($.trim($nameInput.val()).length<1){
            $nameInput.val(sampleNames[Math.floor(Math.random()*sampleNames.length)]);
            updateName();
        }
        if($.trim($nounInput.val()).length<1){
            $nounInput.val(sampleNouns[Math.floor(Math.random()*sampleNouns.length)]);
        }
    }
    else{
        $readyButton.show();
        $nameInput.removeClass('ready');
        $nounInput.removeClass('ready');
    }
        socket.emit('ready',{
            ready: playerReady,
            name: username,
            noun: cleanInput($nounInput.val())
        });
}


socket.on('update:playerlist', function(d){
    var newPlayers = d.players;
    var arr = []; //http://allthingscraig.com/blog/2012/09/28/best-practice-appending-items-to-the-dom-using-jquery/
    
    for(var i=0; i<newPlayers.length; i++){
        arr.push('<li id = "' + newPlayers[i].id+'" class="' + newPlayers[i].id);
        if(newPlayers[i].ready)
            arr.push(' ready');
        arr.push('">');
        arr.push(newPlayers[i].name);
        arr.push('</li>');
    }
    $('.player-list').html(arr.join(''));
    // Should probably want some way to kick a player... for example, player left the browser window open, and now we can't start.
    // Or, we could just start without kicking. That might be better.
    
//    var li = $('#'+d.id);
//    if(li.length === 0)
//        $playerList.append("<li id="+d.id+">"+d.name+"</li>");
//    $('#'+d.id).text(d.name);
    // Add new li to playlist, if one does not already exist for d.id
    // Content is d.name
    // if d.ready, class should be "ready"
    
});

socket.on('start', function(d){
   $('.lobby').hide();
   $('.game').show();

   $('.ready').removeClass('ready');   
   $playerList.on('click', function(e){
       var target = $(e.target);
       if(target.hasClass('selected')){
           target.removeClass('selected');
           highlightLines(target.attr('id'), 1);
       }
       else{
           target.addClass('selected');
           highlightLines(target.attr('id'), 0.5);
       }
   });

   
   
   
   
   draw = SVG('whiteboard');
   for(var i=0; i<d.length; i++){
       eggs[d[i]] = {yolk: draw.group(), lines: []};  
   }

    var lineNum = 0;
    var prevline = 0;
    var path = [];
    var currline;
   
   draw.on('mousedown', function(e){e.preventDefault(); startLine()});
    draw.on('touchstart', function(e){e.preventDefault(); startLine()});

    draw.on('mousemove', function(e){
        e.preventDefault();
       //console.log(e.offsetX, e.offsetY);
       moveLine(e.offsetX, e.offsetY);
    });
    draw.on('touchmove', function(e){
        e.preventDefault();
        var target = e.currentTarget;
        var touch = e.touches[0];
        var pos = touchOffset(touch, target);
        moveLine(pos.x, pos.y);
    });
    draw.on('mouseup', function(e){e.preventDefault(); endLine()});
    draw.on('touchend touchcancel',function(e){e.preventDefault(); endLine()});
/*
*/
    function startLine(){
    //prevline = lineNum;
        lineNum++;
        path = [];
        currline = eggs[uniqueID].yolk.polyline();
        //currline.addClass('progress');
        currline.attr({fill:'none', stroke: '#FF9F40', 'stroke-width': 4});
        //currline.opacity(1); 
    }
    function moveLine(offx, offy){
       if(lineNum !== prevline){
            path.push([offx, offy]);
            currline.plot(path);
        }
        socket.emit('drawing', {
            id: uniqueID,
            n: lineNum,
            points: path
        });        
    }
    function endLine(){
               //console.log(e);
       prevline = lineNum; // Done drawing
        currline.attr({fill:'none', stroke: '#FF9F40', 'stroke-width': 4}); 
        //currline.opacity(1);
        eggs[uniqueID].lines[lineNum] = currline
        socket.emit('drawing', {
            id: uniqueID,
            n: lineNum,
            points: path
        });
    }









    socket.on('draw', function(data){
        //eggs[data.id] = eggs[data.id] || {yolk: draw.nested(), lines: []}; // 
        var line = eggs[data.id].lines[data.n];
        if(!line){
            line = eggs[data.id].yolk.polyline();
            line.attr({fill:'none', stroke: '#FF9F40', 'stroke-width': 4});
            //line.addClass('other');
            line.addClass(data.id);
            eggs[data.id].lines[data.n] = line;
        }
        line.plot(data.points);
    });  
});

socket.on('reveal noun', function(d){
    $('#nounspace').text("You are drawing: "+d.noun);
});

$('#name').on('focusout', function(){
    updateName();
});
$('#name').on('focus', function(){
    if(playerReady){setPlayerReady(false)};
});
$('#noun').on('focus', function(){
    if(playerReady){setPlayerReady(false)};
});
$('#ready').on('click', function(){
    setPlayerReady(true);
});

$('#nounhide').on('click', function(){
    $('#nounspace').toggle();
});


  // Prevents input from having injected markup
function cleanInput(input) {
    return $('<div/>').text(input).text();
}


function touchOffset (ev, target, out) {
  target = target || ev.currentTarget || ev.srcElement
  if (!Array.isArray(out)) {
    out = {x:0,y: 0 }
  }
  var cx = ev.clientX || 0
  var cy = ev.clientY || 0
  var rect = getBoundingClientOffset(target)
  out.x = cx - rect.left
  out.y = cy - rect.top
  return out
}

function getBoundingClientOffset (element) {
  if (element === window ||
      element === document ||
      element === document.body) {
    return {left:0, top:0};
  } else {
    return element.getBoundingClientRect()
  }
}

//If I push these onto the server, new games can have the possibility of generating previous noun submissions. Which might be nice. 
var sampleNouns = ["Pinch","Roof","Blind","Hoop","Violin","Coil","Goldfish","Frankenstein","Stairs","Dog","String","Fetch","Cage","Mailbox","Spider man","Puppet","Penguin","Shovel","Popcorn","Butter"]
var sampleNames = ["Adam Mann","Alan Scott","Alexander Joseph Luthor","Barabara Gordon","Barbara Gordon","Barry Allen","Beth Chapel","Bruce Wayne","Dick Grayson","Hal Jordan","Jason Todd","Jim Harper","Kitty Pryde","Kyle Rayner","Matthew Murdock","Natalia Romanova","Oliver Queen","Robert (Bruce) Banner","Roy Harper","Salina Kyle","Scott Summers","Sean Cassidy","Slade Wilson","Steven Rogers","Victor Stone","Victor Von Doom","Wally West"]