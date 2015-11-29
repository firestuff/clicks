var Clicks = function(youTubeAPIKey, container, takeDocumentHashOwnership, trackingID) {
  this.youTubeAPIKey_ = youTubeAPIKey;
  this.container_ = container;
  this.players_ = [];
  this.activePlayer_ = null;
  this.inputConfig_ = {};

  this.buildUI_();

  this.eventTarget_ = document.createDocumentFragment();
  this.addEventListener =
      this.eventTarget_.addEventListener.bind(this.eventTarget_);
  this.removeEventListener =
      this.eventTarget_.removeEventListener.bind(this.eventTarget_);
  this.dispatchEvent =
      this.eventTarget_.dispatchEvent.bind(this.eventTarget_);

  if (trackingID) {
    this.loadAnalytics(trackingID);
  }

  window.addEventListener('resize', this.onWindowResize_.bind(this));

  this.addEventListener('configchange', this.updateControls_.bind(this));
  if (takeDocumentHashOwnership) {
    this.takeDocumentHashOwnership();
  }

  window.addEventListener('keypress', this.onKeyPress_.bind(this));
  window.setInterval(this.fireConfigChange.bind(this), 300);
};


Clicks.youTubeIframeAPIReady = false;
Clicks.onYouTubeIframeAPIReady = [];
Clicks.keyStrings = {
  ' ': '<space>',
  '\x1b': '<esc>',
};


Clicks.createElementAndAppend = function(className, parentNode) {
  var element = document.createElement('div');
  element.className = className;
  parentNode.appendChild(element);
  return element;
};


Clicks.prototype.trackEvent_ = function(var_args) {
  if (this.analyticsObj_) {
    this.analyticsObj_.apply(this, arguments);
  } else if (this.analyticsObjName_) {
    window[this.analyticsObjName_].q.push(arguments);
  }
};


Clicks.prototype.loadAnalytics = function(trackingID) {
  this.analyticsObjName_ = 'ClicksAnalytics' + Math.round(Math.random() * 10000000).toString();
  window['GoogleAnalyticsObject'] = this.analyticsObjName_;

  var completeCallback = (function() {
    this.analyticsObj_ = window[this.analyticsObjName_];
    delete window[this.analyticsObjName_];
  }).bind(this);

  window[this.analyticsObjName_] = {
    'l': 1 * new Date(),
    'q': [],
  };

  var script = document.createElement('script');
  script.src = 'https://www.google-analytics.com/analytics.js';
  script.async = true;
  script.onload = completeCallback;
  document.body.appendChild(script);

  this.trackEvent_('create', trackingID, {
    'storage': 'none',
    'clientId': localStorage['clicks_tracking_client_id']
  });
  this.trackEvent_((function(analytics) {
    localStorage['clicks_tracking_client_id'] =
        analytics.get('clientId');
  }).bind(this));
};


Clicks.prototype.takeDocumentHashOwnership = function() {
  if (document.location.hash.length > 1) {
    this.parseConfigString(document.location.hash.substring(1));
  }

  this.addEventListener('configchange', function(e) {
    if (e.detail.length == 0) {
      return;
    }
    document.location.hash = '#' + e.detail;
  });
};


Clicks.prototype.onAddVideoValueChanged_ = function(e) {
  var value = e.target.textContent;

  // TODO: support start time in source URL

  if (value.length == 11 && value.indexOf(':') == -1 && value.indexOf('.') == -1) {
    // Plausible YouTube video ID
    this.addVideo(value, 0.0);
    return;
  }

  var parse = document.createElement('a');
  parse.href = value;

  if ((parse.hostname == 'youtu.be' || parse.hostname == 'www.youtu.be') && parse.pathname.length == 12) {
    this.addVideo(parse.pathname.substring(1), 0.0);
    return;
  }

  var re = new RegExp('[?&]v=([^&]{11})(&|$)');
  var match = re.exec(parse.search);
  if (match) {
    this.addVideo(match[1], 0.0);
    return;
  }
}


