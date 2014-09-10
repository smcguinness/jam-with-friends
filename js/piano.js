/*! Copyright (c) 2013 - Peter Coles (mrcoles.com)
 *  Licensed under the MIT license: http://mrcoles.com/media/mit-license.txt
 */

(function() {

  //
  // Setup keys!
  //

  var notesOffset = 0;

  var blackKeys = {
    1: 1,
    3: 3,
    6: 1,
    8: 2,
    10: 3
  };
  $.each(blackKeys, function(k, v) {
    blackKeys[k] = ' black black'+v;;
  });

  function blackKeyClass(i) {
    return blackKeys[(i % 12) + (i < 0 ? 12 : 0)] || '';
  }

  var $keys = $('<div>', {'class': 'keys'}).appendTo('#piano');

  var buildingPiano = false;

  var isIos = navigator.userAgent.match(/(iPhone|iPad)/i);

  function buildPiano() {
    if (buildingPiano) return;
    buildingPiano = true;

    $keys.trigger('build-start.piano');
    $keys.empty().off('.play');

    function addKey(i) {
      var dataURI = isIos ? '' : Notes.getDataURI(i);

      // trick to deal with note getting hit multiple times before finishing...
      var sounds = [
        new Audio(dataURI),
        new Audio(dataURI),
        new Audio(dataURI)
      ];
      var curSound = 0;
      var pressedTimeout;
      dataURI = null;
      function play(evt) {
        // sound
        sounds[curSound].pause();
        try {
          sounds[curSound].currentTime = 0.001; //HACK - was for mobile safari, but sort of doesn't matter...
        } catch (x) {
          console.log(x);
        }
        sounds[curSound].play();
        curSound = ++curSound % sounds.length;

        var $k = $keys.find('[data-key='+i+']').addClass('pressed');

        //TODO - it'd be nice to have a single event for triggering and reading
        $keys.trigger('played-note.piano', [i, $k]);

        // visual feedback
        window.clearTimeout(pressedTimeout);
        pressedTimeout = window.setTimeout(function() {
          $k.removeClass('pressed');
        }, 200);
      }
      $keys.on('note-'+i+'.play', play);
      var $key = $('<div>', {
        'class': 'key' + blackKeyClass(i),
        'data-key': i,
        mousedown: function(evt) { triggerKey(i); }
      }).appendTo($keys);
    }

    // delayed for-loop to stop browser from crashing :'(
    // go slower on Chrome...
    var i = -12, max = 14, addDelay = /Chrome/i.test(navigator.userAgent) ? 80 : 0;
    (function go() {
      addKey(i + notesOffset);
      if (++i < max) {
        window.setTimeout(go, addDelay);
      } else {
        buildingPiano = false;
        $keys.trigger('build-done.piano');
      }
    })();
  }

  buildPiano();


  //
  // Setup synth controls
  //

  function camelToText(x) {
    x = x.replace(/([A-Z])/g, ' $1');
    return x.charAt(0).toUpperCase() + x.substring(1);
  }

  $.each(['volume', 'style'], function(i, setting) {
    var $opts = $('<div>', {
      'class': 'opts',
      html: '<p><strong>' + camelToText(setting) + ':</strong></p>'
    }).appendTo('#synth-settings');

    $.each(DataGenerator[setting], function(name, fn) {
      if (name != 'default') {
        $('<p>')
          .append($('<a>', {
            text: camelToText(name),
            href: '#',
            'class': fn === DataGenerator[setting].default ? 'selected' : '',
            click: function(evt) {
              evt.preventDefault();
              DataGenerator[setting].default = fn;
              buildPiano();
              var $this = $(this);
              $this.closest('.opts').find('.selected').removeClass('selected');
              $this.addClass('selected');
            }
          }))
          .appendTo($opts);
      }
    });
  });


  //
  // Setup keyboard interaction
  //

  var keyNotes = {
    /*a*/ 65: 0, // c
    /*w*/ 87: 1, // c#
    /*s*/ 83: 2, // d
    /*e*/ 69: 3, // d#
    /*d*/ 68: 4, // e
    /*f*/ 70: 5, // f
    /*t*/ 84: 6, // f#
    /*g*/ 71: 7, // g
    /*y*/ 89: 8, // g#
    /*h*/ 72: 9, // a
    /*u*/ 85: 10, // a#
    /*j*/ 74: 11, // b
    /*k*/ 75: 12, // c
    /*o*/ 79: 13, // c#
    /*l*/ 76: 14, // d
    /*p*/ 80: 15, // d#
    /*;*/ 186: 16, // e
    /*;*/ 59: 16, // e ... gotta figure out why it's sometimes 186 and sometimes 59
    /*,*/ 222: 17, // f
    /*]*/ 221: 18, // f#
    /*enter*/ 13: 19 // g
  };
  var notesShift = -12;
  var downKeys = {};

  function isModifierKey(evt) {
    return evt.metaKey || evt.shiftKey || evt.altKey;
  }

  $(window).keydown(function(evt) {
    var keyCode = evt.keyCode;
    // prevent repeating keys
    if (!downKeys[keyCode] && !isModifierKey(evt)) {
      downKeys[keyCode] = 1;
      var key = keyNotes[keyCode];
      if (typeof key != 'undefined') {
        triggerKey(key+notesShift+notesOffset);
        evt.preventDefault();
      }
    }
  }).keyup(function(evt) {
      delete downKeys[evt.keyCode];
    });


  //
  // Piano colors
  //

  var colors = 'f33 33f 3f3 ff3 f3f 3ff'.split(' '),
    curColor = 0;

  function colorHandler(evt) {
    if (evt.type === 'click' || (evt.keyCode == 67 && !isModifierKey(evt))) {
      if (++curColor >= colors.length) curColor = 0;
      document.getElementById('piano').style.backgroundColor = '#' + colors[curColor];
    }
  }

  $(window).keyup(colorHandler);
  $('.toggle-color').click(colorHandler);

  //
  // Help controls
  //

  var $help = $('.help');

  $(window).click(function(evt) {
    var $closestHelp = $(evt.target).closest('.help');
    if (!((evt.target.nodeName == 'A' || ~evt.target.className.search('hold')) && $closestHelp.length) &&
      ($closestHelp.length || $help.hasClass('show'))) {
      $help.toggleClass('show');
    }
  });

  var qTimeout, qCanToggle = true;;
  $(window).keypress(function(evt) {
    // trigger help when ? is pressed, but make sure it doesn't repeat crazy
    if (evt.which == 63 || evt.which == 48) {
      window.clearTimeout(qTimeout);
      qTimeout = window.setTimeout(function() {
        qCanToggle = true;
      }, 1000);
      if (qCanToggle) {
        qCanToggle = false;
        $help.toggleClass('show');
      }
    }
  });

  window.setTimeout(function() {
    $help.removeClass('show');
  }, 700);

  // prevent quick find...
  $(window).keydown(function(evt) {
    if (evt.target.nodeName != 'INPUT' && evt.target.nodeName != 'TEXTAREA') {
      if (evt.keyCode == 222) {
        evt.preventDefault();
        return false;
      }
    }
    return true;
  });

  //
  // Scroll nav
  //
  $.each([['#info', '#below'], ['#top', '#content']], function(i, x) {
    $(x[0]).click(function() {
      $('html,body').animate({
        scrollTop: $(x[1]).offset().top
      }, 1000);
    });
  });

  //
  // Silly colors
  //
  (function() {
    var shouldAnimate = true,
      $piano = $('#piano'),
      W = $piano.width(),
      H = 200,
      $canvas = $('<canvas>', {
        css: {
          position: 'absolute',
          top: ($piano.offset().top + $piano.outerHeight() - 1) + 'px',
          left: '50%',
          marginLeft: Math.floor(-W/2) + 'px', // need to figure this out...
          width: W,
          height: H
        }
      })
        .attr('width', W)
        .attr('height', H)
        .prependTo('body'),
      canvas = $canvas.get(0),
      ctx = canvas.getContext('2d');

    function getData(note) {
      var data = [], freq = Notes.noteToFreq(note), vol = 1, sampleRate = 2024, secs = .1;
      var volumeFn = DataGenerator.volume.default;
      var styleFn = DataGenerator.style.default;
      var maxI = sampleRate * secs;
      for (var i=0; i<maxI; i++) {
        var sf = styleFn(freq, vol, i, sampleRate, secs, maxI);
        data.push(volumeFn(
          styleFn(freq, vol, i, sampleRate, secs, maxI),
          freq, vol, i, sampleRate, secs, maxI));
      }
      return data;
    }

    var keyToData = {},
      keyAnimCounts = {};

    $keys.on('build-done.piano', function() {
      $keys.find('.key').each(function() {
        var key = $(this).data('key');
        keyToData[key] = getData(key);
      });
    });

    $keys.on('played-note.piano', function(evt, key, $elt) {
      if (!shouldAnimate) return;

      var eOffset = $elt.offset(),
        eWidth = $elt.width(),
        cOffset = $canvas.offset(),
        startX = (eOffset.left + eWidth/2) - cOffset.left,
        startY = 0,
        endY = 200,
        amplitude = 8,
        data = keyToData[key],
        animCount = keyAnimCounts[key] = (keyAnimCounts[key] || 0) + 1;

      if (!data) return;

      var len = data.length,
        maxTime = 500,
        stepRate = 80,
        cleanupStepDelay = 8,
        steps = Math.floor(maxTime / stepRate),
        iPerStep = len / steps,
        yPerStep = (endY - startY) / steps,
        yIncrement = yPerStep / iPerStep,
        step = 0,
        i = 0,
        color = getColor(key);

      // startY -> endY in steps
      // each step is yPerStep = (endY - startY) / steps long
      // each step covers iPerStep = len / steps data points
      //     at an increment of yIncrement = yPerStep / iPerStep

      (function draw() {

        if (step < steps) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          var newMax = i + iPerStep, first = true;
          for (; i<=newMax; i++) {
            startY += yIncrement;
            ctx[first ? 'moveTo' : 'lineTo'](startX + data[i]*amplitude, startY);
            first = false;
            if (startY > H) return;
          }
          i--; // keep an overlap between draws
          startY -= yIncrement;
          ctx.stroke();
        }

        if (keyAnimCounts[key] == animCount && step >= cleanupStepDelay) {
          var cleanupStep = step - cleanupStepDelay;
          ctx.clearRect(startX - amplitude - 5, yPerStep * cleanupStep,
            (amplitude + 5) * 2, yPerStep * (cleanupStep + 1));
        }

        if (++step < steps + cleanupStepDelay) {
          window.setTimeout(draw, stepRate);
        }
      })();
    });

    // button
    var bW = 20,
      bH = 20,
      $button = $('<canvas>', {
        css: {
          position: 'absolute',
          top: (parseInt($help.css('top')) + 1) + 'px',
          right: (parseInt($help.css('right')) + 34) + 'px',
          width: bW,
          height: bH,
          cursor: 'pointer'
        }
      })
        .attr('width', bW)
        .attr('height', bH)
        .appendTo('#piano'),
      button = $button.get(0),
      bctx = button.getContext('2d'),
      coords = [
        [15, 1],
        [5, 9],
        [9, 11],
        [5, 19],
        [15, 11],
        [11, 9]
      ],
      coordsLen = coords.length;

    bctx.strokeStyle = 'rgba(0,0,0,.5)';
    bctx.lineWidth = .5;

    function draw() {
      bctx.fillStyle = shouldAnimate ? 'rgba(255,255,0,.75)' : 'rgba(0,0,0,.25)';
      bctx.clearRect(0, 0, bW, bH);
      bctx.beginPath();
      for (var i=0; i<coordsLen; i++) {
        bctx[i == 0 ? 'moveTo' : 'lineTo'](coords[i][0], coords[i][1]);
      }
      bctx.closePath();
      if (shouldAnimate) bctx.stroke();
      bctx.fill();
    }
    draw();

    // handlers
    function toggleAnimate(evt) {
      if (evt.type === 'click' || (evt.keyCode == 56 && !isModifierKey(evt))) {
        shouldAnimate = !shouldAnimate;
        draw();
      }
    }
    $(window).keyup(toggleAnimate);
    $('.toggle-animate').click(toggleAnimate);
    $button.click(toggleAnimate);
  })();

  if (isIos) {
    $(function() {
      var $note = $('<div>', {
        'class': 'note',
        'text': 'Note: sound does not work on iOS, but you can still enjoy pretty wave forms!'
      }).appendTo('body');

      window.setTimeout(function() {
        $note.fadeOut();
      }, 6000);
    });
  }

  /*
   Appbase integration begins
   */
  Appbase.credentials("piano", "a659f26b2eabb4985ae104ddcc43155d");
  var namespace = 'pianoapp/piano/';
  var mainRef = Appbase.ref(namespace);
  
  //User name and color

  //chooses a random color
  function choice(x) {
    return x[Math.floor(Math.random()*x.length)];
  }
  var myColor = '#' +
      choice('f33 33f 3f3 ff3 f3f 3ff 000 ff6347 6a5acd daa520 d2691e ff8c00 00ced1 dc143c ff1493'.split(' '));

  var myName;
  do {
    myName = prompt("enter your handle (alphanumeric only)");
  } while(!myName);
  var userUUID = Appbase.uuid();
  var userRef = Appbase.create('user', userUUID);
  userRef.setData({name: myName, color: myColor}, throwIfError);

  /*
    asdf
    - piano
      - room id
        - users
        - keys
  */

  var currentRoom;
  mainRef.on('edge_added', function(error, edgeRef, edgeSnap){ //new room
    var handler = edgeRef.on('properties', function(error, ref, vSnap){
      edgeRef.off(handler);
      updateList(vSnap.properties().name, edgeSnap.name()); //add the room to the list
      if(!currentRoom) setRoom(edgeRef);  //set user's room when first ran and when new room is created
    });
  });

  var removeListeners, keysRef, usersRef;
  var setRoom = function(room){
    var newRoom = room.path().replace(namespace, '');
    if(newRoom === currentRoom) return; // No need to switch, inside the room.
    else currentRoom = newRoom;
    removeListeners ? removeListeners() : console.log('First run!')//Remove previous listeners before adding new ones

    keysRef = Appbase.ref(room.path() + '/keys');
    usersRef = Appbase.ref(room.path() + '/users');

    // set users edge to yourself. you were already removed from the room.
    // when it's set, grab users list.
    // This is done after listeners are called off.
    usersRef.on('edge_added', events.usersRef.edge_added); //Listening for users
    usersRef.setEdge(userRef, userUUID, throwIfError);
    keysRef.on('edge_added', events.keyRef.edge_added, true); //Listening for keys from Appbase
    usersRef.on('edge_removed', events.usersRef.edge_removed, true);
    
    var roomSelector = '#'+currentRoom;
    $(function(){$(roomSelector).addClass('disabled')}); //highlight the current room
    $(window).bind('beforeunload', events.window);

    removeListeners = function(){
      $(roomSelector).removeClass('disabled');
      usersRef.removeEdge(userUUID);
      $('#usernames').html('');
      $(window).unbind('beforeunload');
      keysRef.off();
      usersRef.off();
    }
  }

  $(document).ready(function(){$('#addRoom').on('click', createRoom)});

  var events = {
    keyRef : {
      edge_added : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        var keyObj = decodeKey(edgeSnap.name());
        //ignore if key is from this user
        if(userUUID !== keyObj.userUUID) {
          playKeyInTheView(keyObj.key, keyObj.color, keyObj.name);
        }
      }
    }, 
    usersRef : {
      edge_added : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        edgeRef.on('properties', function(error, ref, vSnap) {
          throwIfError(error);
          edgeRef.off();
          $("#usernames").append("<li class=\"list-group-item\" id='"+edgeSnap.name()+"' style='background-color:"
          +vSnap.properties().color+";color:"+invertColor(vSnap.properties().color)+"'>"+vSnap.properties().name+
          "</li>");
        });
      },
      edge_removed : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        $("#"+edgeSnap.name()).remove();
      }
    },
    window : function(eventObject) {
      var returnValue = 'Close?';
      eventObject.returnValue = returnValue;
      usersRef.removeEdge(userUUID, throwIfError);
      return returnValue;
    }
  }

  var updateList = function(name, id){
    $('#roomList').append('<li class="list-group-item" id="'+id+'">'+name+'</li>');
    $('#' + id).on('click', function(event){
      setRoom(Appbase.ref(namespace + event.target.id));
    });
  };

  //old
  // var keysRef = Appbase.ref('try/piano1/keys');

  var throwIfError = function(error) {
    if(error) throw Error;
  }

  var createRoom = function(){
    var roomName;
    do {
      roomName = prompt("enter room name (alphanumeric only)");
    } while(!roomName);
    var roomID = Appbase.uuid();
    var roomRef = Appbase.create('room', roomID);
    roomRef.setData({name: roomName}, function(){
      roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'users', function(){
        roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'keys', function(){
          currentRoom = false;
          mainRef.setEdge(roomRef, roomID, throwIfError);
        });
      });
    });
  }

  var encodeKey = function(key, userUUID) {
    return key.toString() + '_' + userUUID + (myColor!== undefined? '_' + myColor + '_' + myName : '');
  }

  var decodeKey = function(edgeName) {
    edgeName = edgeName.split('_');
    return {key: parseInt(edgeName[0]), userUUID: edgeName[1], color: edgeName[2], name: edgeName[3]};
  }

  var pushToAppbase = function(key) {
    keysRef.setEdge(keysRef, encodeKey(key, userUUID), throwIfError);
  }

  //Mouse and keyboard events call below function.
  var triggerKey = function(key) {
    playKeyInTheView(key, myColor, myName);
    pushToAppbase(key);
  }

  var colors = {};
  var getColor = function(key) {
    return colors[key] || "#fff";
  }
  // This function plays a key.
  var playKeyInTheView = function(key, color, name) {
    colors[key] = color;
    $keys.trigger('note-'+key+'.play');
  }

  var invertColor = function (hexTripletColor) {
    var color = hexTripletColor;
    color = color.substring(1);           // remove #
    color = parseInt(color, 16);          // convert to integer
    color = 0xFFFFFF ^ color;             // invert three bytes
    color = color.toString(16);           // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color;                  // prepend #
    return color;
  }  

})();
