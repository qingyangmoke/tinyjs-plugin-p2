const p2 = require('../libs/p2');

/**
* A constraint that tries to keep the distance between two bodies constant.
* @class DistanceConstraint
* @constructor
* @memberof Tiny.Physics.P2
* @extends p2.DistanceConstraint
*/
class DistanceConstraint extends p2.DistanceConstraint {
  /**
  * @constructor
  * @param {Tiny.Physics.P2.World} world - world reference to the currently running world.
  * @param {p2.Body} bodyA - First connected body.
  * @param {p2.Body} bodyB - Second connected body.
  * @param {number} distance - The distance to keep between the bodies.
  * @param {Array} [localAnchorA] - The anchor point for bodyA, defined locally in bodyA frame. Defaults to [0,0].
  * @param {Array} [localAnchorB] - The anchor point for bodyB, defined locally in bodyB frame. Defaults to [0,0].
  * @param {object} [maxForce=Number.MAX_VALUE] - Maximum force to apply.
   */
  constructor(world, bodyA, bodyB, distance = 100, localAnchorA = [0, 0], localAnchorB = [0, 0], maxForce = Number.MAX_VALUE) {
    distance = world.pxm(distance);

    localAnchorA = [world.pxmi(localAnchorA[0]), world.pxmi(localAnchorA[1])];
    localAnchorB = [world.pxmi(localAnchorB[0]), world.pxmi(localAnchorB[1])];

    const options = {
      distance,
      localAnchorA,
      localAnchorB,
      maxForce,
    };

    super(bodyA, bodyB, options);

    /**
    * @property {Tiny.Application} app - Local reference to game.
    */
    this.app = world.app;
    /**
    * @property {Tiny.Physics.P2} world - Local reference to P2 World.
    */
    this.world = world;
  }
}

export default DistanceConstraint;
