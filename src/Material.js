const p2 = require('../libs/p2');
/**
* A P2 Material wrapper.
* @class Material
* @constructor
* @memberof Tiny.Physics.P2
* @extends p2.Material
* @see p2.Material
*/
class Material extends p2.Material {
  /**
   * @constructor
   * @param {string} name - The user defined name given to this Material.
   */
  constructor(name) {
    super();
    /**
    * @name Tiny.Physics.P2.Material#name
    * @property {string} name - The user defined name given to this Material.
    */
    this.name = name;
  }
}

export default Material;