Clicks.prototype.buildUI_ = function() {
  this.container_.tabIndex = -1;

  this.addVideo_ = Clicks.createElementAndAppend(
      'clicks-add-video clicks-add-video-active', this.container_);
  var addVideoDialog = Clicks.createElementAndAppend(
      'clicks-add-video-dialog', this.addVideo_);
  this.addVideoValue_ = Clicks.createElementAndAppend(
      'clicks-add-video-input', addVideoDialog);
  this.addVideoValue_.contentEditable = true;
  this.addVideoValue_.addEventListener('keypress', function(e) { e.stopPropagation(); });
  this.addVideoValue_.addEventListener('input', this.onAddVideoValueChanged_.bind(this));
  this.addVideoValue_.focus();

  this.loading_ = Clicks.createElementAndAppend(
      'clicks-loading', this.container_);

  this.controls_ = Clicks.createElementAndAppend(
      'clicks-controls', this.container_);

  var infoArea = Clicks.createElementAndAppend(
      'clicks-control-info-area', this.controls_);
  this.title_ = Clicks.createElementAndAppend(
      'clicks-title', infoArea);
  this.channel_ = Clicks.createElementAndAppend(
      'clicks-channel', infoArea);
  this.currentTime_ = Clicks.createElementAndAppend(
      'clicks-current-time', infoArea);
  this.totalTime_ = Clicks.createElementAndAppend(
      'clicks-total-time', infoArea);

  this.buffering_ = document.createElement('img');
  this.buffering_.src = '/static/images/buffering.svg';
  this.buffering_.className = 'clicks-buffering';
  infoArea.appendChild(this.buffering_);

  var controls = [
    {
      'title': 'Transport',
      'buttons': [
        [
          {
            'img': 'playpause',
            'key': ' ',
          },
          {
            'img': 'play',
            'key': 'a',
          },
          {
            'img': 'pause',
            'key': 's',
          },
        ],
        [
          {
            'img': 'jumpback-1f',
            'key': 't',
          },
          {
            'img': 'jumpback-1s',
            'key': 'r',
          },
          {
            'img': 'jumpback-10s',
            'key': 'e',
          },
          {
            'img': 'jumpback-1m',
            'key': 'w',
          },
          {
            'img': 'jumpback-10m',
            'key': 'q',
          },
        ],
        [
          {
            'img': 'jumpforward-1f',
            'key': 'y',
          },
          {
            'img': 'jumpforward-1s',
            'key': 'u',
          },
          {
            'img': 'jumpforward-10s',
            'key': 'i',
          },
          {
            'img': 'jumpforward-1m',
            'key': 'o',
          },
          {
            'img': 'jumpforward-10m',
            'key': 'p',
          },
        ],
      ],
    },
    {
      'title': 'Rate',
      'buttons': [
        [
          {
            'img': 'slower',
            'key': '[',
          },
          {
            'img': 'faster',
            'key': ']',
          },
        ],
        [
          {
            'img': 'rate-025x',
            'key': '3',
          },
          {
            'img': 'rate-05x',
            'key': '4',
          },
          {
            'img': 'rate-1x',
            'key': '5',
          },
          {
            'img': 'rate-125x',
            'key': '6',
          },
          {
            'img': 'rate-15x',
            'key': '7',
          },
          {
            'img': 'rate-2x',
            'key': '8',
          },
        ],
      ],
    },
    {
      'title': 'Zoom',
      'buttons': [
        [
          {
            'img': 'zoom-out',
            'key': '-',
          },
          {
            'img': 'zoom-in',
            'key': '+',
          },
        ],
        [
          {
            'img': 'zoom-1x',
            'key': '!',
          },
          {
            'img': 'zoom-15x',
            'key': '@',
          },
          {
            'img': 'zoom-2x',
            'key': '#',
          },
          {
            'img': 'zoom-25x',
            'key': '$',
          },
          {
            'img': 'zoom-3x',
            'key': '%',
          },
          {
            'img': 'zoom-35x',
            'key': '^',
          },
          {
            'img': 'zoom-4x',
            'key': '&',
          },
          {
            'img': 'zoom-45x',
            'key': '*',
          },
        ],
      ],
    },
    {
      'title': 'Markers',
      'buttons': [],
    },
    {
      'title': 'Player',
      'buttons': [
        [
          {
            'img': 'togglefullscreen',
            'key': 'd',
          },
          {
            'img': 'fullscreen',
            'key': 'f',
          },
          {
            'img': 'exitfullscreen',
            'key': '\x1b',
          },
        ],
        [
          {
            'img': 'mutetoggle',
            'key': 'm',
          },
          {
            'img': 'mute',
            'key': 'b',
          },
          {
            'img': 'unmute',
            'key': 'n',
          },
        ],
      ],
    },
  ];


  var selectArea = Clicks.createElementAndAppend(
      'clicks-control-section-select-area', this.controls_);

  this.sectionSelectors_ = {};

  for (var i = 0; i < controls.length; i++) {
    var section = controls[i];

    var sectionSelect = Clicks.createElementAndAppend(
        'clicks-control-section-select', selectArea);
    sectionSelect.textContent = section.title;
    sectionSelect.addEventListener(
        'click', this.activateControlSection_.bind(this, section.title));
    this.sectionSelectors_[section.title] = sectionSelect;
  }

  var sectionArea = Clicks.createElementAndAppend(
      'clicks-control-section-area', this.controls_);

  this.sections_ = {};
  this.buttons_ = {};

  for (var i = 0; i < controls.length; i++) {
    var section = controls[i];

    var sectionNode = Clicks.createElementAndAppend(
        'clicks-control-section', sectionArea);
    this.sections_[section.title] = sectionNode;

    for (var j = 0; j < section.buttons.length; j++) {
      var buttons = section.buttons[j];
      var row = Clicks.createElementAndAppend(
          'clicks-control-section-row', sectionNode);

      for (var k = 0; k < buttons.length; k++) {
        var button = buttons[k];
        var buttonNode = this.buildButton_(button.img, button.key);
        row.appendChild(buttonNode);
        this.buttons_[button.img] = buttonNode;
      }
    }
  }

  this.playersContainer_ = Clicks.createElementAndAppend(
      'clicks-players-container', this.container_);

  this.activateControlSection_(controls[0].title);

  this.container_.addEventListener('click', this.showHideControls_.bind(this));
};


