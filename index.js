(function () {
  var React = typeof window !== 'undefined' && window.React || require('react');

  var RATE_LIMIT = 25;

  var ComponentVisibilityMixin = {
    setComponentVisbilityRateLimit: function (milliseconds) {
      RATE_LIMIT = milliseconds;
    },

    getInitialState: function () {
      return {visible: false};
    },

    componentDidMount: function () {
      this.enableVisbilityHandling(true);
    },

    componentWillUnmount: function () {
      this.disableVisbilityHandling();
    },

    /**
     * Check whether a component is in view based on its DOM node,
     * checking for both vertical and horizontal in-view-ness, as
     * well as whether or not it's invisible due to CSS rules based
     * on opacity:0 or visibility:hidden.
     */
    checkComponentVisibility: function () {
      var domnode = this._dom_node,
        gcs = window.getComputedStyle(domnode, false),
        dims = domnode.getBoundingClientRect(),
        h = window.innerHeight,
        w = window.innerWidth,
        elVCenter = dims.top + ((dims.bottom - dims.top) / 2),
        elHCenter = dims.left + ((dims.right - dims.left) / 2),
      // are we vertically visible?
        topVisible = 0 < dims.top && dims.top < h,
        bottomVisible = 0 < dims.bottom && dims.bottom < h,
        verticallyVisible = topVisible || bottomVisible,
      // also, are we horizontally visible?
        leftVisible = 0 < dims.left && dims.left < w,
        rightVisible = 0 < dims.right && dims.right < w,
        horizontallyVisible = leftVisible || rightVisible,
      // we're only visible if both of those are true.
        visible = horizontallyVisible && verticallyVisible,
      // lets determine element's position relative to viewport center (regardless of visibility)
        topHalf = (h / 2) > elVCenter,
        oneThird = (h / 3) > elVCenter,
        twoThird = (h / 3) <= elVCenter && elVCenter < (h * 2 / 3),
        threeThird = elVCenter >= (h * 2 / 3),
        leftHalf = (w / 2) > elHCenter,
        visibilityChanged, vPositionChanged, hPositionChanged;

      // but let's be fair: if we're opacity: 0 or
      // visibility: hidden, or browser window is minimized we're not visible at all.
      if (visible) {
        var isDocHidden = document.hidden;
        var isElementNotDisplayed = (gcs.getPropertyValue("display") === "none");
        var elementHasZeroOpacity = (gcs.getPropertyValue("opacity") === 0);
        var isElementHidden = (gcs.getPropertyValue("visibility") === "hidden");
        visible = visible && !(isDocHidden || isElementNotDisplayed || elementHasZeroOpacity || isElementHidden);
      }

      //Track what changed so the callback can can react appropriately
      visibilityChanged = visible !== this.state.visible;
      vPositionChanged = topHalf !== this.state.topHalf || oneThird !== this.state.topThird || twoThird !== this.state.middleVThird || threeThird !== this.state.bottomThird;
      hPositionChanged = leftHalf !== this.state.leftHalf;

      // at this point, if our visibility is not what we expected,
      // update our state so that we can trigger whatever needs to
      // happen.
      if (visibilityChanged || vPositionChanged || hPositionChanged) {
        // set State first:
        this.setState({
            visible: visible,
            topHalf: topHalf,
            bottomHalf: !topHalf,
            leftHalf: leftHalf,
            rightHalf: !leftHalf,
            topThird: oneThird,
            middleVThird: twoThird,
            bottomThird: threeThird
          },
          // then notify the component the value was changed:
          function () {
            if (this.componentVisibilityChanged) {
              this.componentVisibilityChanged(visibilityChanged, vPositionChanged, hPositionChanged);
            }
          });
      }
    },

    /**
     * This can be called to manually turn on visibility handling, if at
     * some point it got turned off. Call this without arguments to turn
     * listening on, or with argument "true" to turn listening on and
     * immediately check whether this element is already visible or not.
     */
    enableVisbilityHandling: function (checkNow) {
      if (typeof window === "undefined") {
        return console.error("This environment lacks 'window' support.");
      }

      if (typeof document === "undefined") {
        return console.error("This environment lacks 'document' support.");
      }

      if (!this._dom_node) {
        this._dom_node = React.findDOMNode(this);
      }
      var domnode = this._dom_node;

      this._rcv_fn = function () {
        if (this._rcv_lock) {
          this._rcv_schedule = true;
          return;
        }
        this._rcv_lock = true;
        this.checkComponentVisibility();
        this._rcv_timeout = setTimeout(function () {
          this._rcv_lock = false;
          if (this._rcv_schedule) {
            this._rcv_schedule = false;
            this.checkComponentVisibility();
          }
        }.bind(this), RATE_LIMIT);
      }.bind(this);

      /* Adding scroll listeners to all element's parents */
      while (domnode.nodeName !== 'BODY' && domnode.parentElement) {
        domnode = domnode.parentElement;
        domnode.addEventListener("scroll", this._rcv_fn);
      }
      /* Adding listeners to page events */
      document.addEventListener("visibilitychange", this._rcv_fn);
      document.addEventListener("scroll", this._rcv_fn);
      window.addEventListener("resize", this._rcv_fn);

      if (checkNow) { this._rcv_fn(); }
    },

    /**
     * This can be called to manually turn off visibility handling. This
     * is particularly handy when you're running it on a lot of components
     * and you only really need to do something once, like loading in
     * static assets on first-time-in-view-ness (that's a word, right?).
     */
    disableVisbilityHandling: function () {
      clearTimeout(this._rcv_timeout);
      if (this._rcv_fn) {
        var domnode = this._dom_node;

        while (domnode.nodeName !== 'BODY' && domnode.parentElement) {
          domnode = domnode.parentElement;
          domnode.removeEventListener("scroll", this._rcv_fn);
        }

        document.removeEventListener("visibilitychange", this._rcv_fn);
        document.removeEventListener("scroll", this._rcv_fn);
        window.removeEventListener("resize", this._rcv_fn);
        this._rcv_fn = false;
      }
    }
  };

  if (typeof module !== "undefined") {
    module.exports = ComponentVisibilityMixin;
  }

  else if (typeof define !== "undefined") {
    define(function () {
      return ComponentVisibilityMixin;
    });
  }

  else if (typeof window !== "undefined") {
    window.ComponentVisibilityMixin = ComponentVisibilityMixin;
  }

}());
