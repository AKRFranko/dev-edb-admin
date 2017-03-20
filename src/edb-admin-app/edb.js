(function(main) {



  var wpRest = document.createElement('wp-rest'),
    wcRest = document.createElement('wp-rest');

  wpRest.name = 'worpdress';
  wcRest.name = 'woocommerce';
  wpRest.host = window.creds.apiHost;
  wpRest.namespace = window.creds.apiNamespace;
  wpRest.authKey = window.creds.authKey;
  wpRest.authSecret = window.creds.authSecret;

  wcRest.host = window.creds.apiHost;
  wcRest.namespace = 'wc/v1';
  wcRest.authKey = window.creds.authKey;
  wcRest.authSecret = window.creds.authSecret;


  function findValueAtPath(path, object) {
    var parts = path.split('.');
    var value = parts.reduce(function(o, part) {
      delete o.__fake__;
      return o[part] || {
        __fake__: true
      };
    }, object);
    if (value.__fake__) return null;
    return value;
  }

  function setValueAtPath(path, object, value) {
    var parts = path.split('.');
    var last = parts.length - 1;
    var o = object;
    parts.reduce(function(o, part, index) {
      if (!o[part]) {
        if (index == last) {
          o[part] = value;
          return object;
        } else {
          o[part] = {};
          return o[part];
        }
      } else {
        if (index == last) {
          o[part] = value;
          return object;
        } else {
          return o[part];
        }
      }
      return o;
    }, object);
    return object;
  }


  function createConverter(readPath, writePath) {
    return Convert(readPath, writePath);
  }

  function convertObject(object, converters) {
    if (!object) return {};
    converters = (converters || []).concat(EDB.converters);
    return converters.reduce(function(target, converter) {
      return converter.write(object, target);
    }, {
      meta_box: {}
    });
  }

  function loadObject(object, converters) {
    if (!object) return {};
    converters = (converters || []).concat(EDB.converters);
    return converters.reduce(function(target, converter) {
      return converter.read(object, target);
    }, {})
  }

  function loadCollection(array, converters) {
    if (!array) return [];
    var collection = array.map(function(o) {
      return loadObject(o, converters);
    });
    return collection;
  }

  function convertCollection(collection, converters) {
    if (!collection) return [];
    converters = (converters || []).concat(EDB.converters);
    var array = collection.map(function(o) {
      return convertObject(o, converters);
    });
    return array;
  }



  var Convert = function Convert(read, write, options) {
    options = options || {
      noRead: false,
      noWrite: false
    };
    if (!(this instanceof Convert)) return new Convert(read, write, options);
    this.findValueAtPath = findValueAtPath;
    this.setValueAtPath = setValueAtPath;
    var process;
    var writeAs = options.writeAs || read;
    var readAs = options.readAs || write;
    var noRead = options.noRead || false;
    var noWrite = options.noWrite || false;
    if (options.process) {
      process = options.process;
    } else {
      process = function(v) {
        return v
      };
    }
    this.read = function(source, target) {
      var value = findValueAtPath(read, source);
      if (noRead) return null;
      setValueAtPath(readAs, target, process(value));
      return target;
    };
    this.write = function(source, target) {
      var value = findValueAtPath(write, source);
      if (noWrite) return null;
      setValueAtPath(writeAs, target, process(value));
      return target;
    };
    return this;
  };

  var ResourceReference = function ResourceReference(options) {
    var api = options.api;
    var name = options.name;
    var path = options.path;
    if (!api) throw new Error('Missing api.');
    if (!name) throw new Error('Missing name.');
    if (!path) throw new Error('Missing path.');
    this.api = EDB.apis[api];
    this.name = name;
    this.path = path;
    var converters = [];
    api = this.api;
    if (options.convert) {
      options.convert.forEach(function(converter) {
        var read = converter.read;
        var write = converter.write;
        var opts = Object.keys(converter).reduce(function(o, k) {
          if (o != 'read' && o != 'write') {
            o[k] = converter[k];
          }
          return o;
        }, {});
        converters.push(Convert(read, write, opts));
      }, this);
    }

    this.list = function(params) {
      params = params || {};
      params.context = 'edit';
      var request = api.__request('GET', path, null, params);
      return request.then(function(items) {
        var results = loadCollection(items, converters);
        return results;
      });
    };
    this.batchUpdate = function(values, params) {
      var ids = values.map(function(v) {
        return v.id
      });
      var results = [];
      return ids.reduce(function(prev, nextId, index) {
        if (!prev) return this.update(nextId, values[index], params);
        return prev.then(function(v) {
          results.push(v)
          return this.update(nextId, values[index], params);
        }.bind(this))
      }.bind(this)).then(function(v) {
        results.push(v);
        return results;
      })
    };

    this.create = function(data, params) {
      var data = convertObject(data, converters);
      var request = api.__request('POST', path, data, params);
      return request.then(function(item) {
        loadObject(items, converters);
      });
    };

    this.get = function(id, params) {

      var request = api.__request('GET', path + '/' + id, null, params);
      return request.then(function(item) {
        loadObject(item, converters);
      });

    };

    this.update = function(id, data, params) {
      var data = convertObject(data, converters);
      var request = api.__request('PUT', path + '/' + id, data, params);
      return request.then(function(item) {
        loadObject(items, converters);
      });
    };

    this.remove = function(id, params) {
      var request = api.__request('DELETE', path + '/' + id, null, params);
      return request;
    };

    return this;
  };


  var EDB = {
    _refs: {},
    apis: {
      wc: wcRest,
      wp: wpRest
    },
    converters: [
      Convert('meta_box.edb_sort_order', 'sortOrder'),
      Convert('featured_image', 'image.src', { noWrite: true }),
      Convert('featured_media', 'image.id'),
      Convert('id', 'id'),
      Convert('title.rendered', 'title', { writeAs: 'title', process: EDB.processors.translate }),
      Convert('content.rendered', 'content', { writeAs: 'content', process: EDB.processors.translate})
    ],
    processors: {
      translate: function(thing) {
        if (Object.hasOwnProperty(thing, 'en') && Object.hasOwnProperty(thing, 'fr')) {
          return EDB.processors.joinTranslation(thing);
        } else if (!thing || typeof thing == 'string') {
          if (/^<p/.test(thing)) {
            thing = thing.slice(3, -4);
          }
          return EDB.processors.splitTranslation(thing);
        }
      },
      splitTranslation: function(string) {
        console.log('splitTranslation', string)
        if (!string) return {
          en: en,
          fr: fr
        };
        var parts = string.trim().split('{:}', 2);
        if (parts.length == 1) {
          return {
            en: parts[0],
            fr: null
          };
        }
        var fr = (~parts[0].indexOf('{:fr}') ? parts[0] : parts[1]).slice(5);
        var en = (~parts[0].indexOf('{:en}') ? parts[0] : parts[1]).slice(5);
        return {
          en: en,
          fr: fr
        };
      },
      joinTranslation: function(obj) {
        if (!obj) return obj;
        return ['{:en}', obj.en, '{:}{:fr}', obj.fr, '{:}'].filter(function(v) {
          return !!v;
        }).join('');
      },

    },
    format: {
      money: function(n) {
        return n || n === 0 ? '$' + Number(n).toFixed(2) : '$-.--';
      },
      enfr: function(o) {
        if (typeof o == 'string') return o;
        return o.en || o.fr ? [o.en, o.fr].filter(function(n) {
          return !!n;
        }).join(' / ') : String(o);
      },
    },
  
  };

  EDB.createResourceReference = function(options) {
    var name = options.name;
    if (!EDB._refs[name]) {
      EDB._refs[name] = new ResourceReference(options);
    }
    return EDB._refs[name];
  }

  EDB.getResourceReference = function(name) {
    return EDB._refs[name];
  }


  if (!main.EDB) {
    main.EDB = {};
  }

  Object.keys(EDB).forEach(function(k) {
    Object.defineProperty(this, k, {
      value: EDB[k]
    });
  }, main.EDB);





  })(this);