Clicks.prototype.activateControlSection_ = function(title, e) {
  if (e) {
    e.stopPropagation();
  }

  for (var key in this.sections_) {
    if (key == title) {
      this.sectionSelectors_[key].className =
        'clicks-control-section-select clicks-control-section-select-active';
      this.sections_[key].className =
        'clicks-control-section clicks-control-section-active';
    } else {
      this.sectionSelectors_[key].className = 'clicks-control-section-select';
      this.sections_[key].className = 'clicks-control-section';
    };
  }
};


Clicks.prototype.buildButton_ = function(image, key) {
  var button = document.createElement('div');
  button.className = 'clicks-button';

  var img = document.createElement('img');
  img.src = '/static/images/' + image + '.svg';
  button.appendChild(img);

  var shortcut = document.createElement('div');
  shortcut.className = 'clicks-shortcut';
  shortcut.textContent = Clicks.keyStrings[key] || key;
  button.appendChild(shortcut);

  button.addEventListener('click', function(e) {
    this.onKeyPress_({
      'charCode': key.charCodeAt(0),
    });
    e.stopPropagation();
  }.bind(this));

  return button;
};


Clicks.prototype.isFullScreen_ = function() {
  return window.innerHeight == screen.height;
};


Clicks.prototype.parseConfigString = function(str) {
  var params = str.split(',');
  for (var i = 0; i < params.length; i++) {
    var keyValue = params[i].split('=', 2);
    this.inputConfig_[keyValue[0]] = keyValue[1];
  }

  if ('ytid' in this.inputConfig_) {
    var start = 0.0;
    if ('time' in this.inputConfig_) {
      start = parseFloat(this.inputConfig_['time']);
    }
    this.addVideo(this.inputConfig_['ytid'], start);
  }
};


