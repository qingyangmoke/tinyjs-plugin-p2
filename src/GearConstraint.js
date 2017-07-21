const p2 = require('../libs/p2');
/**
* Connects two bodies at given offset points, letting them rotate relative to each other around this point.
*
* @class GearConstraint
* @constructor
* @extends p2.GearConstraint
* @memberof Tiny.Physics.P2
*/
class GearConstraint extends p2.GearConstraint {
  /**
   * @constructor
   * @param {Tiny.Physics.P2.World} world - world reference to the currently running world.
   * @param {p2.Body} bodyA - First connected body.
   * @param {p2.Body} bodyB - Second connected body.
   * @param {number} [angle=0] - The relative angle
   * @param {number} [ratio=1] - The gear ratio.
   */
  constructor(world, bodyA, bodyB, angle = 0, ratio = 1) {
    const options = {
      angle,
      ratio,
    };
    super(bodyA, bodyB, options);
    /**
    * @name Tiny.Physics.P2.GearConstraint#app
    * @property {Tiny.Application} app - Local reference to game.
    */
    this.app = world.app;
    /**
    * @name Tiny.Physics.P2.GearConstraint#world
    * @property {Tiny.Physics.P2} world - Local reference to P2 World.
    */
    this.world = world;
  }
}

export default GearConstraint;
