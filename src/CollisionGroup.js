/**
* Collision Group
* @class CollisionGroup
* @constructor
* @memberof Tiny.Physics.P2
*/
class CollisionGroup {
  /**
   * @constructor
   * @param {number} mask
   */
  constructor(mask) {
    /**
    * @name Tiny.Physics.P2.CollisionGroup#mask
    * @property {number} mask - The CollisionGroup mask.
    */
    this.mask = mask;
  }
};

export default CollisionGroup;
