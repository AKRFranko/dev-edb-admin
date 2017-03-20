(function(EDB){
  if(!EDB) throw new Error('Missing EDB namespace.');
  EDB.PolymerResource = Polymer({
    is: 'edb-resource',
    properties: {
      name: {
        type: String,
        notify: true,
        value: null
      },
      ref: {
        type: Object,
        value: null,
        computed: '__getRef(name)'
      },
      selectedId: {
        type: String,
        notify: true,
        value: null,
        observer: '__getSelectedItem'
      },
      loading: {
        type: Boolean,
        notify: true,
        value: false
      },
      items: {
        type: Array,
        value: function() {
          return [];
        },
        notify: true
      },
      item: {
        type: Object,
        value: function() {
          return {};
        },
        notify: true
      }
    },
    __getRef: EDB.getResourceReference,
    __loadList: function(items) {
      this.set('loading', false );
      this.set('items', items || []);
    },
    __loadItem: function(item) {
      this.set('loading', false );
      this.set('item', item || {});
    },
    __unloadList: function() {
      this.set('loading', false );
      this.set('items', []);
    },
    __unloadItem: function() {
      this.set('loading', false );
      this.set('item', {});
    },
    __triggerError: function(error) {
      this.fire('error', error);
      console.log(error);
    },
    __getSelectedItem: function(id) {
      if (id == 'new' || !id) {
        this.__unloadItem();
      } else {
        this.getItem(id);
      }
    },
    factoryImpl: function(ref) {
      var it = this;
      var params = {};
      this.refreshItems = function() {
        this.set('loading', true );
        var op = ref.list( it.params );
        op.then(it.__loadList.bind(it)).
        catch (it.__triggerError.bind(it));
        return op;
      };
      this.clearItems = function() {
        this.set('loading', true );
        return Promise.resolve(this.unloadList());
      };
      this.getItem = function() {
        this.set('loading', true );
        var op = ref.get(this.selectedId, it.params);
        op.then(it.__loadItem.bind(it)).
        catch (it.__triggerError.bind(it));
        return op;
      };
      this.updateItem = function(id, data) {
        this.set('loading', true );
        var op = ref.update( this.selectedId,this.item , it.params);
        op.then(it.__loadItem.bind(it)).
        catch (it.__triggerError.bind(it));
        return op;
      };
      this.updateItems = function( items ) {
        this.set('loading', true );
        var op = ref.batchUpdate( this.items, it.params );
        op.then(it.__loadItem.bind(it)).
        catch (it.__triggerError.bind(it));
        return op;
      };
      this.removeItem = function() {
        this.set('loading', true );
        var op = ref.remove(this.selectedId, it.params);
        op.then(it.__unloadItem.bind(it)).
        catch (it.__triggerError.bind(it));
        return op;
      }
      Object.defineProperty(this, 'params', {
        enumberable: true,
        get: function(){
          if(!params.context){
            params.context = 'edit';
          }
          return params;
        },
        set: function( v ){
          if(!v){
            params = {context: 'edit'}
          }else{
            params = v;
          }
        }
      })
    }
  });
 
})(this.EDB)