Clicks.prototype.fixedDecimal_ = function(num, dec) {
  var mult = Math.pow(10, dec);
  return Math.floor(num * mult) / mult;
};


Clicks.prototype.getConfigString = function() {
  if (!this.activePlayer_) {
    return '';
  }

  var pan = this.activePlayer_.getPanPosition();

  var config = {
    'ytid': this.activePlayer_.id,
    'rate': this.activePlayer_.getRate().realRate,
    'zoom': this.activePlayer_.getZoomLevel(),
    'x': this.fixedDecimal_(pan[0], 3),
    'y': this.fixedDecimal_(pan[1], 3),
    'muted': this.activePlayer_.player.isMuted() ? 1 : 0,
    'time': this.fixedDecimal_(
        this.activePlayer_.player.getCurrentTime(), 3),
  };
  var params = [];
  for (var key in config) {
    params.push(key + '=' + config[key]);
  }
  return params.join(',');
};


Clicks.prototype.durationToString_ = function(num) {
  function zeroPad(x) {
    var xstr = x.toString();
    return xstr.length == 1 ? '0' + xstr : xstr;
  }

  return (
      zeroPad(Math.floor(num / 3600)) + 'h ' +
      zeroPad(Math.floor(num % 3600 / 60)) + 'm ' +
      zeroPad(Math.floor(num % 60)) + '.' +
      zeroPad(Math.floor(num * 100 % 100)) + 's'
  );
};


Clicks.prototype.setButtonActive_ = function(name, active) {
  if (active) {
    this.buttons_[name].className = 'clicks-button clicks-button-active';
  } else {
    this.buttons_[name].className = 'clicks-button';
  }
};


Clicks.prototype.fireConfigChange = function() {
  var e = new CustomEvent('configchange', {
    'detail': this.getConfigString(),
  });
  this.dispatchEvent(e);
};


Clicks.prototype.updateControls_ = function(e) {
  if (this.isFullScreen_()) {
    this.setButtonActive_('fullscreen', true);
    this.setButtonActive_('exitfullscreen', false);
  } else {
    this.setButtonActive_('fullscreen', false);
    this.setButtonActive_('exitfullscreen', true);
  }
  if (!this.activePlayer_) {
    return;
  }

  this.currentTime_.textContent = this.durationToString_(
      this.activePlayer_.player.getCurrentTime());
  this.totalTime_.textContent = this.durationToString_(
      this.activePlayer_.player.getDuration());

  if (this.activePlayer_.player.getPlayerState() == YT.PlayerState.BUFFERING) {
    this.buffering_.className = 'clicks-buffering clicks-buffering-active';
  } else {
    this.buffering_.className = 'clicks-buffering';
  }

  if (this.activePlayer_.player.getPlayerState() == YT.PlayerState.PLAYING) {
    this.setButtonActive_('play', true);
    this.setButtonActive_('pause', false);
  } else {
    this.setButtonActive_('play', false);
    this.setButtonActive_('pause', true);
  }

  if (this.activePlayer_.player.isMuted()) {
    this.setButtonActive_('mute', true);
    this.setButtonActive_('unmute', false);
  } else {
    this.setButtonActive_('mute', false);
    this.setButtonActive_('unmute', true);
  }

  var activeRate = this.activePlayer_.getRate().realRate;
  this.setButtonActive_('rate-025x', activeRate == 0.25);
  this.setButtonActive_('rate-05x', activeRate == 0.5);
  this.setButtonActive_('rate-1x', activeRate == 1.0);
  this.setButtonActive_('rate-125x', activeRate == 1.25);
  this.setButtonActive_('rate-15x', activeRate == 1.5);
  this.setButtonActive_('rate-2x', activeRate == 2.0);

  var zoomLevel = this.activePlayer_.getZoomLevel();
  this.setButtonActive_('zoom-1x', zoomLevel == 1.0);
  this.setButtonActive_('zoom-15x', zoomLevel == 1.5);
  this.setButtonActive_('zoom-2x', zoomLevel == 2.0);
  this.setButtonActive_('zoom-25x', zoomLevel == 2.5);
  this.setButtonActive_('zoom-3x', zoomLevel == 3.0);
  this.setButtonActive_('zoom-35x', zoomLevel == 3.5);
  this.setButtonActive_('zoom-4x', zoomLevel == 4.0);
  this.setButtonActive_('zoom-45x', zoomLevel == 4.5);
};


