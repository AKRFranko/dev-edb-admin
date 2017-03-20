(function(EDB){
  if(!EDB) throw new Error('Missing EDB namespace.');
  
  EDB.createResourceReference({
    api: 'wc',
    name: 'product',
    path: 'products',
    convert: [{
      read: 'name', write: 'name'
    }, {
      read: 'description',
      write: 'description',
      process: EDB.processors.translate
    }, {
      read: 'attributes.edb_material',
      write: 'material'
    },{
        read: 'images',
        write: 'images'
      }, {
      read: 'images.0.id',
      write: 'image.id'
    }, {
      read: 'images.0.src',
      write: 'image.src'
    } ]
  });
  
})(this.EDB);