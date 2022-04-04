import defined from "../Core/defined.js";
import Credit from "../Core/Credit.js";
import Math from "../Core/Math.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import defer from "../Core/defer.js";
import ImageryProvider from "../Scene/ImageryProvider.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import TimeDynamicImagery from "../Scene/TimeDynamicImagery.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import { Imagery } from "../DataSources/ExternalData.js";

var defaultParameters = Object.freeze({
  service: "WMTS",
  version: "1.0.0",
  request: "GetTile"
});

/**
 * Provides imagery that has been embedded in the library to be displayed on the surface of an ellipsoid.  
 *
 * @alias EmbeddedTileServiceImageryProvider
 * @constructor
 *
 */
function EmbeddedTileServiceImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /*if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  if (defined(options.times) && !defined(options.clock)) {
    throw new DeveloperError("options.times was specified, so options.clock is required.");
  }*/
  if (!defined(options.id)) {
    throw new DeveloperError("options.id is required.");
  }
  if (!defined(Imagery[options.id])) {
    throw new DeveloperError(`options.id ${options.id} is not found in embedded imagery provider`);
  }
  if (!defined(options.path)) {
    throw new DeveloperError("options.path is required.");
  }
  if (!defined(Imagery[options.id][`/${options.path}/0/0/0.jpg`])) {
    throw new DeveloperError(`options.path ${options.path} is not found in embedded imagery provider`);
  }
  this._staticImagerySource = Imagery[options.id];
  this._staticImageryPath = options.path;
  this._tilingScheme =
    this._staticImagerySource.tilemapresource.TileMap.SRS.indexOf("4326") > -1
      ? new GeographicTilingScheme({ ellipsoid: Ellipsoid.WGS84 })
      : new WebMercatorTilingScheme({ ellipsoid: Ellipsoid.WGS84 });
  this._reverseY = this._staticImagerySource.tilemapresource.TileMap.SRS.indexOf("4326") > -1 ? false : true;
  let { width, height } = this._staticImagerySource.tilemapresource.TileMap.TileFormat[0].$;

  this._tileWidth = width;
  this._tileHeight = height;

  this._minimumLevel = 0;
  this._maximumLevel = this._staticImagerySource.tilemapresource.TileMap.TileSets[0].TileSet.length - 1;
  let BBox = this._staticImagerySource.tilemapresource.TileMap.BoundingBox[0].$;
  this._rectangle = this._tilingScheme.rectangle;

  this._errorEvent = new Event();

  var credit = options.credit;
  this._credit = typeof credit === "string" ? new Credit(credit) : credit;
  this._readyPromise = defer();
}

function requestImage(imageryProvider, col, row, level, request, interval) {
  let url = imageryProvider._staticImagerySource[`/${imageryProvider._staticImageryPath}/${level}/${col}/${row}.jpg`];
  return url ? Resource.fetchImage({ url }) : null;
}

Object.defineProperties(EmbeddedTileServiceImageryProvider.prototype, {
  url: {
    get: function () {
      return this._resource.url;
    }
  },

  tileWidth: {
    get: function () {
      return this._tileWidth;
    }
  },

  tileHeight: {
    get: function () {
      return this._tileHeight;
    }
  },

  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    }
  },

  minimumLevel: {
    get: function () {
      return this._minimumLevel;
    }
  },

  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    }
  },

  rectangle: {
    get: function () {
      return this._rectangle;
    }
  },

  tileDiscardPolicy: {
    get: function () {
      return this._tileDiscardPolicy;
    }
  },

  errorEvent: {
    get: function () {
      return this._errorEvent;
    }
  },

  format: {
    get: function () {
      return this._format;
    }
  },

  ready: {
    value: true
  },

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    }
  },

  credit: {
    get: function () {
      return this._credit;
    }
  },

  hasAlphaChannel: {
    get: function () {
      return true;
    }
  },

  clock: {
    get: function () {
      return this._timeDynamicImagery.clock;
    },
    set: function (value) {
      this._timeDynamicImagery.clock = value;
    }
  },

  times: {
    get: function () {
      return this._timeDynamicImagery.times;
    },
    set: function (value) {
      this._timeDynamicImagery.times = value;
    }
  }
});

EmbeddedTileServiceImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

EmbeddedTileServiceImageryProvider.prototype.pickFeatures = function (x, y, level, longitude, latitude) {
  return undefined;
};

EmbeddedTileServiceImageryProvider.prototype.requestImage = function (x, y, level, request) {
  var result;
  var currentInterval;
  if (this._reverseY) y = this.tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1;

  if (!defined(result)) {
    result = requestImage(this, x, y, level, request, currentInterval);
  }
  return result;
};

export default EmbeddedTileServiceImageryProvider;