Clicks.prototype.addVideo = function(id, start) {
  console.log('Adding YouTube video:', id, start);
  new ClicksVideo(this.youTubeAPIKey_, id, start, this.playersContainer_, this.onVideoAdded_.bind(this));

  this.addVideo_.className = 'clicks-add-video';
  this.container_.focus();
  this.addVideoValue_.textContent = '';

  this.trackEvent_('send', 'event', 'Video', 'Add', id);
};


Clicks.prototype.onVideoAdded_ = function(player) {
  this.players_.push(player);
  this.activePlayer_ = player;
  for (var key in this.inputConfig_) {
    var value = this.inputConfig_[key];
    switch (key) {
      case 'rate':
        this.activePlayer_.setRate(parseFloat(value));
        break;
      case 'zoom':
        this.activePlayer_.zoom(parseFloat(value));
        break;
      case 'muted':
        if (parseInt(value)) {
          this.activePlayer_.player.mute();
        } else {
          this.activePlayer_.player.unMute();
        }
        break;
    }
  }
  // Pan has to come after zoom
  if (this.inputConfig_['x'] && this.inputConfig_['y']) {
    this.activePlayer_.setPanPosition(
        parseFloat(this.inputConfig_['x']),
        parseFloat(this.inputConfig_['y']));
  }

  this.activePlayer_.resize();
  this.activePlayer_.player.unMute();

  document.title = player.metadata.title;
  this.title_.textContent = player.metadata.title;
  this.channel_.textContent = player.metadata.channelTitle;

  for (var i = 0; i < player.metadata.markers.length; i++) {
    var marker = player.metadata.markers[i];

    var markerNode = document.createElement('div');
    markerNode.className = 'clicks-controls-marker';

    var markerName = document.createElement('div');
    markerName.className = 'clicks-controls-marker-name';
    markerName.textContent = marker[1];
    markerNode.appendChild(markerName);

    var markerTime = document.createElement('div');
    markerTime.className = 'clicks-controls-marker-time';
    markerTime.textContent = this.durationToString_(marker[0]);
    markerNode.appendChild(markerTime);

    markerNode.addEventListener('click', function(time, e) {
      this.activePlayer_.player.seekTo(time, true);
      e.stopPropagation();
    }.bind(this, marker[0]));

    this.sections_['Markers'].appendChild(markerNode);
  }

  player.unhide();
  this.loading_.className = 'clicks-loading clicks-loading-complete';
  player.player.playVideo();

  this.fireConfigChange();
};


Clicks.prototype.onWindowResize_ = function(e) {
  for (var i = 0; i < this.players_.length; i++) {
    this.players_[i].resize();
  }
};


Clicks.prototype.onKeyPress_ = function(e) {
  switch (String.fromCharCode(e.charCode).toLowerCase()) {
    case ' ':
      if (this.activePlayer_.player.getPlayerState() == YT.PlayerState.PLAYING) {
        this.activePlayer_.player.pauseVideo();
      } else {
        this.activePlayer_.player.playVideo();
      }
      break;
    case 'a':
      this.activePlayer_.player.playVideo();
      break;

    case 's':
      this.activePlayer_.player.pauseVideo();
      break;

    case '[':
      var i = this.activePlayer_.getRateIndex();
      if (i > 0) {
        this.activePlayer_.setRate(this.activePlayer_.rates[i - 1].realRate);
      }
      break;
    case ']':
      var i = this.activePlayer_.getRateIndex();
      if (i < this.activePlayer_.rates.length - 1) {
        this.activePlayer_.setRate(this.activePlayer_.rates[i + 1].realRate);
      }
      break;

    case '3':
      this.activePlayer_.setRate(0.25);
      break;
    case '4':
      this.activePlayer_.setRate(0.5);
      break;
    case '5':
      this.activePlayer_.setRate(1.0);
      break;
    case '6':
      this.activePlayer_.setRate(1.25);
      break;
    case '7':
      this.activePlayer_.setRate(1.5);
      break;
    case '8':
      this.activePlayer_.setRate(2);
      break;

    case 't':
      this.activePlayer_.seekRelative(0 - this.activePlayer_.frameSkip);
      break;
    case 'r':
      this.activePlayer_.seekRelative(-1);
      break;
    case 'e':
      this.activePlayer_.seekRelative(-10);
      break;
    case 'w':
      this.activePlayer_.seekRelative(-60);
      break;
    case 'q':
      this.activePlayer_.seekRelative(-600);
      break;

    case 'y':
      this.activePlayer_.seekRelative(this.activePlayer_.frameSkip);
      break;
    case 'u':
      this.activePlayer_.seekRelative(1);
      break;
    case 'i':
      this.activePlayer_.seekRelative(10);
      break;
    case 'o':
      this.activePlayer_.seekRelative(60);
      break;
    case 'p':
      this.activePlayer_.seekRelative(600);
      break;

    case 'd':
      if (this.isFullScreen_()) {
        this.exitFullScreen_();
      } else {
        this.fullScreen_();
      }
    case 'f':
      this.fullScreen_();
      break;
    case '\x1b':
      this.exitFullScreen_();
      break;

    case 'm':
      if (this.activePlayer_.player.isMuted()) {
        this.activePlayer_.player.unMute();
      } else {
        this.activePlayer_.player.mute();
      }
      break;
    case 'b':
      this.activePlayer_.player.mute();
      break;
    case 'n':
      this.activePlayer_.player.unMute();
      break;

    case '-':
    case '_':
      this.activePlayer_.zoomOut();
      break;
    case '+':
    case '=':
      this.activePlayer_.zoomIn();
      break;

    case '!':
      this.activePlayer_.zoom(1.0);
      break;
    case '@':
      this.activePlayer_.zoom(1.5);
      break;
    case '#':
      this.activePlayer_.zoom(2.0);
      break;
    case '$':
      this.activePlayer_.zoom(2.5);
      break;
    case '%':
      this.activePlayer_.zoom(3.0);
      break;
    case '^':
      this.activePlayer_.zoom(3.5);
      break;
    case '&':
      this.activePlayer_.zoom(4.0);
      break;
    case '*':
      this.activePlayer_.zoom(4.5);
      break;
  }
  this.fireConfigChange();
};


Clicks.prototype.showHideControls_ = function(e) {
  if (this.controls_.className == 'clicks-controls clicks-controls-active') {
    this.controls_.className = 'clicks-controls';
  } else {
    this.controls_.className = 'clicks-controls clicks-controls-active';
  }
  e.stopPropagation();
};


Clicks.prototype.fullScreen_ = function() {
  if (this.container_.requestFullscreen) {
    this.container_.requestFullscreen();
  } else if (this.container_.webkitRequestFullscreen) {
    this.container_.webkitRequestFullscreen();
  } else if (this.container_.mozRequestFullScreen) {
    this.container_.mozRequestFullScreen();
  }
};


Clicks.prototype.exitFullScreen_ = function() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  }
};



var ClicksVideo = function(youTubeAPIKey, id, start, container, onReady) {
  this.youTubeAPIKey_ = youTubeAPIKey;
  this.id = id;
  this.container_ = container;
  this.onReady_ = onReady;
  this.loading_ = 1;
  this.start_ = start;
  this.zoomLevel_ = 1.0;

  this.fetchVideoInfo_(id, this.onMetadataResponse_.bind(this));

  if (Clicks.youTubeIframeAPIReady) {
    this.onAPIReady_();
  } else {
    Clicks.onYouTubeIframeAPIReady.push(this.onAPIReady_.bind(this));
  }
};


// Hardcoded to match UI.
ClicksVideo.zoomLevels_ = [
  1.0,
  1.5,
  2.0,
  2.5,
  3.0,
  3.5,
  4.0,
  4.5,
];


ClicksVideo.prototype.getZoomLevel = function() {
  return this.zoomLevel_;
};


ClicksVideo.prototype.zoom = function(zoomLevel) {
  this.zoomLevel_ = zoomLevel;
  var pan = this.getPanPosition();
  this.resize();
  // Zoom in to the center of viewport, not the top left.
  this.setPanPosition(pan[0], pan[1]);
};


ClicksVideo.prototype.zoomOut = function() {
  var i = ClicksVideo.zoomLevels_.indexOf(this.zoomLevel_);
  this.zoom(ClicksVideo.zoomLevels_[i - 1] || this.zoomLevel_);
};


ClicksVideo.prototype.zoomIn = function() {
  var i = ClicksVideo.zoomLevels_.indexOf(this.zoomLevel_);
  this.zoom(ClicksVideo.zoomLevels_[i + 1] || this.zoomLevel_);
};


ClicksVideo.prototype.unhide = function() {
  this.playerContainer_.className =
    'clicks-player-container clicks-player-container-active';
};


ClicksVideo.prototype.resize = function() {
  var zoom = Math.min(
      this.container_.clientWidth / this.videoRes[0],
      this.container_.clientHeight / this.videoRes[1]);
  zoom *= this.zoomLevel_;
  this.playerScale_.style.transform = [
    'scale(' + zoom + ',' + zoom + ')',
  ].join(' ');
  this.playerScale_.style.width = this.videoRes[0];
  this.playerScale_.style.height = this.videoRes[1];
  this.playerCrop_.style.width = Math.ceil(this.videoRes[0] * zoom);
  this.playerCrop_.style.height = Math.ceil(this.videoRes[1] * zoom);
};


ClicksVideo.prototype.onMetadataResponse_ = function(response) {
  this.metadata = this.parseVideoDescription_(response);
  this.checkComplete_();
};


ClicksVideo.prototype.onPlayerReady_ = function(e) {
  this.playerRates = e.target.getAvailablePlaybackRates();
  this.checkComplete_();
};


ClicksVideo.prototype.onPlayerStateChange_ = function(e) {
  if (this.loading_ == 1 && e.data == YT.PlayerState.PLAYING) {
    this.player.pauseVideo();
    this.player.seekTo(this.start_, true);
    this.setRate(1.0);
    this.loading_ = 2;
  }
  if (this.loading_ == 2 && e.data == YT.PlayerState.PAUSED) {
    this.loading_ = 0;
    this.onReady_(this);
  }
};


ClicksVideo.prototype.getPanPosition = function() {
  return [
    ((this.playerContainer_.scrollLeft + (this.playerContainer_.clientWidth / 2))
     / this.playerContainer_.scrollWidth),
    ((this.playerContainer_.scrollTop + (this.playerContainer_.clientHeight / 2))
     / this.playerContainer_.scrollHeight),
  ];
};


ClicksVideo.prototype.setPanPosition = function(x, y) {
  this.playerContainer_.scrollLeft =
    ((x * this.playerContainer_.scrollWidth)
     - (this.playerContainer_.clientWidth / 2));
  this.playerContainer_.scrollTop =
    ((y * this.playerContainer_.scrollHeight)
     - (this.playerContainer_.clientHeight / 2));
};


ClicksVideo.prototype.onAPIReady_ = function() {
  this.playerContainer_ = Clicks.createElementAndAppend(
      'clicks-player-container', this.container_);
  this.playerCrop_ = Clicks.createElementAndAppend(
      'clicks-player-crop', this.playerContainer_);
  this.playerScale_ = Clicks.createElementAndAppend(
      'clicks-player-scale', this.playerCrop_);
  this.playerOverlay_ = Clicks.createElementAndAppend(
      'clicks-player-overlay', this.playerScale_);

  var tempNode = document.createElement('div');
  this.playerScale_.appendChild(tempNode);
  this.player = new YT.Player(tempNode, {
    height: '1080',
    width: '1920',
    videoId: this.id,
    playerVars: {
      'controls': 0,
      'enablejsapi': 1,
      'disablekb': 1,
      'showinfo': 0,
      'rel': 0,
      'iv_load_policy': 3,
      'origin': window.location.origin,
      'start': this.start_,
    },
    events: {
      'onReady': this.onPlayerReady_.bind(this),
      'onStateChange': this.onPlayerStateChange_.bind(this),
    },
  });
};


ClicksVideo.prototype.checkComplete_ = function() {
  if (!this.metadata || !this.playerRates) {
    return;
  }
  var baseRate = parseFloat(this.metadata.tags.realfps) / parseFloat(this.metadata.tags.ytfps)
  this.rates = [];
  for (var i = 0; i < this.playerRates.length; i++) {
    this.rates.push({
      'playerRate': this.playerRates[i],
      'realRate': this.playerRates[i] * baseRate,
      'fps': this.metadata.tags['ytfps'] * this.playerRates[i],
    });
  }
  this.frameSkip = 1.0 / parseFloat(this.metadata.tags.ytfps);
  var yRes = parseInt(this.metadata.tags.res);
  this.videoRes = [yRes * 16 / 9, yRes];
  this.player.setSize(this.videoRes[0], this.videoRes[1]);
  this.player.setPlaybackQuality('highres');
  this.player.setVolume(100);
  this.player.mute();
  this.player.playVideo();
};


ClicksVideo.prototype.seekRelative = function(offset) {
  this.player.seekTo(this.player.getCurrentTime() + offset, true);
};


ClicksVideo.prototype.getRateIndex = function() {
  var playerRate = this.player.getPlaybackRate();
  for (var i = 0; i < this.rates.length; i++) {
    if (this.rates[i].playerRate == playerRate) {
      return i;
    }
  }
  return null;
};


ClicksVideo.prototype.getRate = function() {
  return this.rates[this.getRateIndex()];
};


ClicksVideo.prototype.setRate = function(realRate) {
  for (var i = 0; i < this.rates.length; i++) {
    if (this.rates[i].realRate == realRate) {
      this.player.setPlaybackRate(this.rates[i].playerRate);
      return;
    }
  }
};


ClicksVideo.prototype.buildQueryString_ = function(args) {
  var ret = [];
  for (var key in args) {
    ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(args[key]));
  }
  return ret.join('&');
};


ClicksVideo.prototype.fetchVideoInfo_ = function(id, callback) {
  var queryString = this.buildQueryString_({
    'key': this.youTubeAPIKey_,
    'part': 'snippet',
    'id': id,
  });

  var sendRequest = function() {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/videos?' + queryString);
    xhr.addEventListener('load', function(e) {
      if (!e.target.response.items || e.target.response.items.length != 1) {
        console.log('Invalid response:', e.target);
        setTimeout(sendRequest, 1000);
        return;
      }
      callback(e.target.response.items[0]);
    });
    xhr.addEventListener('error', function(e) {
      setTimeout(sendRequest, 1000);
    });
    xhr.send();
  };

  sendRequest();
};


ClicksVideo.prototype.parseVideoDescription_ = function(video) {
  var markerRe = new RegExp('^fctv:marker=(\\d+):(.*)$');
  var tagRe = new RegExp('^fctv:(.*?)=(.*)$');
  var ret = {
    'title': video.snippet.title,
    'channelTitle': video.snippet.channelTitle,
    'tags': {
      // Best guesses
      'ytfps': 30.0,
      'realfps': 30.0,
      'res': '1080',
    },
    'markers': [],
  };
  for (var i = 0; i < video.snippet.tags.length; i++) {
    var match = markerRe.exec(video.snippet.tags[i]);
    if (match) {
      ret.markers.push([parseFloat(match[1]), match[2]]);
      continue;
    }

    match = tagRe.exec(video.snippet.tags[i]);
    if (match) {
      ret.tags[match[1]] = match[2];
    }
  }
  return ret;
};



var onYouTubeIframeAPIReady = function() {
  Clicks.youTubeIframeAPIReady = true;
  for (var i = 0; i < Clicks.onYouTubeIframeAPIReady.length; i++) {
    Clicks.onYouTubeIframeAPIReady[i]();
  }
  Clicks.onYouTubeIframeAPIReady.length = 0;
};
